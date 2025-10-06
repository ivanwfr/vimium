/* ┌────────────────────────────────────────────────────────────────────────┐ */
/* │ background_scripts/main.js ...................... _TAG (250923:02h:34) │ */
/* └────────────────────────────────────────────────────────────────────────┘ */
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console, chrome */ /* eslint-disable-line no-unused-vars */

/* globals BookmarkCompleter     */
/* globals Commands              */
/* globals DomainCompleter       */
/* globals HistoryCompleter      */
/* globals MultiCompleter        */
/* globals SearchEngineCompleter */
/* globals Settings              */
/* globals TabCompleter          */
/* globals TabOperations         */
/* globals UrlUtils              */
/* globals Utils                 */
/* globals bgUtils               */
/* globals dom_log               */
/* globals exclusions            */
/* globals fetch                 */
/* globals marks                 */
/* globals tabLoadedHandlers     */

/* eslint-disable comma-dangle */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-warning-comments */

/* exported vimium_frontend */

/*}}}*/
/* import {{{*/
import "../lib/utils.js";
import "../lib/settings.js";
import "../lib/url_utils.js";
import "../background_scripts/tab_recency.js";
import * as bgUtils from "../background_scripts/bg_utils.js";
import "../background_scripts/all_commands.js";
import { Commands } from "../background_scripts/commands.js";
import * as exclusions from "../background_scripts/exclusions.js";
import "../background_scripts/completion_engines.js";
import "../background_scripts/completion_search.js";
import "../background_scripts/completion.js";
import "../background_scripts/tab_operations.js";
import * as marks from "../background_scripts/marks.js";

import "../lib/dom_log.js";

import {
  BookmarkCompleter,
  DomainCompleter,
  HistoryCompleter,
  MultiCompleter,
  SearchEngineCompleter,
  TabCompleter
} from "./completion.js";

// NOTE(philc): This file has many superfluous return statements in its functions, as a result of
// converting from coffeescript to es6. Many can be removed, but I didn't take the time to
// diligently track down precisely which return statements could be removed when I was doing the
// conversion.

import * as TabOperations from "./tab_operations.js";
/*}}}*/

let background_main = (function() {
"use strict";
/*{{{*/

// Allow Vimium's content scripts to access chrome.storage.session. Otherwise,
// chrome.storage.session will be null in content scripts.
chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });

// This is exported for use by "marks.js".
globalThis.tabLoadedHandlers = {}; // tabId -> function()

// A Vimium secret, available only within the current browser session. The secret is a generated
// strong random string.
const randomArray = globalThis.crypto.getRandomValues(new Uint8Array(32)); // 32-byte random token.
const secretToken = randomArray.reduce((a, b) => a.toString(16) + b.toString(16));
chrome.storage.session.set({ vimiumSecret: secretToken });

const completionSources = {
  bookmarks: new BookmarkCompleter(),
  history: new HistoryCompleter(),
  domains: new DomainCompleter(),
  tabs: new TabCompleter(),
  searchEngines: new SearchEngineCompleter(),
};

const completers = {
  omni: new MultiCompleter([
    completionSources.bookmarks,
    completionSources.history,
    completionSources.domains,
    completionSources.tabs,
    completionSources.searchEngines,
  ]),
  bookmarks: new MultiCompleter([completionSources.bookmarks]),
  tabs: new MultiCompleter([completionSources.tabs]),
};

// A query dictionary for `chrome.tabs.query` that will return only the visible tabs.
const visibleTabsQueryArgs = { currentWindow: true };
if (bgUtils.isFirefox()) {
  // Only Firefox supports hidden tabs.
  visibleTabsQueryArgs.hidden = false;
}
/*}}}*/
/*_ onURLChange {{{*/
let onURLChange = function(details)
{
  // sendMessage will throw "Error: Could not establish connection. Receiving end does not exist."
  // if there is no Vimium content script loaded in the given tab. This can occur if the user
  // navigated to a page where Vimium doesn't have permissions, like chrome:// URLs. This error is
  // noisy and mysterious (it usually doesn't have a valid line number), so we silence it.
  const message = {
    handler: "checkEnabledAfterURLChange",
    silenceLogging: true,
  };
  chrome.tabs.sendMessage(details.tabId, message, { frameId: details.frameId })
    .catch(() => {});
};
/*}}}*/
/* onHistoryStateUpdated ● onReferenceFragmentUpdated ● storage.session {{{*/
// Re-check whether Vimium is enabled for a frame when the URL changes without a reload.
// There's no reliable way to detect when the URL has changed in the content script, so we
// have to use the webNavigation API in our background script.
chrome.webNavigation.onHistoryStateUpdated.addListener(onURLChange); // history.pushState.
chrome.webNavigation.onReferenceFragmentUpdated.addListener(onURLChange); // Hash changed.

