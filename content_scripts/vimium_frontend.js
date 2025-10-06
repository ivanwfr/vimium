/* ┌────────────────────────────────────────────────────────────────────────┐ */
/* │ vimium_frontend.js .............................. _TAG (250913:17h:35) │ */
/* └────────────────────────────────────────────────────────────────────────┘ */
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console, chrome */

/* globals DomUtils           */
/* globals FindModeHistory    */
/* globals HUD                */
/* globals HelpDialogPage     */
/* globals HintCoordinator    */
/* globals InsertMode         */
/* globals Marks              */
/* globals Mode               */
/* globals NormalMode         */
/* globals NormalModeCommands */
/* globals Scroller           */
/* globals Settings           */
/* globals UIComponent        */
/* globals Utils              */
/* globals forTrusted         */
/* globals handlerStack       */

/* globals dom_log            */ /* eslint-disable-line no-unused-vars */

/* eslint-disable arrow-body-style */
/* eslint-disable comma-dangle */
/* eslint-disable consistent-return */
/* eslint-disable no-alert */
/* eslint-disable no-new */
/* eslint-disable no-unused-vars */
/* eslint-disable no-warning-comments */

/* exported vimium_frontend */

/*}}}*/
//
// This content script must be run prior to domReady so that we perform some operations very early.
//
let vimium_frontend     = (function() {
"use strict";
//{{{
let isEnabledForUrl = true;
let      normalMode = null;

// This is set by initializeFrame. We can only get this frame's ID from the background page.
globalThis.frameId = null;

//}}}
/*➔ windowIsFocused {{{*/
// We track whther the current window has the focus or not.
let windowHasFocus  = null;

let windowIsFocused = function()
{
  return windowHasFocus;
};
/*}}}*/
/*_ initWindowIsFocused {{{*/
let initWindowIsFocused = function()
{
  DomUtils.documentReady().then(() => windowHasFocus = document.hasFocus());
  globalThis.addEventListener(
    "focus",
    forTrusted(function (event) {
      if (event.target === window) {
        windowHasFocus = true;
      }
      return true;
    }),
    true,
  );
  globalThis.addEventListener(
    "blur",
    forTrusted(function (event) {
      if (event.target === window) {
        windowHasFocus = false;
      }
      return true;
    }),
    true,
  );
};
/*}}}*/
/*_ isWindowFocusable {{{*/
// True if this window should be focusable by various Vim commands (e.g. "nextFrame").
let isWindowFocusable = function()
{
  // Avoid focusing tiny frames. See #1317.
  return !DomUtils.windowIsTooSmall() && (document.body?.tagName.toLowerCase() != "frameset");
};
/*}}}*/
/*_ GrabBackFocus ● class {{{*/
// If an input grabs the focus before the user has interacted with the page, then grab it back (if
// the grabBackFocus option is set).
class GrabBackFocus extends Mode {
  constructor() {
    super();
    let listener;
    const exitEventHandler = () => {
      return this.alwaysContinueBubbling(() => {
        this.exit();
        chrome.runtime.sendMessage({
          handler: "sendMessageToFrames",
          message: { handler: "userIsInteractingWithThePage" },
        });
      });
    };

    super.init({
      name: "grab-back-focus",
      keydown: exitEventHandler,
    });

    // True after we've grabbed back focus to the page and logged it via console.log , so web devs
    // using Vimium don't get confused.
    this.logged = false;

    this.push({
      _name: "grab-back-focus-mousedown",
      mousedown: exitEventHandler,
    });

    if (this.modeIsActive) {
      if (Settings.get("grabBackFocus")) {
        this.push({
          _name: "grab-back-focus-focus",
          focus: (event) => this.grabBackFocus(event.target),
        });
        // An input may already be focused. If so, grab back the focus.
        if (document.activeElement) {
          this.grabBackFocus(document.activeElement);
        }
      } else {
        this.exit();
      }
    }

    // This mode is active in all frames. A user might have begun interacting with one frame without
    // other frames detecting this. When one GrabBackFocus mode exits, we broadcast a message to
    // inform all GrabBackFocus modes that they should exit; see #2296.
    chrome.runtime.onMessage.addListener(
      listener = ({ name }) => {
        if (name === "userIsInteractingWithThePage") {
          chrome.runtime.onMessage.removeListener(listener);
          if (this.modeIsActive) {
            this.exit();
          }
        }
        // We will not be calling sendResponse.
        return false;
      },
    );
  }

  grabBackFocus(element) {
    if (!DomUtils.isFocusable(element)) {
      return this.continueBubbling;
    }

    if (!this.logged && (element !== document.body)) {
      this.logged = true;
      if (!globalThis.vimiumDomTestsAreRunning) {
        console.log("An auto-focusing action on this page was blocked by Vimium.");
      }
    }
    element.blur();
    return this.suppressEvent;
  }
}
/*}}}*/
/* ➔ handlerStack.push {{{*/
// @see lib/handler_stack.js
// Pages can load new content dynamically and change the displayed URL using history.pushState.
// Since this can often be indistinguishable from an actual new page load for the user, we should
// also re-start GrabBackFocus for these as well. This fixes issue #1622.
handlerStack.push({
  _name: "GrabBackFocus-pushState-monitor",
  click(event) {
    // If a focusable element is focused, the user must have clicked on it. Retain focus and bail.
    if (DomUtils.isFocusable(document.activeElement)) {
      return true;
    }

    let target = event.target;

    while (target) {
      // Often, a link which triggers a content load and url change with javascript will also have
      // the new url as it's href attribute.
      if (
        (target.tagName === "A") &&
        (target.origin === document.location.origin) &&
        // Clicking the link will change the url of this frame.
        ((target.pathName !== document.location.pathName) ||
          (target.search !== document.location.search)) &&
        (["", "_self"].includes(target.target) ||
          ((target.target === "_parent") && (globalThis.parent === window)) ||
          ((target.target === "_top") && (globalThis.top === window)))
      ) {
        return new GrabBackFocus();
      } else {
        target = target.parentElement;
      }
    }
    return true;
  },
});
/*}}}*/
/*➔ installModes {{{*/
let installModes = function()
{
  // Install the permanent modes. The permanently-installed insert mode tracks focus/blur events,
  // and activates/deactivates itself accordingly.
  normalMode = new NormalMode();
  normalMode.init();
  // Initialize components upon which normal mode depends.
  Scroller.init();
  FindModeHistory.init();
  new InsertMode({ permanent: true });
  if (isEnabledForUrl) {
    new GrabBackFocus();
  }
  // Return the normalMode object (for the tests).
  return normalMode;
};
/*}}}*/
/*_ previousUrl {{{*/
// document is null in our tests.
let previousUrl = globalThis.document?.location.href;
/*}}}*/
/*_ checkEnabledAfterURLChange {{{*/
// When we're informed by the background page that a URL in this tab has changed, we check if we
// have the correct enabled state (but only if this frame has the focus).
const checkEnabledAfterURLChange = forTrusted(function (_request) {
  // The background page can't tell if the URL has actually changed after a client-side
  // history.pushState call. To limit log spam, ignore spurious URL change events where the URL
  // didn't actually change.
  if (previousUrl == document.location.href) {
    return;
  } else {
    previousUrl = document.location.href;
  }
  // The URL changing feels like navigation to the user, so reset the scroller (see #3119).
  Scroller.reset();
  if (windowIsFocused()) {
    checkIfEnabledForUrl();
  }
});
/*}}}*/
/*_ extensionHasBeenUnloaded {{{*/
// If our extension gets uninstalled, reloaded, or updated, the content scripts for the old version
// become orphaned: they remain running but cannot communicate with the background page or invoke
// most extension APIs. There is no Chrome API to be notified of this event, so we test for it every
// time a keystroke is pressed before we act on that keystroke. https://stackoverflow.com/a/64407849
const extensionHasBeenUnloaded = () => chrome.runtime?.id == null;

/*}}}*/
/*_ installListener {{{*/
// Wrapper to install event listeners.  Syntactic sugar.
let installListener = function(element, event, callback)
{
  element.addEventListener(
    event,
    forTrusted(function () {
      if (extensionHasBeenUnloaded()) {
        console.log("Vimium extension has been unloaded. Unloading content script.");
        onUnload();
        return;
      }
      if (isEnabledForUrl) {
        return callback.apply(this, arguments); /* eslint-disable-line no-invalid-this */ /* eslint-disable-line prefer-rest-params */
      } else {
        return true;
      }
    }),
    true,
  );
};
/*}}}*/
/*_ installListeners {{{*/
// Installing or uninstalling listeners is error prone. Instead we elect to check isEnabledForUrl
// each time so we know whether the listener should run or not.
// Note: We install the listeners even if Vimium is disabled. See comment in commit
// 6446cf04c7b44c3d419dc450a73b60bcaf5cdf02.
const installListeners = Utils.makeIdempotent(function () {
  // Key event handlers fire on window before they do on document. Prefer window for key events so
  // the page can't set handlers to grab the keys before us.
  const events = ["keydown", "keypress", "keyup", "click", "focus", "blur", "mousedown", "scroll"];
  for (const type of events) {
    installListener(globalThis, type, (event) => handlerStack.bubbleEvent(type, event));
  }
  installListener(
    document,
    "DOMActivate",
    (event) => handlerStack.bubbleEvent("DOMActivate", event),
  );
});
/*}}}*/
/*_ onfocus {{{*/
// Whenever we get the focus, check if we should be enabled.
const onFocus = forTrusted(function (event) {
  if (event.target === window) {
    checkIfEnabledForUrl();
  }
});
/*}}}*/
/*_ addEventListener {{{*/
// We install these listeners directly (that is, we don't use installListener) because we still need
// to receive events when Vimium is not enabled.
globalThis.addEventListener("focus", onFocus, true);
globalThis.addEventListener("hashchange", checkEnabledAfterURLChange, true);
/*}}}*/
/*_ initializeOnDomReady {{{*/
let initializeOnDomReady = function()
{
  // Tell the background page we're in the domReady state.
  chrome.runtime.sendMessage({ handler: "domReady" });
};
/*}}}*/
/*_ onUnload {{{*/
const onUnload = Utils.makeIdempotent(() => {
  HintCoordinator.exit({ isSuccess: false });
  handlerStack.reset();
  isEnabledForUrl = false;
  globalThis.removeEventListener("focus", onFocus, true);
  globalThis.removeEventListener("hashchange", checkEnabledAfterURLChange, true);
});
/*}}}*/
/*_ setScrollPosition {{{*/
let setScrollPosition = function({ scrollX, scrollY })
{
  DomUtils.documentReady().then(() => {
    if (!DomUtils.isTopFrame()) return;
    Utils.nextTick(function () {
      globalThis.focus();
      document.body.focus();
      if ((scrollX > 0) || (scrollY > 0)) {
        Marks.setPreviousPosition();
        globalThis.scrollTo(scrollX, scrollY);
      }
    });
  });
};
/*}}}*/
/*_ flashFrame {{{*/
const flashFrame = (() => {
  let highlightedFrameElement = null;
  return () => {
    if (highlightedFrameElement == null) {
      highlightedFrameElement = DomUtils.createElement("div");

      // Create a shadow DOM wrapping the frame so the page's styles don't interfere with ours.
      const shadowDOM = highlightedFrameElement.attachShadow({ mode: "open" });

      // Inject stylesheet.
      const styleEl = DomUtils.createElement("style");
      const vimiumCssUrl = chrome.runtime.getURL("content_scripts/vimium.css");
      styleEl.textContent = `@import url("${vimiumCssUrl}");`;
      shadowDOM.appendChild(styleEl);

      const frameEl = DomUtils.createElement("div");
      frameEl.className = "vimium-reset vimium-highlighted-frame";
      shadowDOM.appendChild(frameEl);
    }

    document.documentElement.appendChild(highlightedFrameElement);
    Utils.setTimeout(200, () => highlightedFrameElement.remove());
  };
})();
/*}}}*/
/*➔ focusThisFrame {{{*/
//
// Called from the backend in order to change frame focus.
//
let focusThisFrame = function(request)
{
  // It should never be the case that we get a forceFocusThisFrame request on a window that isn't
  // focusable, because the background script checks that the window is focusable before sending the
  // focusFrame message.
  if (!request.forceFocusThisFrame && !isWindowFocusable()) return;

  Utils.nextTick(function () {
    globalThis.focus();
    // On Firefox, window.focus doesn't always draw focus back from a child frame (bug 554039). We
    // blur the active element if it is an iframe, which gives the window back focus as intended.
    if((    document.activeElement                                   )
        && (document.activeElement.tagName.toLowerCase() === "iframe")
      ) {
      document.activeElement.blur();
    }
    if (request.highlight) {
      flashFrame();
    }
  });
};
/*}}}*/
/*_ lastFocusedInput {{{*/
// Used by the focusInput command.
globalThis.lastFocusedInput = (function () {
  // Track the most recently focused input element.
  let recentlyFocusedElement = null;
  globalThis.addEventListener(
    "focus",
    forTrusted(function (event) {
      if (DomUtils.isEditable(event.target)) {
        recentlyFocusedElement = event.target;
      }
    }),
    true,
  );
  return () => recentlyFocusedElement;
})();
/*}}}*/
/*_ messageHandlers {{{*/
const messageHandlers = {
  getFocusStatus(_request, _sender) {
    return {
      focused: windowIsFocused(),
      focusable: isWindowFocusable(),
    };
  },
  focusFrame(request) {
    focusThisFrame(request);
  },
  getScrollPosition(_ignoredA, _ignoredB) {
    if (DomUtils.isTopFrame()) {
      return { scrollX: globalThis.scrollX, scrollY: globalThis.scrollY };
    }
  },
  setScrollPosition,
  checkEnabledAfterURLChange,
  runInTopFrame({ sourceFrameId, registryEntry }) {
    // TODO(philc): it seems to me that we should be able to get rid of this runInTopFrame
    // command, and instead use chrome.tabs.sendMessage with a frameId 0 from the background page.
    if (DomUtils.isTopFrame()) {
      return NormalModeCommands[registryEntry.command](sourceFrameId, registryEntry);
    }
  },
  linkHintsMessage(request, sender) {
    if (HintCoordinator.willHandleMessage(request.messageType)) {
      return HintCoordinator[request.messageType](request, sender);
    }
  },
  showMessage(request) {
//dom_log.log4("vimium_frontend.sendMessage():\n"+ request.message);
//console.dir( request );
//dom_log.log_caller();
    HUD.show(request.message, 2000);
  },
};
/*}}}*/
/*_ handleMessage {{{*/
let handleMessage = async function(request, sender)
{
  // Some requests are so frequent and noisy (like checkEnabledAfterURLChange on
  // docs.google.com) that we silence debug logging for just those requests so the rest remain
  // useful.
  if (!request.silenceLogging) {
    Utils.debugLog(
      "frontend.js: onMessage:%otype:%o",
      request.handler,
      request.messageType,
      // request // Often useful for debugging.
    );
  }
  request.isTrusted = true;
  // Some request are handled elsewhere in the code base; ignore them here.
  const shouldHandleMessage = request.handler !== "userIsInteractingWithThePage" &&
    (isEnabledForUrl ||
      ["checkEnabledAfterURLChange", "runInTopFrame"].includes(request.handler));
  if (shouldHandleMessage) {
    const result = await messageHandlers[request.handler](request, sender);
    return result;
  }
};
/*}}}*/
/*_ initializePreDomReady {{{*/
//
// Complete initialization work that should be done prior to DOMReady.
//
let initializePreDomReady = async function()
{
  // Run this as early as possible, so the page can't register any event handlers before us.
  installListeners();
  // NOTE(philc): I'm blocking further Vimium initialization on this, for simplicity. If necessary
  // we could allow other tasks to run concurrently.
  await checkIfEnabledForUrl();

  Utils.addChromeRuntimeOnMessageListener(
    Object.keys(messageHandlers),
    handleMessage,
  );
};
/*}}}*/
/*_ checkIfEnabledForUrl {{{*/
// Check if Vimium should be enabled or not based on the top frame's URL.
let checkIfEnabledForUrl = async function()
{
//dom_log.log_caller();
// ┌───────────────────────────────────────────────────────────────────────────┐
// │ IWE ● handling "Extension context invalidated" error                      │
// ├───────────────────────────────────────────────────────────────────────────┤
/*{{{*/
if( extensionHasBeenUnloaded() ) {
    console.log("%c handling 'Extension context invalidated' error"                 , "font-size: 200%; background-color: #808; border-radius: 1em; border: 1px solid white;");
    console.log("%c in content_scripts/vimium_frontend.js in checkIfEnabledForUrl()", "font-size: 200%; background-color: #808; border-radius: 1em; border: 1px solid white;");
    if( confirm("⚠ Extension has been updated ⚠\n\n➔ Page reload required") )
        document.location.reload();
    return;
}
/*}}}*/
// └───────────────────────────────────────────────────────────────────────────┘
  const promises = [];
  promises.push(chrome.runtime.sendMessage({ handler: "initializeFrame" }));
  if (!Settings.isLoaded()) {
    promises.push(Settings.onLoaded());
  }
  const [response, ...unused] = await Promise.all(promises);

  isEnabledForUrl = response.isEnabledForUrl;

  // This browser info is used by other content scripts, but can only be determinted by the
  // background page.
  Utils._isFirefox = response.isFirefox;
  Utils._firefoxVersion = response.firefoxVersion;
  Utils._browserInfoLoaded = true;
  // This is the first time we learn what this frame's ID is.
  globalThis.frameId = response.frameId;

  if (normalMode == null) installModes();
  normalMode.setPassKeys(response.passKeys);
  // Hide the HUD if we're not enabled.
  if (!isEnabledForUrl) HUD.hide(true, false);
};
/*}}}*/
/* ➔ HelpDialogPage {{{*/
// If this content script is running in the help dialog's iframe, then use the HelpDialogPage's
// methods to control the dialog. Otherwise, load the help dialog in a UIComponent iframe.
const HelpDialog = {
  helpUI: null,

  isShowing() {
    if (globalThis.isVimiumHelpDialogPage) return true;
    return this.helpUI && this.helpUI.showing;
  },

  abort() {
    if (globalThis.isVimiumHelpDialogPage) throw new Error("This should be impossible.");
    if (this.isShowing()) {
      return this.helpUI.hide(false);
    }
  },

  async toggle(request) {
    // If we're in the help dialog page already and the user has typed a key to show the help
    // dialog, then we should hide it.
    if (globalThis.isVimiumHelpDialogPage) return HelpDialogPage.hide();

    if (this.helpUI == null) {
      await DomUtils.documentComplete();
      this.helpUI = new UIComponent();
      this.helpUI.load("pages/help_dialog_page.html", "vimium-help-dialog-frame");
    }
    if (this.isShowing()) {
      this.helpUI.hide();
    } else {
      return this.helpUI.show(
        { name: "show" },
        { focus: true, sourceFrameId: request.sourceFrameId },
      );
    }
  },
};
/*}}}*/
/*_ testEnv {{{*/
const testEnv = globalThis.window == null;
if (!testEnv) {
  initWindowIsFocused();
  initializePreDomReady();
  DomUtils.documentReady().then(initializeOnDomReady);
}
/*}}}*/
//dom_log.log5("LOADED: vimium_frontend");

/*● Export ● globalThis {{{*/
Object.assign(globalThis, {
  HelpDialog,
  handlerStack,
  windowIsFocused,
  // These are exported for normal mode and link-hints mode.
  focusThisFrame,
  // Exported only for tests.
  installModes,
});
return {
  HelpDialog,
  handlerStack,
  windowIsFocused,
  // These are exported for normal mode and link-hints mode.
  focusThisFrame,
  // Exported only for tests.
  installModes,
};
/*}}}*/
}());

/*{{{
vim: sw=2
 }}}*/
