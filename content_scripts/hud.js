/* ┌────────────────────────────────────────────────────────────────────────┐ */
/* │ content_scripts/hud.js ● [is_showing] ........... _TAG (260102:21h:06) │ */
/* └────────────────────────────────────────────────────────────────────────┘ */
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console         */
/* globals chrome          */
/* globals dom_log         */
/* globals clearTimeout    */
/* globals   setTimeout    */
/* globals clearInterval   */
/* globals   setInterval   */

/* globals FindMode        */
/* globals Settings        */
/* globals UIComponent     */
/* globals DomUtils        */
/* globals Mode            */

/* exported vimium_hud     */
/* exported HUD            */

/*}}}*/
let vimium_hud = (function() { /* eslint-disable-line max-classes-per-file */
"use strict";
let log_this=false;
//
// A heads-up-display (HUD) for showing Vimium page operations.
// Note: you cannot interact with the HUD until document.body is available.
//
const HUD = {
/*{{{*/
  tween: null,
  hudUI: null,
  findMode: null,
  abandon() {
    if (this.hudUI) {
      this.hudUI.hide(false);
    }
  },

  // Set by @pasteFromClipboard to handle the value returned by pasteResponse
  pasteListener: null,

  // This HUD is styled to precisely mimick the chrome HUD on Mac. Use the
  // "has_popup_and_link_hud.html" test harness to tweak these styles to match Chrome's. One
  // limitation of our HUD display is that it doesn't sit on top of horizontal scrollbars like
  // Chrome's HUD does.

/*}}}*/
/* handleUIComponentMessage {{{*/
  handleUIComponentMessage({ data }) {
if(log_this) dom_log.log("%c HUD.handleUIComponentMessage %c"+JSON.stringify(data).replace(/[^\w\.:]/g," ")
                         ,dom_log.CS+HUD_PAGE_LFX
                         ,               dom_log.CS);
    const handlers = {
      hideFindMode: this.hideFindMode,
      search: this.search,
      unfocusIfFocused: this.unfocusIfFocused,
      pasteResponse: this.pasteResponse,
      showClipboardUnavailableMessage: this.showClipboardUnavailableMessage
    };
    const handler = handlers[data.name];
    if (handler) {
      return handler.bind(this)(data);
    }
    else {
      return null;
    }
  },

/*}}}*/
/* init {{{*/
  async init(focusable) {
    await Settings.onLoaded();
    if (focusable == null) {
      focusable = true;
    }
    if (this.hudUI == null) {
      const queryString = globalThis.vimiumDomTestsAreRunning ? "?dom_tests=true" : "";
      this.hudUI = new UIComponent();
      this.hudUI.load(
        `pages/hud_page.html${queryString}`,
        "vimium-hud-frame",
        this.handleUIComponentMessage.bind(this)
      );
    }
    // this[data.name]? data
    if (this.tween == null) {
      this.tween = new Tween(
        "iframe.vimium-hud-frame.vimium-ui-component-visible",
        this.hudUI.shadowDOM
      );
    }
    const classList = this.hudUI.iframeElement.classList;
    if (focusable) {
      classList.remove("vimium-non-clickable");
      classList.add("vimium-clickable");
      // Note(gdh1995): Chrome 74 only acknowledges text selection when a frame has been visible.
      // See more in #3277.
      // Note(mrmr1993): Show the HUD frame, so Firefox will actually perform the paste.
      this.hudUI.setIframeVisible(true);
      // Force the re-computation of styles, so Chrome sends a visibility change message to the
      // child frame. See https://github.com/philc/vimium/pull/3277#issuecomment-487363284
      getComputedStyle(this.hudUI.iframeElement).display; /* eslint-disable-line no-unused-expressions */
    } else {
      classList.remove("vimium-non-clickable");
      classList.add("vimium-clickable");
    }
  },

/*}}}*/
/* show {{{*/
  // duration - if omitted, the message will show until dismissed.
  async show(text, duration) {
    await DomUtils.documentComplete();
    clearTimeout(this._showForDurationTimerId);
                 this._showForDurationTimerId = null;   // is_showing
    // @hudUI.activate will take charge of making it visible
    await this.init(false);
    this.hudUI.show({ name: "show", text });
    this.tween.fade(1.0, 150);

    if (duration != null) {
      this._showForDurationTimerId = setTimeout(() => this.hide(), duration);
    }
  },

/*}}}*/
/* showFindMode {{{*/
  async showFindMode(findMode = null) {
    this.findMode = findMode;
    await DomUtils.documentComplete();
    await this.init();
    this.hudUI.show({ name: "showFindMode" });
    this.tween.fade(1.0, 150);
  },

/*}}}*/
/* search {{{*/
  search(data) {
if(log_this) dom_log.log("%c HUD.search %c"+JSON.stringify(data).replace(/[^\w\.:]/g," ")
                         ,dom_log.CS+HUD_PAGE_LFX
                         ,               dom_log.CS);
    // NOTE(mrmr1993): On Firefox, window.find moves the window focus away from the HUD. We use
    // postFindFocus to put it back, so the user can continue typing.
    this.findMode.findInPlace(data.query, {
      "postFindFocus": this.hudUI.iframeElement.contentWindow,
//    "historyIndex" : data.historyIndex
      ...data
    });

    this.show_matches();
  },

/*}}}*/
/* show_matches {{{*/
  show_matches() {
    // Show the number of matches in the HUD UI.
    if(!FindMode.query.rawQuery) return;
    const matchCount = FindMode.query.parsedQuery.length > 0 ? FindMode.query.matchCount : 0;
    const showMatchText = FindMode.query.rawQuery.length > 0;
    this.hudUI.postMessage({ name: "updateMatchesCount", matchCount, showMatchText });
  },

/*}}}*/
/* hide {{{*/
  // Hide the HUD.
  // If :immediate is falsy, then the HUD is faded out smoothly (otherwise it is hidden
  // immediately).
  // If :updateIndicator is truthy, then we also refresh the mode indicator. The only time we don't
  // update the mode indicator, is when hide() is called for the mode indicator itself.
  hide(immediate, updateIndicator) {
    if (immediate == null) {
      immediate = false;
    }
    if (updateIndicator == null) {
      updateIndicator = true;
    }
    if ((this.hudUI != null) && (this.tween != null)) {
      clearTimeout(this._showForDurationTimerId);
                   this._showForDurationTimerId = null; // is_showing
      this.tween.stop();
      if (immediate) {
        if (updateIndicator) {
          Mode.setIndicator();
        } else {
          this.hudUI.hide();
          if(HUD.fade_observer)
            HUD.fade_observer();
        }
      } else {
        this.tween.fade(0, 150, () => this.hide(true, updateIndicator));
      }
    }
  },

/*}}}*/
/* hideFindMode {{{*/
  // These parameters describe the reason find mode is exiting, and come from the HUD UI component.
  hideFindMode({ exitEventIsEnter, exitEventIsEscape }) {
//dom_log.logBIG("content_scripts/hud.js ● hideFindMode");

  if( document.activeElement ) {
    setTimeout(() => {
      // LOG CURRENTLY ACTIVE ELEMENT
/*{{{
      let label = document.activeElement.tagName+" ["+document.activeElement.className+"]";
      dom_log.log   ("%c ACTIVE ELEMENT %c"+ label
                     ,dom_log.lbL+dom_log.lfX[4]
                     ,dom_log.lbR+dom_log.lfX[4]);

}}}*/
      // BLUR
/*{{{
      dom_log.log   ("%c ACTIVE ELEMENT %c blur()"
                     ,dom_log.lbL+dom_log.lfX[8]
                     ,dom_log.lbR+dom_log.lfX[8]);
}}}*/
      document.activeElement.blur();
      // LOG RESULT
/*{{{
      if( document.activeElement ) {
        label     = document.activeElement.tagName+" ["+document.activeElement.className+"]";
        dom_log.log ("%c ACTIVE ELEMENT %c"+ label
                     ,dom_log.lbL+dom_log.lfX[3]
                     ,dom_log.lbR+dom_log.lfX[3]);
      }
}}}*/
    }, 500);
  }

    let postExit;
    this.findMode.checkReturnToViewPort();

    // An element won't receive a focus event if the search landed on it while we were in the HUD
    // iframe. To end up with the correct modes active, we create a focus/blur event manually after
    // refocusing this window.
    globalThis.focus();

    const focusNode = DomUtils.getSelectionFocusElement();
    if (document.activeElement != null) {
      document.activeElement.blur();
    }

    if (focusNode && focusNode.focus) {
      focusNode.focus();
    }

    if (exitEventIsEnter) {
      FindMode.handleEnter();
      if (FindMode.query.hasResults) {
        postExit = () => globalThis.newPostFindMode();
      }
    } else if (exitEventIsEscape) {
      // We don't want FindMode to handle the click events that FindMode.handleEscape can generate,
      // so we wait until the mode is closed before running it.
      postExit = FindMode.handleEscape;
    }

    this.findMode.exit();
    if (postExit) {
      postExit();
    }
  },

/*}}}*/
/* CLIPBOARD {{{*/
/* NOTE {{{*/
  // These commands manage copying and pasting from the clipboard in the HUD frame.
  // NOTE(mrmr1993): We need this to copy and paste on Firefox:
  // * an element can't be focused in the background page, so copying/pasting doesn't work
  // * we don't want to disrupt the focus in the page, in case the page is listening for focus/blur
  // * events.
  // * the HUD shouldn't be active for this frame while any of the copy/paste commands are running.
/*}}}*/
/* copyToClipboard {{{*/
  async copyToClipboard(text) {
    await DomUtils.documentComplete();
    await this.init();
    this.hudUI.postMessage({ name: "copyToClipboard", data: text });
  },

/*}}}*/
/* pasteFromClipboard {{{*/
  async pasteFromClipboard(pasteListener) {
    this.pasteListener = pasteListener;
    await DomUtils.documentComplete();
    await this.init();
    this.tween.fade(0, 0);
    this.hudUI.postMessage({ name: "pasteFromClipboard" });
  },

/*}}}*/
/* pasteResponse {{{*/
  pasteResponse({ data }) {
    // Hide the HUD frame again.
    this.hudUI.setIframeVisible(false);
    this.unfocusIfFocused();
    this.pasteListener(data);
  },

/*}}}*/
/* unfocusIfFocused {{{*/
  unfocusIfFocused() {
    // On Firefox, if an <iframe> disappears when it's focused, then it will keep "focused", which
    // means keyboard events will always be dispatched to the HUD iframe
    if (this.hudUI && this.hudUI.showing) {
      this.hudUI.iframeElement.blur();
      globalThis.focus();
    }
  },

/*}}}*/
/* showClipboardUnavailableMessage {{{*/
  // Navigator.clipboard is only available in secure contexts. Show a warning when clipboard actions
  // fail on non-HTTPS sites. See #4572.
  async showClipboardUnavailableMessage() {
    await DomUtils.documentComplete();
    await this.init();
    // Since the message is long and surprising, show it for longer to allow more time to reading.
    this.show("Clipboard actions available only on HTTPS sites", 4000);
  },
  getBoundingClientRect() {
    let     rect  = this.hudUI
      &&            this.hudUI.iframeElement
      &&            this.hudUI.iframeElement.getBoundingClientRect();
    return  rect;
  },
  is_showing() {
    let     rect  = this.getBoundingClientRect();
    return (rect != null) && (rect.width > 0);
  },
  fade_observer: null,
  add_fade_observer(callback) {
    this.fade_observer = callback;
  }
/*}}}*/
/*}}}*/
};

// ┌───────┐
// │ Tween │
// └───────┘
/*{{{*/
class Tween {
  constructor(cssSelector, insertionPoint) {
    this.opacity = 0;
    this.intervalId = -1;
    this.styleElement = null;
    this.cssSelector = cssSelector;
    if (insertionPoint == null) insertionPoint = document.documentElement;
    this.styleElement = DomUtils.createElement("style");

    if (!this.styleElement.style) {
      // We're in an XML document, so we shouldn't inject any elements. See the comment in
      // UIComponent.
      Tween.prototype.fade = Tween.prototype.stop = Tween.prototype.updateStyle = function () {}; /* eslint-disable-line no-multi-assign */
      return;
    }

    this.styleElement.type = "text/css";
    this.styleElement.innerHTML = "";
    insertionPoint.appendChild(this.styleElement);
  }

  fade(toAlpha, duration, onComplete) {
    clearInterval(this.intervalId);
                  this.intervalId = null;   // is_showing
    const startTime = (new Date()).getTime();
    const fromAlpha = this.opacity;
    const alphaStep = toAlpha - fromAlpha;

    const performStep = () => {
      const elapsed = (new Date()).getTime() - startTime;
      if (elapsed >= duration) {
        clearInterval(this.intervalId);
                      this.intervalId = null;   // is_showing
        this.updateStyle(toAlpha);
        if (onComplete) {
 //       if(HUD.fade_observer)
 //         HUD.fade_observer();
          onComplete();
        }
      } else {
        const value = ((elapsed / duration) * alphaStep) + fromAlpha;
        this.updateStyle(value);
      }
    };

    this.updateStyle(this.opacity);
    this.intervalId = setInterval(performStep, 50);
  }

  stop() {
    clearInterval(this.intervalId);
                  this.intervalId = null;   // is_showing
  }

  updateStyle(opacity) {
    let data_options = this.styleElement.getAttribute("data-options") || "";
    this.opacity     = opacity;
    this.styleElement.innerHTML
      = `\
         ${this.cssSelector} { opacity: ${this.opacity}; }\
         ${data_options}\
      `;
  }

  is_showing() {
    if(!this.styleElement.getAttribute("data-options"))
        this.styleElement.setAttribute( "data-options", " SPAN { border: 1px solid yellow; }");
    return !!this.intervalId;
  }
}

/*}}}*/

/* EXPORT {{{*/
globalThis.HUD = HUD;
let    HUD_PAGE_LFX;

/*● name ● logging {{{*/
const  name = "HUD"; HUD.name = name;

HUD.logging = function(state,onload)
{
  HUD_PAGE_LFX  = 2;
  let changed   = (state != undefined) && (log_this != state);
  if( changed   )  log_this  = state;
  if(!onload    )  dom_log.logging({ name, log_this, changed });
  return           log_this;
};
/*}}}*/
/*}}}*/
}());

/*{{{ ● FOCUS ● BLUR //FIXME
document.addEventListener("DOMContentLoaded", () => {
"use strict";
window.addEventListener("focus", (event) => dom_log.log("%c● FOCUS %c content_scripts/hud %c"+document.activeElement.tagName+" ["+document.activeElement.className+"]", dom_log.lbL+dom_log.lfX[4], dom_log.lbC+dom_log.lfX[4], dom_log.lbR+dom_log.lfX[4]));
window.addEventListener("blur" , (event) => dom_log.log("%c● BLUR  %c content_scripts/hud %c"+document.activeElement.tagName+" ["+document.activeElement.className+"]", dom_log.lbL+dom_log.lfX[8], dom_log.lbC+dom_log.lfX[8], dom_log.lbR+dom_log.lfX[8]));
});
}}}*/

/*{{{
vim: sw=2
 }}}*/
