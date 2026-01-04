// ┌───────────────────────────────────────────────────────────────────────────┐
// │ pages/hud_page.js .................................. _TAG (260101:18h:54) ●
// └───────────────────────────────────────────────────────────────────────────┘
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console              */
/* globals chrome               */
/* globals setTimeout           */
/* globals clearTimeout         */

/* globals DomUtils             */
/* globals FindModeHistory      */
/* globals HUD_msg              */
/* globals KeyboardUtils        */
/* globals Settings             */
/* globals UIComponentMessenger */
/* globals Utils                */
/* globals navigator            */

/* globals dom_log              */

/* eslint-disable func-style */
/* eslint-disable no-implicit-globals */
/* eslint-disable no-useless-computed-key */


"use strict"; /* eslint-disable-line strict */

/*}}}*/
/* import {{{*/
import "../lib/chrome_api_stubs.js";
import "../lib/utils.js";
import "../lib/dom_utils.js";
import "../lib/settings.js";
import "../lib/keyboard_utils.js";
import "../lib/find_mode_history.js";
import * as UIComponentMessenger from "./ui_component_messenger.js";

/*}}}*/
let hud_page = (function() {
"use strict";
let log_this=false;

/*{{{*/
let findMode = null;

// Chrome creates a unique port for each MessageChannel, so there's a race condition between
// JavaScript messages of Vimium and browser messages during style recomputation. This duration was
// determined empirically. See https://github.com/philc/vimium/pull/3277#discussion_r283080348
const TIME_TO_WAIT_FOR_IPC_MESSAGES = 17;

const TT_REMOVED_HTML   = "<span style='color:red;'  > ? query removed   </span> <span style='color: yellow;'>...Shift Delete to UNDO</span>";
const TT_RESTORED_HTML  = "<span style='color:red;'  > ? query restored  </span>";
const TT_NOQUERIES_HTML = "<span style='color:white;'>NO query to restore</span>";
/*}}}*/

/*_ setTextInInputElement {{{*/

// Set the input element's text, and move the cursor to the end.
function setTextInInputElement(inputEl, text, _caller) {
/*{{{*/
if(log_this) dom_log.log("%c setTextInInputElement %c["+text+"]%c "+_caller
                    , dom_log.lbL+dom_log.lbB+HUD_PAGE_LFX
                    , dom_log.lbR+dom_log.lbB+dom_log.lfX[3]
                    , dom_log.lbH+dom_log.lbB+dom_log.lfX[3]);
/*}}}*/

  inputEl.textContent = text;

  // Move the cursor to the end. Based on one of the solutions here:
  // http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity
  const range = document.createRange();

  range.selectNodeContents(inputEl);
//range.collapse(false);

  const selection = globalThis.getSelection();
  selection.removeAllRanges();
  selection.addRange( range );
}
/*}}}*/
/*_ set_queryFilter         ● called by [INPUT listener] ● [onKeyEvent_DELETE] ● [onKeyEvent_UNDO] {{{*/
function set_queryFilter(text,_caller)
{
if(log_this) dom_log.log6("set_queryFilter("+text+") ● called by "+_caller);
  if(findMode.historyIndex < 0)     // USER-INPUT [FILTER or PATTERN] .. not a [STORAGE INDEX]
  {
/*{{{*/
if(log_this) dom_log.log( "%c set_queryFilter"
                         +"%c"+(text || "[]")
                         , dom_log.lbL+HUD_PAGE_LFX
                         , dom_log.lbR+dom_log.lfX[7]);
/*}}}*/
    chrome.storage.local.set({ queryFilter: text });
    findMode.queryFilter = text;
  }
  else {
/*{{{*/
if(log_this) dom_log.log( "%c set_queryFilter"
                         +"%c"+text
                         , dom_log.lbL+HUD_PAGE_LFX
                         , dom_log.lbR+dom_log.lfX[3]);
/*}}}*/
//  chrome.storage.local.set({ partialQuery: findMode.rawQuery });  // Fid-UI queryFilter responsibility
  }
}
/*}}}*/
/*_ get_el_cursorPosition   ● called by [onKeyEvent_DELETE] {{{*/
function get_el_cursorPosition(el) {

let selection = window.getSelection();
if( selection.rangeCount < 1) return selection.rangeCount;

  let range = selection.getRangeAt(0);

  let  caretRange = range.cloneRange();
       caretRange.selectNodeContents( el );
       caretRange.setEnd(range.endContainer, range.endOffset);

  return caretRange.toString().length;
}
/*}}}*/

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ FIND_UI KEYBOARD INPUT                                                    ●
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{*/
const MODIFIER_PENDING_DURATION = 1000;

const MODIFIER_OUTLINE_SHIFT   = "3px solid #0F0";
const MODIFIER_OUTLINE_CONTROL = "3px solid #F00";
const MODIFIER_OUTLINE_ALT     = "3px solid #F0F";

let   hudEl;
let   last_modifier = "";
/*}}}*/
/* onKeyEvent {{{*/
/*export*/ async function onKeyEvent(event) {
  /* hudEl {{{*/
if(!hudEl) hudEl = document.querySelector("#hud");
if(!hudEl.firstElementChild) dom_log.logBIG("hud_page.onKeyEvent ● hudEl is empty\n", hudEl);//FIXME

  /*}}}*/
  /* FILTER MODIFIERS ● (autorepeat declutter) ● return {{{*/
  if((event.key === "Shift") || (event.key === "Control") || (event.key === "Alt")) {
    onKeyModifier_PENDING( event );

    return null;
  }
  /*}}}*/
  /* clipboard_onKeyEvent {{{*/
  if( document.activeElement == ClipEdit_el) return clipboard_onKeyEvent(event);

  /*}}}*/
  /* RESOLVE MODIFIERS ● support releasing the modifier key before pressing the next key {{{*/
  let event_shiftKey = event.shiftKey || last_modifier.includes(  "Shift");
  let event_ctrlKey  = event.ctrlKey  || last_modifier.includes("Control");
  let event_altKey   = event.altKey   || last_modifier.includes("    Alt");

  onKeyModifier_PENDING();
  /*}}}*/
  /*{{{*/
  let rawQuery;

  /*}}}*/
  /* Enter            ● ...return null {{{*/

  // Handle <Enter> on "keypress", and other events on "keydown"; this avoids interence with CJK
  // translation (see #2915 and #2934).
  if((event.type === "keypress") && (event.key !== "Enter")) {
    return null;
  }

  if((event.type === "keydown") && (event.key === "Enter")) {
    return null;
  }
  /*}}}*/
  /* inputEl          ● #hud-find-input {{{*/
  const inputEl = document.querySelector("#hud-find-input");
  // Don't do anything if we're not in find mode.
  if(inputEl == null) {
    return null;
  }
  /*}}}*/
/*{{{*/
if(log_this) dom_log.console_clear("hud_page.onKeyEvent");
if(log_this) dom_log.log( "%c"+dom_log.mPadStart((event_ctrlKey ? "Control ":"")+(event_shiftKey ? "Shift ":"")+event.key, 20)
                         +"%c hud_page.onKeyEvent("+event.type+")"
                         +"%c textContent=["+inputEl.textContent+"]"
                        , dom_log.lbH+dom_log.lbB+dom_log.lfX[3]
                        , dom_log.lbL
                        , dom_log.lbR+dom_log.lfX[3]);
if(log_this) console.log("document.activeElement:");
if(log_this) console.dir( document.activeElement );
/*}}}*/
  // ┌────────────────────────────────────────────┐
  // │ HIDE FIND UI         ● Enter Escape BS DEL ●
  // └────────────────────────────────────────────┘
  /* Enter ● Escape ● INPUT EMPTY && [Backspace Enter Escape] {{{*/
  let inputEl_is_empty    = (inputEl.textContent.length == 0);
  let isEnter             = (            "Enter"    == event.key); /* eslint-disable-line yoda */
  let isEscape            = KeyboardUtils.isEscape   ( event    );
  let isBackspace         = KeyboardUtils.isBackspace( event    );

  let exit_input = (event_shiftKey || event_ctrlKey) ?  false    // USER COMMAND
    :              (inputEl_is_empty && isBackspace) ? "EXIT"    // INPUT CLEARED
    :                                   isEnter      ? "ENTER"   // SUBMIT
    :                                   isEscape     ? "ESCAPE"  // QUIT
    :                                                   null   ; // DEFAULT

  if( exit_input ) {
    inputEl.blur();
    UIComponentMessenger.postMessage({ name              : "hideFindMode"
                                     , exitEventIsEnter  : (event.key === "Enter")
                                     , exitEventIsEscape : KeyboardUtils.isEscape( event )
    });
  }
  /*}}}*/
  // ┌────────────────────────────────────────────┐
  // │ ...... to   ▼ PREV FILTERED STORED QUERIES ●
  // │ SWITCH from ▼ PATTERN INPUT                │
  // └────────────────────────────────────────────┘
  /* ArrowUp        ● historyIndex + 1 {{{*/
  else if(event.key === "ArrowUp"  ) {
    // ┌───────────────────────┐┌────────────┐
    // │ GET PREV stored query ││ USE FILTER ●
    // └───────────────────────┘└────────────┘
/*{{{*/
if(log_this) dom_log.log3("INPUT ▼ "      +event.key);
/*}}}*/
    if(rawQuery = FindModeHistory.getQuery(findMode.historyIndex+1, findMode.queryFilter)) {
      findMode.historyIndex     += 1;
/*{{{*/
if(log_this) dom_log.log6(" ● ......FILTERED rawQuery: ["+rawQuery             +"]");
if(log_this) dom_log.log6(" ● ...........historyIndex: ["+findMode.historyIndex+"]");
if(log_this) dom_log.log6(" ● ...findMode.queryFilter: ["+findMode.queryFilter   +"]");
/*}}}*/
      setTextInInputElement(inputEl, rawQuery, event.key);
      findMode.executeQuery();
    }
    else {
/*{{{*/
if(log_this) dom_log.log6(" ● ......FILTERED rawQuery: [NONE] for queryFilter["+findMode.queryFilter+"]");
if(log_this) dom_log.log6(" ● ...........historyIndex: ["+findMode.historyIndex+"]");
/*}}}*/
    }
  }
  /*}}}*/
  // ┌────────────────────────────────────────────┐
  // │ SWITCH from ▲ NEXT FILTERED STORED QUERIES ●
  // │ .......to   ▲ RESTORE LAST PATTERN INPUT   │
  // └────────────────────────────────────────────┘
  /* ArrowDown      ● historyIndex - 1 {{{*/
  else if(event.key === "ArrowDown") {
/*{{{*/
if(log_this) dom_log.log3("INPUT ▲ "      +event.key);
/*}}}*/
    findMode.historyIndex = Math.max(-1, findMode.historyIndex-1 );
    // ┌───────────────────────────────────────────┐
    // │ >=0 ⇒ GET INDEXED FILTERED STORED QUERIES ●
    // └───────────────────────────────────────────┘
    if(findMode.historyIndex >= 0) {
      rawQuery = FindModeHistory.getQuery(findMode.historyIndex, findMode.queryFilter);
/*{{{*/
if(log_this) dom_log.log6(" ● ...GET #"+ findMode.historyIndex+" FILTER=["+findMode.queryFilter+"] STORED QUERIES: ["+rawQuery+"]");
/*}}}*/
    }
    // ┌───────────────────────────────────────────┐
    // │  -1 ➔ RESTORE LAST USER INPUT FILTER      ●
    // └───────────────────────────────────────────┘
    else {
      rawQuery = findMode.queryFilter;
/*{{{*/
if(log_this) dom_log.log6(" ● ...RESTORE LAST USER PATTERN : ["+rawQuery+"]");
/*}}}*/
      if(rawQuery == inputEl.textContent)
        return null;
    }
    if(rawQuery) {
      setTextInInputElement(inputEl, rawQuery, event.key);
      findMode.executeQuery();
    }
  }
  /*}}}*/
  // ┌────────────────────────────────────────────┐
  // │ DELETE        from FILTERED STORED QUERIES ●
  // │ ........using LAST USER INPUT FILTER       │
  // └────────────────────────────────────────────┘
  /* _Delete        ● FindModeHistory.trim_queryList {{{*/
  else if(event.key === "Delete" && !(event_shiftKey || event_ctrlKey))
  {
    let cur_pos = get_el_cursorPosition( inputEl );
    let end_pos = inputEl.textContent.length;
/*{{{*/
if(log_this) dom_log.log3("INPUT "        +event.key+" ● cur_pos=["+cur_pos+"] ● end_pos=["+end_pos+"]");
/*}}}*/

    if(cur_pos == end_pos) {
      setTextInInputElement(inputEl, "", event.key);
      onKeyEvent_DELETE();
    }
    else {
      return null;
    }
  }
  /*}}}*/
  // ┌────────────────────────────────────────────┐
  // │ UNDO..restore from FILTERED STORED QUERIES ●
  // │ ........using LAST USER INPUT FILTER       │
  // └────────────────────────────────────────────┘
  /* +Delete (undo) ● FindModeHistory.undo_queryList {{{*/
  else if(event.key === "Delete" && (event_shiftKey || event_ctrlKey))
  {
/*{{{*/
if(log_this) dom_log.log3("INPUT Shift "  +event.key);
/*}}}*/
    let modifiers = (event_shiftKey ? "Shift ":"") + (event_ctrlKey ? "Control ":"");
    setTextInInputElement(inputEl, "", modifiers + event.key);
    let as_new_query = event_ctrlKey
    onKeyEvent_UNDO( as_new_query );
  }
  /*}}}*/
  // ┌────────────────────────────────────────────┐
  // │ CONTROL from 1..10 FILTERED STORED QUERIES ●
  // └────────────────────────────────────────────┘
  /* Control 1..9   ● historyIndex 1..10 {{{*/
  else if("0123456789".includes(event.key) && event_ctrlKey)
  {
/*{{{*/
if(log_this) dom_log.log3("INPUT Control "+event.key);
/*}}}*/
    /* [u_idx] {{{*/
    let u_idx
      = (("0123456789".indexOf(event.key) + 10) % 10); // [1..10] ➔ [0..9]

    /*}}}*/
    /* [l_idx] {{{*/
    let l_idx
      =  /*FindModeHistory.*/await get_historyFirst()
      +  u_idx;

    /*}}}*/
    let queryList = FindModeHistory.getQueryList( findMode.queryFilter );
    /* [l_bot] ● [10 STEPS BELOW] ● [>= 0] {{{*/
    let l_bot = Math.max(l_idx+1-10, 0);

    l_idx     = Math.max(l_bot , l_idx);
    /*}}}*/
    /* [l_top]  ● [10 steps above l_bot] ● [< queryList.length] {{{*/
    let l_top = Math.min(l_bot+  10, queryList.length);

    l_idx     = Math.min(l_top , l_idx);
    /*}}}*/

    if(rawQuery = FindModeHistory.getQuery(l_idx, findMode.queryFilter))
      findMode.historyIndex = l_idx;
/*{{{*/
if(log_this) dom_log.log6(" ● ...GET #"+ findMode.historyIndex+" FILTER=["+findMode.queryFilter+"] STORED QUERIES: ["+rawQuery+"]");
/*}}}*/
      setTextInInputElement(inputEl, rawQuery, "Control "+event.key);
      findMode.executeQuery();
  }
  /*}}}*/
  /* Control L      ● HUD_msg.Find_LOG_set_logging {{{*/
  else if((event.key === "l") && event_ctrlKey)
  {
/*{{{*/
if(log_this) dom_log.log3("INPUT Control "+event.key);

if(log_this) dom_log.log6(" ● ...toggle logging");
/*}}}*/
    UIComponentMessenger.postMessage({ name: "search", logging: "toggle" });
  }
  /*}}}*/
  /* Control C      ● HUD_msg .. ClipEdit_el       {{{*/
  else if((event.key === "c") && event_ctrlKey)
  {
/*{{{*/
if(log_this) dom_log.log3("INPUT Control "+event.key);

if(log_this) dom_log.log6(" ● ...clipboard: on");
/*}}}*/
    clipboard_edit(event, "on");
  }
  /*}}}*/
  // ┌────────────────────────────────────────────┐
  // │ BACK TO USER PATTERN INPUT                 ●
  // └────────────────────────────────────────────┘
  else { /*{{{*/
/*{{{*/
//if(log_this) dom_log.log3("%c INPUT ["+event.key+"] ● BACK TO USER PATTERN", dom_log.lbH+dom_log.lfX[7]);
/*}}}*/
    findMode.historyIndex = -1;
    return null;
  }
  /*}}}*/
  DomUtils.suppressEvent( event );
  return false;
}
/*}}}*/
/*_ get_historyFirst {{{*/
let get_historyFirst = async function()
{
    let    result = await chrome.storage.local.get("historyFirst");
    return parseInt(result.historyFirst) || 0;
};
/*}}}*/
/* onKeyEvent_DELETE {{{*/
function onKeyEvent_DELETE()
{
  setTimeout(async () => {
    let { changeCount , queryFilter }
      = await FindModeHistory.trim_queryList( findMode.rawQuery ); // filter with the current rawQuery

    let tooltipHTML = (  (changeCount  > 0) ? TT_RESTORED_HTML
                       : (changeCount <  0) ? TT_REMOVED_HTML
                       :                      TT_NOQUERIES_HTML
                      ).replace("?", Math.abs(changeCount));
    if(Math.abs(changeCount) > 1)
      tooltipHTML = tooltipHTML.replace(/queries/,"query");

    set_queryFilter(queryFilter, "onKeyEvent_DELETE");





    handlers["showTooltip"]( tooltipHTML ); /* eslint-disable-line dot-notation */
  }, 0);
}
/*}}}*/
/* onKeyEvent_UNDO {{{*/
function onKeyEvent_UNDO(as_new_query)
{
  setTimeout(async () => {
    let { changeCount , queryFilter }
      = await FindModeHistory.undo_queryList(findMode.rawQuery, as_new_query);

    let tooltipHTML = (  (changeCount  > 0) ? TT_RESTORED_HTML
                       : (changeCount <  0) ? TT_REMOVED_HTML
                       :                      TT_NOQUERIES_HTML
                      ).replace("?", Math.abs(changeCount));
    if(Math.abs(changeCount) > 1)
      tooltipHTML = tooltipHTML.replace(/queries/,"query");

    let inputEl = document.querySelector("#hud-find-input");
    if( inputEl ) setTextInInputElement(inputEl, queryFilter, "onKeyEvent_UNDO");
    findMode.executeQuery();

    handlers["showTooltip"]( tooltipHTML ); /* eslint-disable-line dot-notation */
  }, 0);
}
/*}}}*/

/*  onKeyModifier_PENDING {{{*/
/*{{{*/
let onKeyModifier_RELEASE_timeout;

/*}}}*/
let onKeyModifier_PENDING = function(event)
{
  /* MODIFIER PRESSED */
  if(event && event.key && (!last_modifier || !last_modifier.includes( event.key )))
  {
    /* [last_modifier] {{{*/
    if(!last_modifier) last_modifier  =        event.key;
    else               last_modifier += " " +  event.key;
    /*}}}*/
    /* hudEl style {{{*/
    hudEl.style.outlineOffset = "3px";
    if     (event.key === "Shift"  ) hudEl.style.outline     = MODIFIER_OUTLINE_SHIFT  ;
    else if(event.key === "Control") hudEl.style.outline     = MODIFIER_OUTLINE_CONTROL;
    else if(event.key === "Alt"    ) hudEl.style.outline     = MODIFIER_OUTLINE_ALT    ;
    /*}}}*/
    /* Find UI and LogPanel {{{*/
    UIComponentMessenger.postMessage({ name: "search", event_key: event.key , event_type: event.type });

    /*}}}*/
  }
  /* MODIFIER TIMEOUT {{{*/
  if(onKeyModifier_RELEASE_timeout) clearTimeout( onKeyModifier_RELEASE_timeout );

  if(last_modifier) {
    if(!event) onKeyModifier_RELEASE();
    else       onKeyModifier_RELEASE_timeout =  setTimeout(onKeyModifier_RELEASE, MODIFIER_PENDING_DURATION);
  }
  /*}}}*/
};
/*}}}*/
/*  onKeyModifier_RELEASE {{{*/
let onKeyModifier_RELEASE = function()
{
  onKeyModifier_RELEASE_timeout = null;

  /* Find UI and LogPanel */
  if(last_modifier)
    UIComponentMessenger.postMessage({ name: "search", event_key: last_modifier, event_type: "keyup" });

  /* hudEl */
  last_modifier            = ""; // clear consumed modifiers
  if(hudEl) {
    hudEl.style.outline    = "";
    hudEl.style.boxShadow  = "";
    }
};
/*}}}*/

///*  onKeyModifier_HIDEFIND {{{*/
//let onKeyModifier_HIDEFIND = function(event)
//{
//    let inputEl = document.querySelector("#hud-find-input");
//    if( inputEl ) inputEl.blur();
//
//    // FIND MODE PATTERN
//    UIComponentMessenger.postMessage({ name              : "hideFindMode"
//                                     , exitEventIsEnter  : (event.key === "Enter")
//                                     , exitEventIsEscape : KeyboardUtils.isEscape( event )
//    });
//};
///*}}}*/

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ FIND_UI SEARCH (postMessage) (queryFilter)                                ●
// └───────────────────────────────────────────────────────────────────────────┘
/* handlers {{{*/
// Exported for unit tests.
/*export*/ const handlers = {
  /* show {{{*/
  show(data) {

    // IN FIND   MODE
    const countEl = document.querySelector("#hud-match-count");
    if(   countEl ) { countEl.textContent = data.text; return; }

    // IN NORMAL MODE
    if(!hudEl) hudEl  = document.querySelector("#hud");

    hudEl.textContent = data.text;

    hudEl.classList.add   ("vimium-ui-component-visible");
    hudEl.classList.remove("vimium-ui-component-hidden" );
    hudEl.classList.remove(           "hud-find"        );

  },
  /*}}}*/
  /* hidden {{{*/
  hidden() {
/*{{{*/
if(log_this) dom_log.log("%c hud_page.hidden", dom_log.lbH+dom_log.lbB+HUD_PAGE_LFX);
/*}}}*/
    // We get a flicker when the HUD later becomes visible again (with new text) unless we reset its
    // contents here.
    if(!hudEl) hudEl  = document.querySelector("#hud");

    hudEl.textContent = "";

    hudEl.classList.add("vimium-ui-component-hidden");
    hudEl.classList.remove("vimium-ui-component-visible");

  },
  /*}}}*/
  /* showFindMode {{{*///TODO
  showFindMode() {
/*{{{*/
if(log_this) dom_log.log("%c hud_page.showFindMode", dom_log.lbH+dom_log.lbB+HUD_PAGE_LFX);
/*}}}*/
    let executeQuery;

    if(!hudEl) hudEl = document.querySelector("#hud");

    hudEl.classList.add("hud-find");

    const inputEl = document.createElement("span");
    // NOTE(mrmr1993): Chrome supports non-standard "plaintext-only", which is what we *really*
    // want.
    try {
      inputEl.contentEditable = "plaintext-only";
    } catch (error) { // Fallback to standard-compliant version.
      inputEl.contentEditable = "true";
    }
    inputEl.id = "hud-find-input";
    hudEl.appendChild(inputEl);

    inputEl.addEventListener( "input"
                            , executeQuery = function (event) {
/*{{{
dom_log.log3("hud_page inputEl ● input");
}}}*/

                               // On Chrome when IME is on, the order of events is:
                               //   keydown, input.isComposing=true, keydown, input.true, ..., keydown, input.true, compositionend;
                               // while on Firefox, the order is: keydown, input.true, ..., input.true, keydown, compositionend, input.false.
                               // Therefore, check event.isComposing here, to avoid window focus changes during typing with
                               // IME, since such changes will prevent normal typing on Firefox (see #3480)
                               if(Utils.isFirefox() && event.isComposing) {
                                 return;
                               }
                               // Replace \u00A0 (&nbsp;) with a normal space.
                               findMode.rawQuery = inputEl.textContent.replace("\u00A0", " ");

                               set_queryFilter(findMode.rawQuery, "INPUT listener");

/*{{{*/
if(log_this) dom_log.log("%c hud_page.executeQuery ● postMessage"     , dom_log.lbH+HUD_PAGE_LFX+ dom_log.lbB);
if(log_this) dom_log.log("%c ● name  %c"+ "search"                    , dom_log.lbL+HUD_PAGE_LFX, dom_log.lbR+dom_log.lfX[4]);
if(log_this) dom_log.log("%c ● query %c"+ (findMode.rawQuery||"empty"), dom_log.lbL+HUD_PAGE_LFX, dom_log.lbR+dom_log.lfX[findMode.rawQuery ? 4:8]);
/*}}}*/
                               setTimeout(() => {
                                 UIComponentMessenger.postMessage({         name: "search"
                                                                  ,  queryFilter: findMode.queryFilter
                                                                  ,        query: findMode.rawQuery
                                                                  , historyIndex: findMode.historyIndex })
                               }, 50);
                             }
                            );
/*{{{ ● FOCUS ● BLUR //FIXME
inputEl.addEventListener("focus", (event) => dom_log.log("%c● focus %c pages/hud_page inputEl %c"+document.activeElement.tagName+" ["+document.activeElement.className+"]", dom_log.lbL+dom_log.lfX[5], dom_log.lbC+dom_log.lfX[5], dom_log.lbR+dom_log.lfX[5]));
inputEl.addEventListener("blur" , (event) => dom_log.log("%c● blur  %c pages/hud_page inputEl %c"+document.activeElement.tagName+" ["+document.activeElement.className+"]", dom_log.lbL+dom_log.lfX[6], dom_log.lbC+dom_log.lfX[6], dom_log.lbR+dom_log.lfX[6]));
}}}*/

    const countEl = document.createElement("span");
    countEl.id = "hud-match-count";
    countEl.style.float = "right";
    hudEl.appendChild( countEl );
    Utils.setTimeout(TIME_TO_WAIT_FOR_IPC_MESSAGES, function () {
      // On Firefox, the page must first be focused before the HUD input element can be focused.
      // #3460.
      if(Utils.isFirefox()) {
        globalThis.focus();
      }
      inputEl.focus();
    });

    findMode = {
      historyIndex: -1,
      queryFilter: "",
      rawQuery: "",
      executeQuery
    };

  },
  /*}}}*/
  /* updateMatchesCount {{{*/
  updateMatchesCount({ matchCount, showMatchText }) { /* eslint-disable-line strict */
    const countEl = document.querySelector("#hud-match-count");
    // Don't do anything if we're not in find mode.
    if(countEl == null) return;

    if(Utils.isFirefox()) {
      document.querySelector("#hud-find-input").focus();
    }
    const countText = matchCount > 0
      ? ` ${matchCount} Match${matchCount === 1 ? "" : "es"}`
      : " No matches";
    countEl.textContent = showMatchText ? countText : "";
    countEl.style.color = (matchCount > 0) ? "yellow" : "";
  },
  /*}}}*/
  /* showTooltip {{{*/
  showTooltip(tooltipHTML) {
/*{{{
dom_log.log("%c handlers.showToolt%c"+tooltipHTML
            , dom_log.lbL        ,dom_log.lbR    );
}}}*/
    const countEl = document.querySelector("#hud-match-count");
    // Don't do anything if we're not in find mode.
    if(countEl == null) return;

    if(Utils.isFirefox())
      document.querySelector("#hud-find-input").focus();

    let saved_innerHTML = countEl.innerHTML;
    countEl.innerHTML   = tooltipHTML;
  },
  /*}}}*/
  /* copyToClipboard {{{*/
  copyToClipboard(message) {
    if(!ensureClipboardIsAvailable()) return;
    Utils.setTimeout(TIME_TO_WAIT_FOR_IPC_MESSAGES, async function () {
      const focusedElement = document.activeElement;
      // In Chrome, if we do not focus the current window before invoking navigator.clipboard APIs,
      // the error "DOMException: Document is not focused." is thrown.
      globalThis.focus();

      // Replace nbsp; characters with space. See #2217.
      const value = message.data.replace(/\xa0/g, " ");
      await navigator.clipboard.writeText(value);

      if(focusedElement != null) focusedElement.focus();
      globalThis.parent.focus();
      UIComponentMessenger.postMessage({ name: "unfocusIfFocused" });
    });
  },
  /*}}}*/
  /* pasteFromClipboard {{{*/
  pasteFromClipboard() {
    if(!ensureClipboardIsAvailable()) return;
    Utils.setTimeout(TIME_TO_WAIT_FOR_IPC_MESSAGES, async function () {
      const focusedElement = document.activeElement;
      // In Chrome, if we do not focus the current window before invoking navigator.clipboard APIs,
      // the error "DOMException: Document is not focused." is thrown.
      globalThis.focus();

      let value = await navigator.clipboard.readText();
      // Replace nbsp; characters with space. See #2217.
      value = value.replace(/\xa0/g, " ");

      if(focusedElement != null) focusedElement.focus();
      globalThis.parent.focus();
      UIComponentMessenger.postMessage({ name: "pasteResponse", data: value });
    });
  }
  /*}}}*/
};
/*}}}*/
/* init {{{*/
function init() {

  // Manually inject custom user styles.
  document.addEventListener("DOMContentLoaded", async () => {
    await Settings.onLoaded();
    DomUtils.injectUserCss();
  });

  document.addEventListener("keydown" , onKeyEvent);
  document.addEventListener("keypress", onKeyEvent);

  UIComponentMessenger.init();

  UIComponentMessenger.registerHandler(async function (event) {

    await Utils.populateBrowserInfo();

    const handler = handlers[event.data.name];

    Utils.assert(handler != null, "Unrecognized message type.", event.data);

    return handler( event.data );
  });

  FindModeHistory.init();
}
/*}}}*/
/*_ ensureClipboardIsAvailable {{{*/

// Navigator.clipboard is only available in secure contexts. Show a warning when clipboard actions
// fail on non-HTTPS sites. See #4572.

function ensureClipboardIsAvailable() {
  if(!navigator.clipboard) {
    UIComponentMessenger.postMessage({ name: "showClipboardUnavailableMessage" });
    return false;
  }
  return true;
}
/*}}}*/

/* testEnv {{{*/
const testEnv = globalThis.window == null;

if(  !testEnv )
{
  init();
}
/*}}}*/

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ CLIPBOARD EDIT                                                            ●
// └───────────────────────────────────────────────────────────────────────────┘
/*{{{*/
const CLIP_EDIT_ID          = "vimium_clip_edit";
const CLIP_EDIT_PLACEHOLDER = "EDIT CLIPBOARD CONTENT";

let   ClipEdit_el;
/*}}}*/
/*_ clipboard_edit {{{*/
let clipboard_edit = function(event,state)
{
/*{{{*/
if(log_this) dom_log.log("%c clipboard_edit %c clipboard=["+state+"]"
                         ,dom_log.lbL+dom_log.lfX[7]
                         ,                  dom_log.lbR+dom_log.lfX[7]);
/*}}}*/
//  /*  state toggle {{{*/
//  if((state != "on") && (state != "off"))
//    state
//      = ClipEdit_el
//      ? (ClipEdit_el.classList.contains("editing") ? "off" : "on") // toggle
//      :                                                      "on";
//
//  /*}}}*/
  /*  state on {{{*/
  if(state == "on") {

    clipboard_show();

    ClipEdit_el.addEventListener("input"  , clipboard_onKeyEvent);//FIXME

//  setTimeout(() => {
      if(!ClipEdit_el.value ) ClipEdit_el.value = " " // so that DELETE can "INPUT" something to call EXIT
      ClipEdit_el.select();
      ClipEdit_el.focus();
if(log_this) console.log("document.activeElement:");
if(log_this) console.dir( document.activeElement );
//  }, 1000);
  }
  /*}}}*/
  /* state off {{{*/
  else {

    clipboard_hide(event);

    ClipEdit_el.removeEventListener("input"  , clipboard_onKeyEvent);//FIXME

//  setTimeout(() => {
      ClipEdit_el.blur();
//  }, 1000);

    UIComponentMessenger.postMessage({ name              : "hideFindMode"
                                     , exitEventIsEnter  : (event.key === "Enter")
                                     , exitEventIsEscape : KeyboardUtils.isEscape( event )
    });
  }
  /*}}}*/
/*{{{*/
if(log_this) dom_log.log("%c ClipEdit_el %c"+ClipEdit_el.tagName+"%c"+ClipEdit_el.id+"%c."+ClipEdit_el.className
                         ,dom_log.lbL    ,dom_log.lbC             ,dom_log.lbC        ,dom_log.lbR              );
/*}}}*/
};
/*}}}*/
/*_ clipboard_onKeyEvent {{{*/
/*{{{*/
let   prev_KEY;

/*}}}*/
let clipboard_onKeyEvent = function(event)
{
if(event.type != "keydown") return false;
/*{{{*/
if(log_this) dom_log.log( "%c clipboard_onKeyEvent %c"+event.type
                         +"%c"+(event.data || event.inputType || event.key)
                        ,dom_log.lbL+dom_log.lfX[(event.inputType ? 7:4)]
                        ,dom_log.lbC+dom_log.lfX[(event.inputType ? 7:4)]
                        ,dom_log.lbH+dom_log.lfX[(event.inputType ? 7:4)]
                        );
//console.dir(event);
//if(log_this) console.log("document.activeElement:");
//if(log_this) console.dir( document.activeElement );
/*}}}*/
  /*  isEnter {{{*/
  let isEnter
    = (   ((event.inputType == "insertLineBreak"      )                             )
       || ((event.key       == "Enter"                ) && (event.type == "keydown"))
      );

  /*}}}*/
  /*  isEscape {{{*/
  let isEscape
    = (   ((event.key       == "Escape"               ) && (event.type == "keydown"))
       || ((event.inputType == "deleteContentBackward") && (!ClipEdit_el.value     ))
       || ((event.inputType == "deleteContentForward" ) && (!ClipEdit_el.value     ))
      );

  /*}}}*/
  /*  isControlC {{{*/
  let event_ctrlKey  = event.ctrlKey  || last_modifier.includes("Control");
  let isControlC     = event_ctrlKey && (event.key === "c");

  /*}}}*/
  /* [isEnter ] ● COPY TO CLIPBOARD {{{*/
  if( isEnter )
  {
    if(prev_KEY == "isEnter")
    {
/*{{{
      ClipEdit_el.select();
      document.execCommand("copy");
}}}*/
      let text = ClipEdit_el.value
        .replace(/^[ \n]+/, "")
        .replace(/[ \n]+$/, "");
      navigator.clipboard.writeText( text );

      ClipEdit_el.value = text;
      ClipEdit_el.select();

if(log_this) dom_log.log("%c Copy to Clipboard %c["+text+"]", dom_log.lbL, dom_log.lbR);

//    clipboard_edit(event, "off");
      clipboard_hide(event);
    }
  }
  /*}}}*/
  /* [isEscape || isControlC] ● HIDE {{{*/
  if( isEscape || isControlC )
  {
    clipboard_hide(event);

  }
  /*}}}*/
  /* prev_KEY {{{*/
  prev_KEY = isEnter    ? "isEnter"
    :        isEscape   ? "isEscape"
    :        isControlC ? "isControlC"
    :                      undefined;

  /*}}}*/
  return true;
};
/*}}}*/
/*_ clipboard_hide {{{*/
let clipboard_hide = function(event)
{
/*{{{*/
if(log_this) dom_log.log8("clipboard_hide");

/*}}}*/
  /* [ClipEdit_el] {{{*/
  if(!ClipEdit_el) return;

  /*}}}*/
  /* [ClipEdit_el] undisplay hidden {{{*/
  ClipEdit_el.style.display = "none";

  ClipEdit_el.classList.remove("editing");
  /*}}}*/
  /* [inputEl] ● prevent keypress {{{*/
  dom_log.preventDefault(event);

  /*}}}*/
  /* [inputEl] ● focus and select {{{*/
  let inputEl = document.querySelector("#hud-find-input");
  if( inputEl ) {
    inputEl.focus();

    let range = document.createRange();
    range.selectNodeContents(inputEl);

    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  /*}}}*/
    UIComponentMessenger.postMessage({ name: "search", clipboard: "clipboard_hide" });
};
/*}}}*/
  /*_ clipboard_show ● layout {{{*/
  /*{{{*/
  const FIND_LOG_EL_MAX_WIDTH = 300;
  const HUD_MARGIN_LEFT       =   6;
  const HUD_MARGIN            =  34;

  let iframe;
  /*}}}*/
  let clipboard_show = function()
  {
/*{{{*/
if(log_this) dom_log.log5("clipboard_show");

/*}}}*/
    /* ClipEdit_el {{{*/
    if(!ClipEdit_el) {
        ClipEdit_el                = document.createElement("TEXTAREA");
        ClipEdit_el.id             = CLIP_EDIT_ID;
        ClipEdit_el.placeholder    = CLIP_EDIT_PLACEHOLDER;

        clipboard_add_css();

        document.body.appendChild( ClipEdit_el );
    }
    /*}}}*/
//    /* LAYOUT ● hud ● top ● left {{{*/
//    let hud       =  document.getElementById("hud");
//    let hud_rect  =  hud.getBoundingClientRect();
//    if(!hud_rect || !hud_rect.width ) return;
//
//    let       top = hud_rect.top;
//    let       bot = hud_rect.top;
//
//    let  cliprect             = ClipEdit_el.getBoundingClientRect();
//
////  ClipEdit_el.style.top     = (         bot                    -cliprect.height     )+"px";
////  ClipEdit_el.style.left    = (hud_rect.right  -hud_rect.width -cliprect.width  - 10)+"px";
//    ClipEdit_el.style.bottom  = (         top                                         )+"px";
//    ClipEdit_el.style.right   = (hud_rect.right                                   - 10)+"px";
//
//    /*}}}*/
  /* [ClipEdit_el] display visible {{{*/
    ClipEdit_el.style.display = "block";

    ClipEdit_el.classList.add("editing");
  /*}}}*/
    UIComponentMessenger.postMessage({ name: "search", clipboard: "clipboard_show" });
  };
  /*}}}*/
    /*_ clipboard_add_css {{{*/
  /* CLIPBOARD_CSS_HTML {{{*/
  const CLIPBOARD_CSS_HTML=`
  /* CLIP_EDIT_ID {{{*/
  #${CLIP_EDIT_ID} {
/*{{{
            z-index: 2147483647;
}}}*/
             position: absolute; left: 0; top: 0;
             width : 100%;
             height:  99%;
             margin: 0;
         visibility:                               hidden;
         box-sizing:                           border-box;
      border-radius:                                  4px;
      border       : 3px dashed light-dark(magenta, cyan);
/*{{{
          min-width:                                 40ch;
         min-height:                                 40ch;
}}}*/
            padding:                                0.5em;
              color:            light-dark( black, white);
   background-color:            light-dark( white, black);
  }
  /*}}}*/
  /* .editing {{{*/
  #${CLIP_EDIT_ID}.editing {
         visibility:                              visible;
  }
  /*}}}*/
/* .lit {{{*/
  #${CLIP_EDIT_ID}.lit::before {     border: 3px solid red; }

/*}}}*/
  `;

  let Clipboard_css_el;
  /*}}}*/
    let clipboard_add_css = function()
    {
/*{{{*/
if(log_this) dom_log.log9("clipboard_add_css");

/*}}}*/

/*{{{
 ● pages/hud_page.html

 ● content_scripts/vimium.css ● document.styleSheets[0]
 /iframe.vimium-hud-frame

 ●         pages/hud_page.css ● document.styleSheets[1]

 ● Clipboard_css_el           ● document.styleSheets[2]

 ● lib/settings.js            ● document.styleSheets[3]

}}}*/

      let docFragment_el = document.querySelector("HEAD");
      if( docFragment_el && !docFragment_el.querySelector("#Clipboard_css"))
      {
        Clipboard_css_el           = document.createElement("STYLE");
        Clipboard_css_el.id        = "Clipboard_css";
        Clipboard_css_el.type      = "text/css";
        Clipboard_css_el.innerHTML = CLIPBOARD_CSS_HTML;

        docFragment_el.appendChild( Clipboard_css_el );
      }
    };
    /*}}}*/

/* EXPORT {{{*/
/*_ onload_listener {{{*/
let onload_listener = function()
{
  dom_log.logging_onLoad();

};
/*}}}*/
/*● name ● logging {{{*/
let    HUD_PAGE_LFX;
const  name = "hud_page";   // not defined in [Javascript context Vimium]

let logging = function(state,onload)
{
  HUD_PAGE_LFX  = dom_log.lfX[6];
  let changed   = (state != undefined) && (log_this != state);
  if( changed   )  log_this  = state;
  if(!onload    )  dom_log.logging({ name, log_this, changed });
  return           log_this;
};
/*}}}*/
return { name
  ,      logging
  ,      onKeyEvent
  ,      handlers
  ,      onload_listener
  // DEBUG
  , get_historyIndex : ()     =>   findMode.historyIndex
  , set_text         : (text) => { setTextInInputElement(document.querySelector("#hud-find-input"), text, "DevTools console"); }
/*{{{
  , onEnter          : ()     => { onKeyModifier_HIDEFIND({ key: "Enter"  }); }
  , onEscape         : ()     => { onKeyModifier_HIDEFIND({ key: "Escape" }); }
}}}*/
  , get_historyFirst
};
/*}}}*/
}());
globalThis.hud_page = hud_page;
document.addEventListener("DOMContentLoaded", hud_page.onload_listener);

/*{{{ ● FOCUS ● BLUR //FIXME
document.addEventListener("DOMContentLoaded", () => {
"use strict";
window.addEventListener("focus", (event) => dom_log.log("%c● FOCUS %c pages/hud_page %c"+document.activeElement.tagName+" ["+document.activeElement.className+"]", dom_log.lbL+dom_log.lfX[4], dom_log.lbC+dom_log.lfX[4], dom_log.lbR+dom_log.lfX[4]));
window.addEventListener("blur" , (event) => dom_log.log("%c● BLUR  %c pages/hud_page %c"+document.activeElement.tagName+" ["+document.activeElement.className+"]", dom_log.lbL+dom_log.lfX[8], dom_log.lbC+dom_log.lfX[8], dom_log.lbR+dom_log.lfX[8]));
});
}}}*/

/*{{{
vim: sw=2
}}}*/