if (!globalThis.isUnitTests) {
  // Cache "content_scripts/vimium.css" in chrome.storage.session for UI components.
  (function () {
    const url = chrome.runtime.getURL("content_scripts/vimium.css");
    fetch(url).then(async (response) => {
      if (response.ok) {
        chrome.storage.session.set({ vimiumCSSInChromeStorage: await response.text() });
      }
    });
  })();
}
/*}}}*/
/*_ muteTab {{{*/
let muteTab = function(tab)
{
  chrome.tabs.update(tab.id, { muted: !tab.mutedInfo.muted });
};
/*}}}*/
/*_ toggleMuteTab {{{*/
let toggleMuteTab = function(request, sender)
{
  const currentTab = request.tab;
  const tabId = request.tabId;
  const registryEntry = request.registryEntry;

  if ((registryEntry.options.all != null) || (registryEntry.options.other != null)) {
    // If there are any audible, unmuted tabs, then we mute them; otherwise we unmute any muted tabs.
    chrome.tabs.query({ audible: true }, function (tabs) {
      let tab;
      if (registryEntry.options.other != null) {
        tabs = tabs.filter((t) => t.id !== currentTab.id);
      }
      const audibleUnmutedTabs = tabs.filter((t) => t.audible && !t.mutedInfo.muted);
      if (audibleUnmutedTabs.length >= 0) {
        chrome.tabs.sendMessage(tabId, {
          frameId: sender.frameId,
          handler: "showMessage",
          message: `Muting ${audibleUnmutedTabs.length} tab(s).`,
        });
        for (tab of audibleUnmutedTabs) {
          muteTab(tab);
        }
      } else {
        chrome.tabs.sendMessage(tabId, {
          frameId: sender.frameId,
          handler: "showMessage",
          message: "Unmuting all muted tabs.",
        });
        for (tab of tabs) {
          if (tab.mutedInfo.muted) {
            muteTab(tab);
          }
        }
      }
    });
  } else {
    if (currentTab.mutedInfo.muted) {
      chrome.tabs.sendMessage(tabId, {
        frameId: sender.frameId,
        handler: "showMessage",
        message: "Unmuted tab.",
      });
    } else {
      chrome.tabs.sendMessage(tabId, {
        frameId: sender.frameId,
        handler: "showMessage",
        message: "Muted tab.",
      });
    }
    muteTab(currentTab);
  }
};
/*}}}*/
/*_ getTabIndex {{{*/
// Find a tab's actual index in a given tab array returned by chrome.tabs.query. In Firefox, there
// may be hidden tabs, so tab.tabIndex may not be the actual index into the array of visible tabs.
let getTabIndex = function(tab, tabs)
{
  // First check if the tab is where we expect it, to avoid searching the array.
  if (tabs.length > tab.index && tabs[tab.index].index === tab.index) {
    return tab.index;
  } else {
    return tabs.findIndex((t) => t.index === tab.index);
  }
};
/*}}}*/
/*_ selectSpecificTab {{{*/
//
// Selects the tab with the ID specified in request.id
//
let selectSpecificTab = async function(request)
{
  const tab = await chrome.tabs.get(request.id);
  // Focus the tab's window. TODO(philc): Why are we null-checking chrome.windows here?
  if (chrome.windows != null) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
  await chrome.tabs.update(request.id, { active: true });
};
/*}}}*/
/*_ moveTab {{{*/
let moveTab = function({ count, tab, registryEntry })
{
  if (registryEntry.command === "moveTabLeft") {
    count = -count;
  }
  return chrome.tabs.query(visibleTabsQueryArgs, function (tabs) {
    const pinnedCount = (tabs.filter((tab) => tab.pinned)).length; /* eslint-disable-line no-shadow */
    const minIndex = tab.pinned ? 0 : pinnedCount;
    const maxIndex = (tab.pinned ? pinnedCount : tabs.length) - 1;
    // The tabs array index of the new position.
    const moveIndex = Math.max(minIndex, Math.min(maxIndex, getTabIndex(tab, tabs) + count));
    return chrome.tabs.move(tab.id, {
      index: tabs[moveIndex].index,
    });
  });
};
/*}}}*/
/*_ createRepeatCommand {{{*/
let createRepeatCommand = function(command)
{
  return async function (request) {
    let i = request.count - 1;
    const r = Object.assign({}, request); /* eslint-disable-line prefer-object-spread */
    delete r.count;
    while (i >= 0) {
      i--;
      await command(r); /* eslint-disable-line no-await-in-loop */
    }
  };
};
/*}}}*/
/*_ nextZoomLevel {{{*/
let nextZoomLevel = function(currentZoom, steps)
{
  // Chrome's default zoom levels.
  const chromeLevels = [0.25, 0.33, 0.5, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
  // Firefox's default zoom levels.
  const firefoxLevels = [0.3, 0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.2, 1.33, 1.5, 1.7, 2, 2.4, 3, 4, 5];

  let zoomLevels = chromeLevels; // Chrome by default
  if (bgUtils.isFirefox()) {
    zoomLevels = firefoxLevels;
  }

  if (steps === 0) { // Nothing
    return currentZoom;
  } else if (steps > 0) { // In
    // Chrome sometimes returns values with floating point errors.
    // Example: Chrome gives 0.32999999999999996 instead of 0.33.
    currentZoom += 0.0000001; // This is needed to solve floating point bugs in Chrome.
    const nextIndex = zoomLevels.findIndex((level) => level > currentZoom);
    const floorIndex = nextIndex == -1 ? zoomLevels.length : nextIndex - 1;
    return zoomLevels[Math.min(zoomLevels.length - 1, floorIndex + steps)];
  } else if (steps < 0) { // Out
    currentZoom -= 0.0000001; // This is needed to solve floating point bugs in Chrome.
    let ceilIndex = zoomLevels.findIndex((level) => level >= currentZoom);
    ceilIndex = ceilIndex == -1 ? zoomLevels.length : ceilIndex;
    return zoomLevels[Math.max(0, ceilIndex + steps)];
  }
};
/*}}}*/

/*➔ BackgroundCommands {{{*/
// These are commands which are bound to keystrokes which must be handled by the background page.
// They are mapped in commands.js.
const BackgroundCommands = {
  /* createTab {{{*/
  // Create a new tab. Also, with:
  //     map X createTab http://www.bbc.com/news
  // create a new tab with the given URL.
  createTab: createRepeatCommand(async function (request) {
    if (request.urls == null) {
      if (request.url) {
        // If the request contains a URL, then use it.
        request.urls = [request.url];
      } else {
        // Otherwise, if we have a registryEntry containing URLs, then use them.
        const options = Object.keys(request.registryEntry.options);
        const promises = options.map((opt) => UrlUtils.isUrl(opt));
        const isUrl = await Promise.all(promises);
        const urlList = options.filter((_, i) => isUrl[i]);
        if (urlList.length > 0) {
          request.urls = urlList; /* eslint-disable-line require-atomic-updates */
        } else {
          // Otherwise, just create a new tab.
          let newTabUrl = Settings.get("newTabUrl");
          if (newTabUrl == "pages/blank.html") {
            // "pages/blank.html" does not work in incognito mode, so fall back to "chrome://newtab"
            // instead.
            newTabUrl = request.tab.incognito
              ? Settings.defaultOptions.newTabUrl
              : chrome.runtime.getURL(newTabUrl);
          }
          request.urls = [newTabUrl]; /* eslint-disable-line require-atomic-updates */
        }
      }
    }
    if (request.registryEntry.options.incognito || request.registryEntry.options.window) {
      // Firefox does not allow an incognito window to be created with the URL about:newtab. It
      // throws this error: "Illegal URL: about:newtab".
      const urls = request.urls.filter((u) => u != Settings.defaultOptions.newTabUrl);
      const windowConfig = {
        url: urls,
        incognito: request.registryEntry.options.incognito || false,
      };
      await chrome.windows.create(windowConfig);
    } else {
      const urls = request.urls.slice().reverse();
      if (request.position == null) {
        request.position = request.registryEntry.options.position;
      }
      while (urls.length > 0) {
        const url = urls.pop();
        const tab = await TabOperations.openUrlInNewTab(Object.assign(request, { url })); /* eslint-disable-line no-await-in-loop */
        // Ensure subsequent invocations of this command place the next tab directly after this one.
        Object.assign(request, { tab, position: "after", active: false });
      }
    }
  }),
/*}}}*/
/*{{{*/
  duplicateTab: createRepeatCommand(async (request) => {
    const tab = await chrome.tabs.duplicate(request.tabId);
    // Ensure subsequent invocations of this command place the next tab directly after this one.
    request.tabId = tab.id; /* eslint-disable-line require-atomic-updates */
  }),
/*}}}*/
/*{{{*/
  moveTabToNewWindow({ count, tab }) {
    // TODO(philc): Switch to the promise API of chrome.tabs.query.
    chrome.tabs.query(visibleTabsQueryArgs, function (tabs) {
      const activeTabIndex = getTabIndex(tab, tabs);
      const startTabIndex = Math.max(0, Math.min(activeTabIndex, tabs.length - count));
      [tab, ...tabs] = tabs.slice(startTabIndex, startTabIndex + count);
      chrome.windows.create({ tabId: tab.id, incognito: tab.incognito }, function (window) {
        chrome.tabs.move(tabs.map((t) => t.id), { windowId: window.id, index: -1 });
      });
    });
  },
/*}}}*/
/*{{{*/
  nextTab(request) {
    return selectTab("next", request);
  },
/*}}}*/
/*{{{*/
  previousTab(request) {
    return selectTab("previous", request);
  },
/*}}}*/
/*{{{*/
  firstTab(request) {
    return selectTab("first", request);
  },
/*}}}*/
/*{{{*/
  lastTab(request) {
    return selectTab("last", request);
  },
/*}}}*/
/*{{{*/
  async removeTab({ count, tab }) {
    await forCountTabs(count, tab, (tab) => { /* eslint-disable-line no-shadow */
      // In Firefox, Ctrl-W will not close a pinned tab, but on Chrome, it will. We try to be
      // consistent with each browser's UX for pinned tabs.
      if (tab.pinned && bgUtils.isFirefox()) return;
      chrome.tabs.remove(tab.id);
    });
  },
/*}}}*/
/*{{{*/
  restoreTab: createRepeatCommand(async (request) => {
    await chrome.sessions.restore(null);
  }),
/*}}}*/
/*{{{*/
  async togglePinTab({ count, tab }) {
    await forCountTabs(count, tab, (tab) => { /* eslint-disable-line no-shadow */
      chrome.tabs.update(tab.id, { pinned: !tab.pinned });
    });
  },
/*}}}*/
/*{{{*/
  toggleMuteTab,

/*}}}*/
/*{{{*/
  moveTabLeft: moveTab,

/*}}}*/
/*{{{*/
  moveTabRight: moveTab,

/*}}}*/
/*{{{*/
  async setZoom({ tabId, registryEntry }) { /* eslint-disable-line require-await */
    const level = registryEntry.options?.["level"] ?? "1"; /* eslint-disable-line dot-notation */
    const newZoom = parseFloat(level);
    if (!isNaN(newZoom)) {
      chrome.tabs.setZoom(tabId, newZoom);
    }
  },

/*}}}*/
/*{{{*/
  async zoomIn({ count, tabId }) {
    const currentZoom = await chrome.tabs.getZoom(tabId);
    const newZoom = nextZoomLevel(currentZoom, count);
    chrome.tabs.setZoom(tabId, newZoom);
  },

/*}}}*/
/*{{{*/
  async zoomOut({ count, tabId }) {
    const currentZoom = await chrome.tabs.getZoom(tabId);
    const newZoom = nextZoomLevel(currentZoom, -count);
    chrome.tabs.setZoom(tabId, newZoom);
  },

/*}}}*/
/*{{{*/
  async zoomReset({ tabId }) { /* eslint-disable-line require-await */
    chrome.tabs.setZoom(tabId, 0); // setZoom of 0 sets to the tab default.
  },

/*}}}*/
/*{{{*/
  async nextFrame({ count, tabId }) {
    // We're assuming that these frames are returned in the order that they appear on the page. This
    // seems to be the case empirically. If it's ever needed, we could also sort by frameId.
    let frameIds = await getFrameIdsForTab(tabId);
    const promises = frameIds.map(async (frameId) => {
      // It is possible that this sendMessage call fails, if a frame gets unloaded while the request
      // is in flight.
      let isError = false;
      const status = await (chrome.tabs.sendMessage(tabId, { handler: "getFocusStatus" }, {
        frameId: frameId, /* eslint-disable-line object-shorthand */
      }).catch((_) => {
        isError = true;
      }));
      return { frameId, status, isError };
    });

    const frameResponses = (await Promise.all(promises)).filter((r) => !r.isError);

    const focusedFrameId = frameResponses.find(({ status }) => status.focused)?.frameId;
    // It's theoretically possible that focusedFrameId is null if the user switched tabs or away
    // from the browser while the request is in flight.
    if (focusedFrameId == null) return;

    // Prune any frames which gave an error response (i.e. they disappeared).
    frameIds = frameResponses.filter((r) => r.status.focusable).map((r) => r.frameId);

    const index = frameIds.indexOf(focusedFrameId);
    count = count ?? 1;
    const nextIndex = (index + count) % frameIds.length;
    if (index == nextIndex) return;
    await chrome.tabs.sendMessage(tabId, { handler: "focusFrame", highlight: true }, {
      frameId: frameIds[nextIndex],
    });
  },

/*}}}*/
/*{{{*/
  async closeTabsOnLeft(request) {
    await removeTabsRelative("before", request);
  },

/*}}}*/
/*{{{*/
  async closeTabsOnRight(request) {
    await removeTabsRelative("after", request);
  },

/*}}}*/
/*{{{*/
  async closeOtherTabs(request) {
    await removeTabsRelative("both", request);
  },

/*}}}*/
/*{{{*/
  async visitPreviousTab({ count, tab }) {
    await bgUtils.tabRecency.init();
    let tabIds = bgUtils.tabRecency.getTabsByRecency();
    tabIds = tabIds.filter((tabId) => tabId !== tab.id);
    if (tabIds.length > 0) {
      const id = tabIds[(count - 1) % tabIds.length];
      selectSpecificTab({ id });
    }
  },

/*}}}*/
/*{{{*/
  async reload({ count, tab, registryEntry }) {
    const bypassCache = registryEntry.options.hard != null ? registryEntry.options.hard : false;
    await forCountTabs(count, tab, (tab) => { /* eslint-disable-line no-shadow */
      chrome.tabs.reload(tab.id, { bypassCache });
    });
  },

/*}}}*/
};
/*}}}*/

/*_ forCountTabs {{{*/
let forCountTabs = async function(count, currentTab, callback)
{
  const tabs = await chrome.tabs.query(visibleTabsQueryArgs);
  const activeTabIndex = getTabIndex(currentTab, tabs);
  const startTabIndex = Math.max(0, Math.min(activeTabIndex, tabs.length - count));
  for (const tab of tabs.slice(startTabIndex, startTabIndex + count)) {
    callback(tab); /* eslint-disable-line callback-return */
  }
};
/*}}}*/
/*_ removeTabsRelative {{{*/
// Remove tabs before, after, or either side of the currently active tab
let removeTabsRelative = async function(direction, { count, tab })
{
  // count is null if the user didn't type a count prefix before issuing this command and didn't
  // specify a count=n option in their keymapping settings. Interpret this as closing all tabs on
  // either side.
  if (count == null) count = 99999;
  const activeTab = tab;
  const tabs = await chrome.tabs.query(visibleTabsQueryArgs);
  const activeIndex = getTabIndex(activeTab, tabs);
  const toRemove = tabs.filter((tab, tabIndex) => { /* eslint-disable-line no-shadow */
    if (tab.pinned || tab.id == activeTab.id) {
      return false;
    }
    switch (direction) {
      case "before":
        return tabIndex < activeIndex &&
          tabIndex >= activeIndex - count;
      case "after":
        return tabIndex > activeIndex &&
          tabIndex <= activeIndex + count;
      case "both":
        return true;
    }
  });

  await chrome.tabs.remove(toRemove.map((t) => t.id));
};
/*}}}*/
/*_ selectTab {{{*/
// Selects a tab before or after the currently selected tab.
// - direction: "next", "previous", "first" or "last".
let selectTab = function(direction, { count, tab })
{
  chrome.tabs.query(visibleTabsQueryArgs, function(tabs) {
    if (tabs.length < 1) return;
    /* filter out chrome system tabs (those where the extension is not allowed) {{{*/
    let filtered_tabs = [];
    for(let i=0; i<tabs.length; ++i) {
      if( !tabs[i].url.startsWith("chrome://") )
        filtered_tabs.push( tabs[i] );
    }
    /*}}}*/
    /* Next-Previous tab {{{*/
    if(filtered_tabs.length > 1) {
      const toSelect = (() => {
        /* filtered tabs idx {{{*/
        let current_idx = getTabIndex(tab, filtered_tabs);
        let idx;
        switch( direction ) {
        case "next":
        idx =  (current_idx + count) % filtered_tabs.length;
        break;

        case "previous":
        idx = ((current_idx - count) + (count * filtered_tabs.length)) % filtered_tabs.length;
        break;

        case "first":
        idx = Math.min(filtered_tabs.length - 1, count - 1);
        break;

        case "last":
        idx = Math.max(0, filtered_tabs.length - count);
        break;
        }
        /*}}}*/
        /* no wrap {{{*/
        if((direction == "next"    ) && (idx < current_idx)) idx = current_idx;
        if((direction == "previous") && (idx > current_idx)) idx = current_idx;
        /*}}}*/
        /* unfiltered tabs idx {{{*/
        let tabs_idx;
        for(tabs_idx=0; tabs_idx<tabs.length; ++tabs_idx) {
          if( tabs[tabs_idx].url == filtered_tabs[idx].url)
            break;
        }
        let unchanged = (idx == current_idx);
/* log {{{*/
let log = (direction == "first"   ) ? dom_log.log1
  :       (direction == "previous") ? dom_log.log3
  :       (direction == "next"    ) ? dom_log.log4
  :       (direction == "last"    ) ? dom_log.log5
  :                                   dom_log.log2;

//dom_log.log ("selectTab("+ direction+", "+count +")");
//dom_log.log5("........from #"  + current_idx        );
//dom_log.log5("...unchanged "   + unchanged          );
//dom_log.log ("..........to %c#"+      tabs_idx +" "+ direction, dom_log.lfX[unchanged ? 2 : 5]);
//dom_log.log ("...........● "   + tabs[tabs_idx].url );
//dom_log.log (".....tab.id  "   + tab.id             );
//dom_log.log (".....tab.url "   + tab.url            );

/*}}}*/
        /*}}}*/
        /* Current tab unchanged {{{*/
        if( unchanged ) {
//dom_log.log_caller();
          let message = (direction == "next"    ) ? "🔴 \u25B6 No "+direction+" tab"
            :             (direction == "previous") ? "🔴 \u25C0 No "+direction+" tab"
            :                                                   "No "+direction+" tab";

          chrome.tabs.sendMessage(tab.id, { handler: "showMessage" , message });
        }
        /*}}}*/
        return  tabs_idx;
      })();
      chrome.tabs.update(tabs[toSelect].id, { active: true });
    }
    /*}}}*/
  });
};
/*}}}*/
/*_ swallowError {{{*/
let swallowError = function(ex,caller="")
{
//  console.log("dev/background_scripts/main.js.swallowError:")
//  console.log(  "%c"+caller+"%c"+ex
//              , "background-color: #000; border: 1px solid green; border-radius:1em; padding: 0 0.5em;"
//              ,             "background-color: #800; border: 1px solid white; border-radius:1em; padding: 0 0.5em;"
//             );
//  dom_log.log_caller();
};
/*}}}*/
/*_ onCommitted {{{*/
chrome.webNavigation.onCommitted.addListener(async ({ tabId, frameId }) => {
  // Vimium can't run on all tabs (e.g. chrome:// URLs). insertCSS will throw an error on such tabs,
  // which is expected, and noise. Swallow that error.
//const swallowError = () => {}; /* ivanwfr 250903 */
  await Settings.onLoaded();
  await chrome.scripting.insertCSS({
    css: Settings.get("userDefinedLinkHintCss"),
    target: {
      tabId: tabId, /* eslint-disable-line object-shorthand */
      frameIds: [frameId],
    },
  }).catch((ex) => swallowError(ex, "onCommitted"));
});

/*}}}*/
/*_ getFrameIdsForTab {{{*/
// Returns all frame IDs for the given tab. Note that in Chrome, this will omit frame IDs for frames
// or iFrames which contain chrome-extension:// URLs, even if those pages are listed in Vimium's
// web_accessible_resources in manifest.json.
let getFrameIdsForTab = async function(tabId)
{
  // getAllFrames unfortunately excludes frames and iframes from chrome-extension:// URLs.
  // In Firefox, by contrast, pages with moz-extension:// URLs are included.
  const frames = await chrome.webNavigation.getAllFrames({ tabId: tabId }); /* eslint-disable-line object-shorthand */
  return frames.map((f) => f.frameId);
};
/*}}}*/

/*➔ HintCoordinator {{{*/
const HintCoordinator = {
/*_ broadcastLinkHintsMessage {{{*/
  // Forward the message in "request" to all frames the in sender's tab.
  broadcastLinkHintsMessage(request, sender) {
    chrome.tabs.sendMessage(
      sender.tab.id,
      Object.assign(request, { handler: "linkHintsMessage" }),
    );
  },

/*}}}*/
  /*_ prepareToActivateLinkHintsMode {{{*/
  // This is sent by the content script once the user issues the link hints command.
  async prepareToActivateLinkHintsMode(
    tabId,
    originatingFrameId,
    { modeIndex, requestedByHelpDialog, isExtensionPage },
  ) {
    /* getFrameIdsForTab {{{*/
    const frameIds = await getFrameIdsForTab(tabId);
    // If link hints was triggered on a Vimium extension page (like the vimium help dialog or
    // options page), we cannot directly retrieve the frameIds for those pages using the
    // getFrameIdsForTab. However, as a workaround, if those pages were the pages activating hints,
    // their frameId is equal to originatingFrameId.
    if (isExtensionPage && !frameIds.includes(originatingFrameId)) {
      frameIds.push(originatingFrameId);
    }
    const timeout = 3000;
    let promises = frameIds.map(async (frameId) => {
      let promise = chrome.tabs.sendMessage(
        tabId,
        {
          handler: "linkHintsMessage",
          messageType: "getHintDescriptors",
          modeIndex,
          requestedByHelpDialog,
        },
        { frameId },
      );

      promise = Utils.promiseWithTimeout(promise, timeout)
        .catch((error) => Utils.debugLog("Swallowed getHintDescriptors error:", error));

      const descriptors = await promise;

      return {
        frameId,
        descriptors,
      };
    });

    /*}}}*/
    /* responses {{{*/

    const responses = (await Promise.all(promises))
      .filter((r) => r.descriptors != null);

    const frameIdToDescriptors = {};
    for (const { frameId, descriptors } of responses) {
      frameIdToDescriptors[frameId] = descriptors;
    }

    promises = responses.map(({ frameId }) => {
      // Don't send this frame's own link hints back to it -- they're already stored in that frame's
      // content script. At the time that we wrote this, this resulted in a 150% speedup for link
      // busy sites like Reddit.
      const outgoingFrameIdToHintDescriptors = Object.assign({}, frameIdToDescriptors); /* eslint-disable-line prefer-object-spread */
      delete outgoingFrameIdToHintDescriptors[frameId];
      return chrome.tabs.sendMessage(
        tabId,
        {
          handler: "linkHintsMessage",
          messageType: "activateMode",
          frameId: frameId, /* eslint-disable-line object-shorthand */
          originatingFrameId: originatingFrameId, /* eslint-disable-line object-shorthand */
          frameIdToHintDescriptors: outgoingFrameIdToHintDescriptors,
          modeIndex: modeIndex, /* eslint-disable-line object-shorthand */
        },
        { frameId },
      ).catch((error) => {
        Utils.debugLog(
          "Swallowed linkHints activateMode error:",
          error,
          "tabId",
          tabId,
          "frameId",
          frameId,
        );
      });
    });
    await Promise.all(promises);

    /*}}}*/
  },
/*}}}*/
};

/*}}}*/
/*_ sendRequestHandlers {{{*/
const sendRequestHandlers = {
  runBackgroundCommand(request, sender) {
    return BackgroundCommands[request.registryEntry.command](request, sender);
  },
  // getCurrentTabUrl is used by the content scripts to get their full URL, because window.location
  // cannot help with Chrome-specific URLs like "view-source:http:..".
  getCurrentTabUrl({ tab }) {
    return tab.url;
  },
  openUrlInNewTab: createRepeatCommand(async (request, callback) => {
    await TabOperations.openUrlInNewTab(request, callback);
  }),
  async openUrlInNewWindow(request) {
    await TabOperations.openUrlInNewWindow(request);
  },
  async openUrlInIncognito(request) {
    await chrome.windows.create({
      incognito: true,
      url: await UrlUtils.convertToUrl(request.url),
    });
  },
  openUrlInCurrentTab: TabOperations.openUrlInCurrentTab,
  openOptionsPageInNewTab(request) {
    return chrome.tabs.create({
      url: chrome.runtime.getURL("pages/options.html"),
      index: request.tab.index + 1,
    });
  },

  launchSearchQuery({ query, openInNewTab }) {
    const disposition = openInNewTab ? "NEW_TAB" : "CURRENT_TAB";
    chrome.search.query({ disposition, text: query });
  },

  domReady(_, sender) {
    const isTopFrame = sender.frameId == 0;
    if (!isTopFrame) return;
    const tabId = sender.tab.id;
    // The only feature that uses tabLoadedHandlers is marks.
    if (tabLoadedHandlers[tabId]) tabLoadedHandlers[tabId]();
    delete tabLoadedHandlers[tabId];
  },

  nextFrame: BackgroundCommands.nextFrame,
  selectSpecificTab,
  createMark: marks.create,
  gotoMark: marks.goto,
  // Send a message to all frames in the current tab. If request.frameId is provided, then send
  // messages to only the frame with that ID.
  sendMessageToFrames(request, sender) {
    const newRequest = Object.assign({}, request.message); /* eslint-disable-line prefer-object-spread */
    const options = request.frameId != null ? { frameId: request.frameId } : {};
    chrome.tabs.sendMessage(sender.tab.id, newRequest, options);
  },
  broadcastLinkHintsMessage(request, sender) {
    HintCoordinator.broadcastLinkHintsMessage(request, sender);
  },
  prepareToActivateLinkHintsMode(request, sender) {
    HintCoordinator.prepareToActivateLinkHintsMode(sender.tab.id, sender.frameId, request);
  },

  async initializeFrame(request, sender) {
    // Check whether the extension is enabled for the top frame's URL, rather than the URL of the
    // specific frame that sent this request.
    const enabledState = exclusions.isEnabledForUrl(sender.tab.url);

    const isTopFrame = sender.frameId == 0;
    if (isTopFrame) {
      let whichIcon;
      if (!enabledState.isEnabledForUrl) {
        whichIcon = "disabled";
      } else if (enabledState.passKeys.length > 0) {
        whichIcon = "partial";
      } else {
        whichIcon = "enabled";
      }

      let iconSet = {
        "enabled": {
          "16": "../icons/action_enabled_16.png",
          "32": "../icons/action_enabled_32.png",
        },
        "partial": {
          "16": "../icons/action_partial_16.png",
          "32": "../icons/action_partial_32.png",
        },
        "disabled": {
          "16": "../icons/action_disabled_16.png",
          "32": "../icons/action_disabled_32.png",
        },
      };

      if (bgUtils.isFirefox()) {
        // Only Firefox supports SVG icons.
        iconSet = {
          "enabled": "../icons/action_enabled.svg",
          "partial": "../icons/action_partial.svg",
          "disabled": "../icons/action_disabled.svg",
        };
      }

      chrome.action.setIcon({ path: iconSet[whichIcon], tabId: sender.tab.id });
    }

    const response = Object.assign({ /* eslint-disable-line prefer-object-spread */
      isFirefox: bgUtils.isFirefox(),
      firefoxVersion: await bgUtils.getFirefoxVersion(),
      frameId: sender.frameId,
    }, enabledState);

    return response;
  },

  async getBrowserInfo() {
    return {
      isFirefox: bgUtils.isFirefox(),
      firefoxVersion: await bgUtils.getFirefoxVersion(),
    };
  },

  async filterCompletions(request) {
    const completer = completers[request.completerName];
    let response = await completer.filter(request);

    // NOTE(smblott): response contains `relevancyFunction` (function) properties which cause
    // postMessage, below, to fail in Firefox. See #2576. We cannot simply delete these methods,
    // as they're needed elsewhere. Converting the response to JSON and back is a quick and easy
    // way to sanitize the object.
    response = JSON.parse(JSON.stringify(response));

    return response;
  },

  refreshCompletions(request) {
    const completer = completers[request.completerName];
    completer.refresh();
  },

  cancelCompletions(request) {
    const completer = completers[request.completerName];
    completer.cancel();
  },
};

/*}}}*/
/*_ addChromeRuntimeOnMessageListener {{{*/
Utils.addChromeRuntimeOnMessageListener(
  Object.keys(sendRequestHandlers),
  async function (request, sender) {
    Utils.debugLog(
      "main.js: onMessage:%ourl:%otab:%oframe:%o",
      request.handler,
      sender.url.replace(/https?:\/\//, ""),
      sender.tab?.id,
      sender.frameId,
      // request // Often useful for debugging.
    );
    // NOTE(philc): We expect all messages to come from a content script in a tab. I've observed in
    // Firefox when the extension is first installed, domReady and initializeFrame messages come from
    // content scripts in about:blank URLs, which have a null sender.tab. I don't know what this
    // corresponds to. Since we expect a valid sender.tab, ignore those messages.
    if (sender.tab == null) return;
    await Settings.onLoaded();
    request = Object.assign({ count: 1 }, request, { /* eslint-disable-line prefer-object-spread */
      tab: sender.tab,
      tabId: sender.tab.id,
    });
    const handler = sendRequestHandlers[request.handler];
    const result = handler ? await handler(request, sender) : null;
    return result;
  },
);

/*}}}*/
/*_ onRemoved {{{*/
// Remove chrome.storage.local/findModeRawQueryListIncognito if there are no remaining
// incognito-mode windows. Since the common case is that there are none to begin with, we first
// check whether the key is set at all.
chrome.tabs.onRemoved.addListener(function (tabId) {
  if (tabLoadedHandlers[tabId]) {
    delete tabLoadedHandlers[tabId];
  }
  chrome.storage.session.get("findModeRawQueryListIncognito", function (items) {
    if (items.findModeRawQueryListIncognito) {
      return chrome.windows != null
        ? chrome.windows.getAll(null, function (windows) {
          for (const window of windows) {
            if (window.incognito) return;
          }
          // There are no remaining incognito-mode tabs, and findModeRawQueryListIncognito is set.
          return chrome.storage.session.remove("findModeRawQueryListIncognito");
        })
        : undefined;
    }
  });
});

/*}}}*/

/*➔ runTests {{{*/
// Convenience function for development use.
globalThis.runTests = () => open(chrome.runtime.getURL("tests/dom_tests/dom_tests.html"));

/*}}}*/

/* ┌────────────────────────────────────────────────────────────────────────┐ */
/* │ Begin initialization                                                   │ */
/* └────────────────────────────────────────────────────────────────────────┘ */
/*_ majorVersionHasIncreased {{{*/
// True if the major version of Vimium has changed.
// - previousVersion: this will be null for new installs.
let majorVersionHasIncreased = function(previousVersion)
{
  const currentVersion = Utils.getCurrentVersion();
  if (previousVersion == null) return false;
  const currentMajorVersion = currentVersion.split(".").slice(0, 2).join("."); /* eslint-disable-line newline-per-chained-call */
  const previousMajorVersion = previousVersion.split(".").slice(0, 2).join("."); /* eslint-disable-line newline-per-chained-call */
  return Utils.compareVersions(currentMajorVersion, previousMajorVersion) == 1;
};
/*}}}*/
/*_ showUpgradeMessageIfNecessary {{{*/
// Show notification on upgrade.
let showUpgradeMessageIfNecessary = async function(onInstalledDetails)
{
  const currentVersion = Utils.getCurrentVersion();
  // We do not show an upgrade message for patch/silent releases. Such releases have the same
  // major and minor version numbers.
  if (
    !majorVersionHasIncreased(onInstalledDetails.previousVersion) ||
    Settings.get("hideUpdateNotifications")
  ) {
    return;
  }

  // NOTE(philc): These notifications use the system notification UI. So, if you don't have
  // notifications enabled from your browser (e.g. in Notification Settings in OSX), then
  // chrome.notification.create will succeed, but you won't see it.
  const notificationId = "VimiumUpgradeNotification";
  await chrome.notifications.create(
    notificationId,
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "Vimium Upgrade",
      message:
        `Vimium has been upgraded to version ${currentVersion}. Click here for more information.`,
      isClickable: true,
    },
  );
  if (!chrome.runtime.lastError) {
    chrome.notifications.onClicked.addListener(async function (id) {
      if (id != notificationId) return;
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      TabOperations.openUrlInNewTab({
        tab,
        tabId: tab.id,
        url: "https://github.com/philc/vimium/blob/master/CHANGELOG.md",
      });
    });
  }
};
/*}}}*/
/*_ injectContentScriptsAndCSSIntoExistingTabs {{{*/
let injectContentScriptsAndCSSIntoExistingTabs = async function()
{
  const manifest = chrome.runtime.getManifest();
  const contentScriptConfig = manifest.content_scripts[0];
  const contentScripts = contentScriptConfig.js;
  const cssFiles = contentScriptConfig.css;

  // The scripting.executeScript and scripting.insertCSS APIs can fail if we don't have permissions
  // to run scripts in a given tab. Examples are: chrome:// URLs, file:// pages (if the user hasn't
  // granted Vimium access to file URLs), and probably incognito tabs (unconfirmed). Calling these
  // APIs on such tabs results in an error getting logged on the background page. To avoid this
  // noise, we swallow the failures. We could instead try to determine if the tab is scriptable by
  // checking its URL scheme before calling these APIs, but that approach has some nuance to it.
  // This is simpler.
//const swallowError = (_) => {};

  const tabs = await chrome.tabs.query({ status: "complete" });
  for (const tab of tabs) {
    const target = { tabId: tab.id, allFrames: true };

    // Inject all of our content javascripts.
    chrome.scripting.executeScript({
      files: contentScripts,
      target: target, /* eslint-disable-line object-shorthand */
    }).catch((ex) => swallowError(ex, "INJECT contentScripts"));

    // Inject our extension's CSS.
    chrome.scripting.insertCSS({
      files: cssFiles,
      target: target, /* eslint-disable-line object-shorthand */
    }).catch((ex) => swallowError(ex, "INJECT cssFiles"));

    // Inject the user's link hint CSS.
    chrome.scripting.insertCSS({
      css: Settings.get("userDefinedLinkHintCss"),
      target: target, /* eslint-disable-line object-shorthand */
    }).catch((ex) => swallowError(ex, "INJECT userDefinedLinkHintCss"));
  }
};
/*}}}*/
/*_ initializeExtension {{{*/
let initializeExtension = async function()
{
  await Settings.onLoaded();
  await Commands.init();
};
/*}}}*/
/*_ onInstalled {{{*/
// The browser may have tabs already open. We inject the content scripts and Vimium's CSS
// immediately so that the extension is running on the pages immediately after install, rather than
// having to reload those pages.
chrome.runtime.onInstalled.addListener(async (details) => {
  Utils.debugLog("chrome.runtime.onInstalled");

  // NOTE(philc): In my testing, when the onInstalled event occurs, the onStartup event does not
  // also occur, so we need to initialize Vimium here.
  await initializeExtension();

  const shouldInjectContentScripts =
    // NOTE(philc): 2023-06-16: we do not install the content scripts in all tabs on Firefox.
    // I believe this is because Firefox does this already. See https://stackoverflow.com/a/37132144
    // for commentary.
    !bgUtils.isFirefox() &&
    (["chrome_update", "shared_module_update"].includes(details.reason));
  if (shouldInjectContentScripts) injectContentScriptsAndCSSIntoExistingTabs();

  await showUpgradeMessageIfNecessary(details);
});

/*}}}*/
/*_ onStartup {{{*/
// Note that this event is not fired when an incognito profile is started.
chrome.runtime.onStartup.addListener(async () => {
  Utils.debugLog("chrome.runtime.onStartup");
  await initializeExtension();
});

/*}}}*/

/* ● globalThis ● Export {{{*/
Object.assign(globalThis, {
  TabOperations,
  // Exported for tests:
  HintCoordinator,
  BackgroundCommands,
  majorVersionHasIncreased,
  nextZoomLevel,
});
return { TabOperations
    // Exported for tests:
    ,    HintCoordinator
    ,    BackgroundCommands
    ,    majorVersionHasIncreased
    ,    nextZoomLevel

    ,    initializeExtension
};
/*}}}*/
}());

// The chrome.runtime.onStartup and onInstalled events are not fired when disabling and then
// re-enabling the extension in developer mode, so we also initialize the extension here.
dom_log.log1("background_main.initializeExtension");
background_main.initializeExtension();

/*{{{
vim: sw=2
 }}}*/
