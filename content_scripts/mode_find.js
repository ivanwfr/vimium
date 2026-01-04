// ┌───────────────────────────────────────────────────────────────────────────┐
// │ content_scripts/mode_find.js ....................... _TAG (260101:14h:21) ●
// └───────────────────────────────────────────────────────────────────────────┘
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals DomUtils             */
/* globals FindModeHistory      */
/* globals FindPageSync         */
/* globals FindStorage          */
/* globals HUD                  */
/* globals HUD_msg              */
/* globals Highlightings        */
/* globals InsertMode           */
/* globals KeyboardUtils        */
/* globals Marks                */
/* globals Mode                 */
/* globals NodeMatcher        */
/* globals Settings             */
/* globals Utils                */
/* globals chrome               */
/* globals clearTimeout         */
/* globals console              */
/* globals dom_log              */
/* globals forTrusted           */
/* globals handlerStack         */
/* globals setTimeout           */

/* globals UIComponentMessenger */

/* exported mode_find    */

/* eslint-disable arrow-body-style            */
/* eslint-disable comma-dangle                */
/* eslint-disable consistent-return           */
/* eslint-disable implicit-arrow-linebreak    */
/* eslint-disable lines-between-class-members */
/* eslint-disable no-unused-vars              */
/* eslint-disable no-warning-comments         */


/*}}}*/
let mode_find = (function() { /* eslint-disable-line max-classes-per-file */
"use strict";
let log_this=false;
/* NOTE {{{
// NOTE(smblott). Ultimately, all of the FindMode-related code should be moved here.

}}}*/
/*➔ SuppressPrintable ● extends Mode {{{*/
// This prevents unmapped printable characters from being passed through to underlying page; see
// #1415. Only used by PostFindMode, below.
class SuppressPrintable extends Mode {
  constructor(options) {
    super();
    super.init(options);
    const handler = (event) =>
      (KeyboardUtils.isPrintable(event) ? this.suppressEvent : this.continueBubbling);
    const initialType = globalThis.getSelection().type;

    // We use unshift here, so we see events after normal mode, so we only see unmapped keys.
    this.unshift({
      _name: `mode-${this.id}/suppress-printable`,
      keydown: handler,
      keypress: handler,
      keyup: () => {
        // If the selection type has changed (usually, no longer "Range"), then the user is
        // interacting with the input element, so we get out of the way. See discussion of option 5c
        // from #1415.
        if (globalThis.getSelection().type !== initialType) {
          return this.exit();
        }
      },
    });
  }
}

/*}}}*/
/*_ newPostFindMode {{{*/
//{{{
// When we use find, the selection/focus can land in a focusable/editable element. In this
// situation, special considerations apply. We implement three special cases:
//   1. Disable insert mode, because the user hasn't asked to enter insert mode. We do this by using
//      InsertMode.suppressEvent.
//   2. Prevent unmapped printable keyboard events from propagating to the page; see #1415. We do
//      this by inheriting from SuppressPrintable.
//   3. If the very-next keystroke is Escape, then drop immediately into insert mode.
//
//}}}
const newPostFindMode = function() {
//if(log_this) dom_log.log7("content_scripts/mode_find.js newPostFindMode()");
  if (!document.activeElement || !DomUtils.isEditable(document.activeElement)) {
    return;
  }
  return new PostFindMode();
};

/*}}}*/
/*➔ PostFindMode ● extends SuppressPrintable {{{*/
class PostFindMode extends SuppressPrintable {
  constructor() {
    const element = document.activeElement;
    super({
      name: "post-find",
      // PostFindMode shares a singleton with focusInput; each displaces the other.
      singleton: "post-find-mode/focus-input",
      exitOnBlur: element,
      exitOnClick: true,
      // Always truthy, so always continues bubbling.
      keydown(event) {
        return InsertMode.suppressEvent(event);
      },
      keypress(event) {
        return InsertMode.suppressEvent(event);
      },
      keyup(event) {
        return InsertMode.suppressEvent(event);
      },
    });

    // If the very-next keydown is Escape, then exit immediately, thereby passing subsequent keys to
    // the underlying insert-mode instance.
    this.push({
      _name: `mode-${this.id}/handle-escape`,
      keydown: (event) => {
        if (KeyboardUtils.isEscape(event)) {
          this.exit();
          return this.suppressEvent;
        } else {
          handlerStack.remove();
          return this.continueBubbling;
        }
      },
    });
  }
}

/*}}}*/

// ┌──────────┐
// │ FindMode ●
// └──────────┘
/*{{{*/
const KEY_INPUT_DONE_DELAY = 500;
let   findInPlace_timeout;
/*}}}*/
/*➔ FindMode ● extends Mode {{{*/
class FindMode extends Mode {
  /* constructor {{{*/
  constructor(options) {
    super();
//{{{
// ┌───────────────────────────────────────────────────────────────────┐
// │ A ● new FindMode         ● CALLED BY mode_normal.js enterFindMode ●
// └───────────────────────────────────────────────────────────────────┘
if(log_this) dom_log.console_clear("FindMode");
if(log_this) dom_log.log1("🟤 new FindMode("+(options ? JSON.stringify(options) : "")+")");
    FindModeHistory.clear_queryFilter("new FindMode");
    HUD_msg.updateQuery();
//if(log_this) dom_log.log_caller();
//}}}
    /* options {{{*/
    if (options == null) {
      options = {};
    }

    /*}}}*/
    /* query {{{*/
    // TODO(philc): I don't think this.query is ever used/accessed, because it's only accessed from
    // static methods. Consider splitting the static portions of this class into a separate class
    // called FindModeSingleton. Blending the two together is confusing.
    this.query = {
      rawQuery: "",
      parsedQuery: "",
      matchCount: 0,
      hasResults: false,
    };
    // Save the selection, so findInPlace can restore it.
    this.initialRange = getCurrentRange();
    FindMode.query = { rawQuery: "" };
    /*}}}*/
    this.wrapscan = "";
    /* returnToViewport {{{*/
    if (options.returnToViewport) {
      this.scrollX = globalThis.scrollX;
      this.scrollY = globalThis.scrollY;
    }

    /*}}}*/
    /* super.init {{{*/
    super.init(Object.assign(options, {
      name: "find",
      indicator: false,
      exitOnClick: true,
      exitOnEscape: true,
      // This prevents further Vimium commands launching before the find-mode HUD receives the
      // focus. E.g. "/" followed quickly by "i" should not leave us in insert mode.
      suppressAllKeyboardEvents: true,
    }));

    /*}}}*/

        NodeMatcher.clear();

        HUD.showFindMode(this);
  }
  /*}}}*/
/* exit {{{*/
  exit(event) {
    HUD.unfocusIfFocused();
    super.exit();
    if (event) {
      FindMode.handleEscape();
    }
  }

/*}}}*/
/* restoreSelection {{{*/
  restoreSelection() {
    if (!this.initialRange) {
      return;
    }
    const range = this.initialRange;
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

/*}}}*/
// ┌─────────────┐
// │ findInPlace ●
// └─────────────┘
  /* findInPlace ● CALLED BY content_scripts/hud.js showFindMode {{{*/
  findInPlace(query, options) {
    HUD_msg.updateQuery(query, options);

    if( findInPlace_timeout ) clearTimeout( findInPlace_timeout );

    // TODO ... these are used to show the number of matches in the HUD
    this.query.rawQuery    = "";
    this.query.parsedQuery = "";

    // wait for user to pause typing for KEY_INPUT_DONE_DELAY before execution
    findInPlace_timeout = setTimeout(() => {
      findInPlace_timeout = null;
      // If requested, restore the scroll position (so that failed searches leave the scroll position
      // unchanged).
      this.checkReturnToViewPort();
      FindMode.updateQuery(query);

      // Restore the selection. That way, we're always searching forward from the same place, so we
      // find the right match as the user adds matching characters, or removes previously-matched
      // characters. See #1434.
      this.restoreSelection();
      query = FindMode.query.isRegex
        ?     FindMode.getQueryFromRegexMatches()
        :     FindMode.query.parsedQuery;
      FindMode.query.hasResults = FindMode.execute(query, options);
      HUD.show_matches();
    }, KEY_INPUT_DONE_DELAY);

  }
  /*}}}*/
  /* updateQuery ● CALLED BY onload_listener , findInPlace , getQuery , content_scripts/hud.js search {{{*/
  static updateQuery(query) {
//{{{
// ┌───────────────────────────────────────────────────────────────┐
// │ B ● FindMode.updateQuery   ● CALLED BY findInPlace , getQuery ●
// └───────────────────────────────────────────────────────────────┘
//(log_this && vimium_last_query && (query != vimium_last_query)) dom_log.console_clear("updateQuery");
//(log_this) dom_log.console_clear("updateQuery");
if(log_this) dom_log.log2("🔴🔴 FindMode.updateQuery(query "+JSON.stringify(query)+")");
//if(log_this) dom_log.log_caller();
//if(log_this) console.trace();
//if(log_this) dom_log.logBIG("query:");
//if(log_this) console.dir(query);
/*{{{
if(log_this) dom_log.log8("document.scrollingElement");
if(log_this) console.dir(  document.scrollingElement );
if(log_this) dom_log.log8("document.getRootNode()");
if(log_this) console.dir(  document.getRootNode() );
}}}*/
/*}}}*/
    /* !query ...return {{{*/
    if(!query) return;
    /*}}}*/
    /* REGEX pattern {{{*/
    let pattern;
    if (!this.query) {
      this.query = {};
    }
    this.query.rawQuery = query.trim();
    // the query can be treated differently (e.g. as a plain string versus regex) depending on the
    // presence of escape sequences. '\' is the escape character and needs to be escaped itself to
    // be used as a normal character. here we grep for the relevant escape sequences.
    this.query.isRegex = Settings.get("regexFindMode");
    this.query.parsedQuery = this.query.rawQuery.replace(
      /(\\{1,2})([rRI]?)/g,
      (match, slashes, flag) => {
        if ((flag === "") || (slashes.length !== 1)) {
          return match;
        }

        switch (flag) {
          case "r":
            this.query.isRegex = true;
            break;
          case "R":
            this.query.isRegex = false;
            break;
        }
        return "";
      },
    );

    // Implement smartcase.
    this.query.ignoreCase = !Utils.hasUpperCase(this.query.parsedQuery);

    const regexPattern = this.query.isRegex
      ?                                    this.query.parsedQuery
      : Utils.escapeRegexSpecialCharacters(this.query.parsedQuery);

    // Grep for all matches in every text node,
    // so we can show a the number of results.
    try {
      pattern = new RegExp(regexPattern, `g${this.query.ignoreCase ? "i" : ""}`);
    } catch {
      // If we catch a SyntaxError, assume the user is not done typing yet and return quietly.
      return;
    }
    /*}}}*/
    // ┌───────────────────────────────────────────────────────────────────────────┐
    // │ filter Body TextNodes ● Use Highlightings matches                         ●
    // ├───────────────────────────────────────────────────────────────────────────┤
    /*{{{*/
    if( NodeMatcher.can_match_query(query, "FindMode.updateQuery") )
      NodeMatcher  .set_Match_pattern( pattern );
    else
      NodeMatcher  .clear();

//  const      textNodes         = getAllTextNodes(); /* [IWE 251027] NODE FILTERING REIMPLEMENTED */
    const      textNodes         = NodeMatcher.get_Matched_TEXT_array();
    const      matchedNodes      = textNodes.filter((node) => { return node.textContent.match( pattern ); }); /* shallow copy */
    const      regexMatches      = matchedNodes.map((node) => node.textContent.match(pattern)); /* new array */
    this.query.regexMatches      = regexMatches;
    this.query.regexPattern      = pattern;
    this.query.regexMatchedNodes = matchedNodes;
    this.updateActiveRegexIndices();

    return this.query.matchCount = regexMatches != null ? regexMatches.flat().length : null;
    /*}}}*/
    // └───────────────────────────────────────────────────────────────────────────┘
  }

  /*}}}*/

  /* ┌──────────────────────────────────────────────────────────────────────────────────────────────┐ */
  /* │ C ● FindMode.updateActiveRegexIndices ● CALLED BY updateQuery , getNextQueryFromRegexMatches │ */
  /* └──────────────────────────────────────────────────────────────────────────────────────────────┘ */
  /* updateActiveRegexIndices {{{*/
  // set activeRegexIndices near the latest selection
  static updateActiveRegexIndices(backwards) {
/*{{{*/
//(log_this) dom_log.console_clear("updateActiveRegexIndices");
if(log_this) dom_log.log3("🟠🟠🟠 FindMode.updateActiveRegexIndices(backwards "+backwards+")");
//if(log_this) dom_log.log_caller();
/*}}}*/
    //FIXME
  /* ● When called by [updateActiveRegexIndices] ...return first selection {{{*/
    if(typeof backwards == "undefined")
    {
      let selection = globalThis.getSelection();
      let index     = FindPageSync.updateActiveRegexIndices_ON_VISIBLE_NODES(selection, backwards, this.query.regexMatchedNodes);
      this.query.activeRegexIndices = [Math.max(0,index), 0];

if(log_this) dom_log.log4("...VISIBLE NODE ROW #"+ (this.query.activeRegexIndices[0]+1));
      return;
    }
  /*}}}*/
    /* ● Start from current window selection (if any) {{{*/
    let activeNodeIndex = -1;

    let selection       = globalThis.getSelection();
/*{{{*/
if(log_this) dom_log.log4("....selection.rangeCount=["+selection.rangeCount+"]");
/*}}}*/

    /*}}}*/
    /* 1/3 ● User clicked on page   ● updateActiveRegexIndices_ON_USER_SELECTION {{{*/
    if(activeNodeIndex < 0)
      activeNodeIndex
        = FindPageSync.updateActiveRegexIndices_ON_USER_SELECTION(    selection, backwards, this.query.regexMatchedNodes, "may_use_hud");

    /*}}}*/
    /* 2/3 ● User scrolled page     ● updateActiveRegexIndices_ON_USER_SCROLL {{{*/
    if((activeNodeIndex < 0) && Highlightings.get_scrolled_by_user()) {
      let args = {       selection
          ,              backwards
          ,  node_array: this.query.regexMatchedNodes
          , may_use_hud: true };

      activeNodeIndex
        = FindPageSync.updateActiveRegexIndices_ON_USER_SCROLL( args );

      // SCROLLED BY USER HANDLED
      delete globalThis.mode_normal_scrolled_to; // set by content_scripts/mode_normal.js
    }
    /*}}}*/
    /* 3/3 ● Seek next or prev      ● updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV {{{*/
    if(activeNodeIndex < 0)
      [activeNodeIndex, this.wrapscan]  = FindPageSync.updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV(selection, backwards, this.query.regexMatchedNodes, "may_use_hud");

//    delete globalThis.mode_normal_scrolled_to;

    /*}}}*/
    /* ● Highlight wrapscan .. (when it happens) {{{
    if( this.wrapscan ) Highlightings.outline_activeNode();

    /*}}}*/
/*{{{*/
if(activeNodeIndex < 0) dom_log.logX("⚠ ⚠ ⚠ ⚠ FOUND NOTHING", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
/*}}}*/
    this.query.activeRegexIndices = [Math.max(activeNodeIndex, 0), 0];
  }
  /*}}}*/

// ┌─────┐
// │ GET ●
// └─────┘
  /* getQueryFromRegexMatches {{{*/
  static getQueryFromRegexMatches() {
    // find()ing an empty query always returns false
    if (!this.query.regexMatches?.length) {
      return "";
    }
    let [row, col] = this.query.activeRegexIndices;
    return this.query.regexMatches[row][col];
  }
  /*}}}*/
  /* getNextQueryFromRegexMatches {{{*/
  static getNextQueryFromRegexMatches(backwards) {
/*{{{*/
// ┌────────────────────────────────────────────────────────────────┐
// │ C ● FindMode.getNextQueryFromRegexMatches ● CALLED BY getQuery ●
// └────────────────────────────────────────────────────────────────┘
if(log_this) dom_log.console_clear("getNextQueryFromRegexMatches");
if(log_this) dom_log.log2("🔴🔴 FindMode.getNextQueryFromRegexMatches(backwards "+backwards+")");
//if(log_this) dom_log.log_caller();
/*}}}*/
    // find()ing an empty query always returns false /*{{{*/
    if (!this.query.regexMatches?.length) {
      return "";
    }
    /*}}}*/
    /* next or previous match according to last user action {{{*/
    /*{{{*/

    // NOTE(smblott):
    //  We want to start searching from the last user action, which may be a click or
    //  scroll, rather than from the last-found match.

    // GitHub Copilot suggested this, and it makes sense:
    //  If the user has clicked on the page, or scrolled it, then we want to start searching from
    //  that point, rather than from the last-found match. See #1434.
    //  We do this by updating activeRegexIndices to point to the match nearest the selection.
    //  Note that we don't do this when updateActiveRegexIndices is called from updateQuery, because
    //  in that case we want to start from the first match.

    /*}}}*/
    const stepSize = 0; // (r != row) ? 0 : (backwards ? -1 : 1);
    this.updateActiveRegexIndices( backwards );
    let [row, col] = this.query.activeRegexIndices;
/*{{{*/
if(log_this) FindPageSync.log_visible_regexMatchedNodes(this.query.regexMatchedNodes, row);
//if(log_this) dom_log.log("%c...row "+row+"%c .. stepSize "+stepSize
//                        , dom_log.lfX[row % 10]
//                        , dom_log.lfX[  8     ]);

//if(log_this) dom_log.log8("...[numRows "+numRows+"] [row "+row+"]");


//if(log_this) dom_log.log8("[numRows "+numRows+"] ● [stepSize "+stepSize+"]")
//if(log_this) dom_log.log8(" ● [row "+row+"] ● [col "+col+"]")
/*}}}*/
    /*}}}*/
    this.query.activeRegexIndices = [row, col];
    return this.query.regexMatches  [row][col];
  }
  /*}}}*/
  /* getQuery {{{*/
  // Returns null if no search has been performed yet.
  static getQuery(backwards) {
    if (!this.query) return;
    // check if the query has been changed by a script in another frame
    const mostRecentQuery = FindModeHistory.getQuery();
    if (mostRecentQuery !== this.query.rawQuery) {
      this.updateQuery(mostRecentQuery);
    }
    return this.getNextQueryFromRegexMatches( backwards );
  }
  /*}}}*/
  /* saveQuery {{{*/
  static saveQuery() {
    FindModeHistory.saveQuery(this.query.rawQuery);
  }
  /*}}}*/
  /* get_wrapscan {{{*/
  static get_wrapscan() {

      return this.wrapscan;
  }
  /*}}}*/

// ┌──────────┐
// │ EXECUTE  ●
// └──────────┘
  /* execute ● CALLED BY findNext and findInPlace {{{*/
  // :options is an optional dict. valid parameters are 'caseSensitive' and 'backwards'.
  static execute(query, options) {
/*{{{*/
// ┌───────────────────────────────────────────────────────────────┐
// │ D ● FindMode.execute        ● CALLED BY findInPlace, findNext ●
// └───────────────────────────────────────────────────────────────┘
//(log_this) dom_log.console_clear("execute");
if(log_this) dom_log.log("%c FindMode.execute %c"+query+"%c \u25B6 %c"+JSON.stringify(query)
                        , dom_log.lbB + dom_log.lbL + dom_log.lfX[4]
                        , dom_log.lbB + dom_log.lbR + dom_log.lfX[6]
                        , dom_log.lbB               + dom_log.lfX[9]
                        , dom_log.lbB + dom_log.lbH + dom_log.lfX[7]);
//if(log_this) dom_log.log_caller();
/*}}}*/
    let result = null;
    /* FindMode.getQuery {{{*/
    options = {
      backwards      :  false,
      caseSensitive  : !this.query.ignoreCase,
      colorSelection :  true,
      ...options };
    if (query == null) {
      query = FindMode.getQuery( options.backwards );
    }
  /*}}}*/
    /* removeEventListener selectionchange {{{*/
    if (options.colorSelection) {
      document.body.classList.add("vimium-find-mode");
      // ignore the selectionchange event generated by find()
      document.removeEventListener("selectionchange", this.restoreDefaultSelectionHighlight, true);
    }
    /*}}}*/
    /* highlight {{{*/
    if (this.query.regexMatches?.length) {
      let   [row, col] = this.query.activeRegexIndices;
/*{{{
//let l_x = (globalThis.mode_normal_scrolled_to == "TOP") ? 4
//        : (globalThis.mode_normal_scrolled_to == "BOT") ? 5
//        :                                                 8
//  if     ( globalThis.mode_normal_scrolled_to == "TOP") row = 1;
//  else if( globalThis.mode_normal_scrolled_to == "BOT") row = this.query.regexMatchedNodes.length-1;
//
//if(log_this) dom_log.log("%c...globalThis.mode_normal_scrolled_to=["+globalThis.mode_normal_scrolled_to+"] %c row  "+row
//                        , dom_log.lbL + dom_log.lfX[l_x]
//                        , dom_log.lbR + dom_log.lfX[l_x]);
//
}}}*/
      const node = this.query.regexMatchedNodes[row];
      const text = node.textContent;
      const matchIndices = getRegexMatchIndices(text, this.query.regexPattern);
      if (matchIndices.length > 0) {
        Highlightings.highlight_query(options.backwards, row, this.query.regexMatchedNodes);
        const startIndex = matchIndices[ col ];
        result = highlight(node, startIndex, query.length);
      }
    }
    /*}}}*/
    /* postFindFocus {{{*/
    // window.find focuses the |window| that it is called on. This gives us an opportunity to
    // (re-)focus another element/window, if that isn't the behaviour we want.
    if (options.postFindFocus != null) {
      options.postFindFocus.focus();
    }

    /*}}}*/
    /* addEventListener selectionchange {{{*/
    if (options.colorSelection) {
      setTimeout(
        () =>
          document.addEventListener("selectionchange", this.restoreDefaultSelectionHighlight, true),
        0,
      );
    }
    /*}}}*/
    /* document.activeElement.blur {{{*/
    // We are either in normal mode ("n"), or find mode ("/"). We are not in insert mode.
    // Nevertheless, if a previous find landed in an editable element, then that element may still
    // be activated. In this case, we don't want to leave it behind (see #1412).
    if (document.activeElement && DomUtils.isEditable(document.activeElement)) {
      if (!DomUtils.isSelected(document.activeElement)) {
        document.activeElement.blur();
      }
    }
    /*}}}*/
//delete globalThis.mode_normal_scrolled_to;
    return result;
  }
  /*}}}*/

  /* handleEscape {{{*/
  // The user has found what they're looking for and is finished searching. We enter insert mode, if
  // possible.
  static handleEscape() {
    document.body.classList.remove("vimium-find-mode");
    // Removing the class does not re-color existing selections. we recreate the current selection
    // so it reverts back to the default color.
    const selection = globalThis.getSelection();
    if (!selection.isCollapsed) {
      const range = globalThis.getSelection().getRangeAt(0);
      globalThis.getSelection().removeAllRanges();
      globalThis.getSelection().addRange(range);
    }
    return focusFoundLink() || selectFoundInputElement();
  }
  /*}}}*/
  /* handleEnter {{{*/
  // Save the query so the user can do further searches with it.
  static handleEnter() {
      focusFoundLink();
      document.body.classList.add("vimium-find-mode");

      Highlightings.backdrop_hide("handleEnter");

      if( FindMode.query.hasResults ) {
          vimium_last_query = FindMode.query.rawQuery;
//        FindStorage.storage_add(VIMIUM_QUERY_KEY, FindMode.query.rawQuery);
      }
      return FindMode.saveQuery();
  }
  /*}}}*/
// ┌──────────┐
// │ findNext ●
// └──────────┘
  /* findNext ● CALLED BY content_scripts/mode_normal.js performFind {{{*/
  static findNext(backwards) {
    // Bail out if we don't have any query text.
//{{{
// ┌───────────────────────────────────────────────────────────────┐
// │ B ● FindMode.findNext ● CALLED BY mode_normal.js performFind  ●
// └───────────────────────────────────────────────────────────────┘
if(log_this) dom_log.console_clear("findNext");
if(log_this) dom_log.log1("🟤 FindMode.findNext(backwards "+backwards+")");
//if(log_this) dom_log.log_caller();
/*}}}*/
    const nextQuery = FindMode.getQuery(backwards); /*{{{*/
    if(  !nextQuery ) {
      /*  wrapscan {{{*/
      let wrapscan = FindMode.get_wrapscan();
      if( wrapscan ) HUD.show(wrapscan           , 1000);
      /*}}}*/
      else HUD.show("No query to find.", 1000);
      return;
    }
/*}}}*/
    /* FindMode.execute {{{*/
    Marks.setPreviousPosition();
    FindMode.query.hasResults = FindMode.execute(nextQuery, { backwards });

    /*}}}*/
    /* focusFoundLink {{{*/
    if (FindMode.query.hasResults) {
      focusFoundLink();
      return newPostFindMode();
    } else {
      return HUD.show(`No matches for '${FindMode.query.rawQuery}'`, 1000);
    }
    /*}}}*/
  }
  /*}}}*/
  /* checkReturnToViewPort {{{*/
  checkReturnToViewPort() {
    if (this.options.returnToViewport) {
if(log_this) dom_log.logBIG("checkReturnToViewPort: ...BRING INTO VIEW: scrollTo("+this.scrollX+", "+this.scrollY+")");
      globalThis.scrollTo(this.scrollX, this.scrollY);
    }
  }
  /*}}}*/

}
/*}}}*/
/*➔ FindMode ● restoreDefaultSelectionHighlight {{{*/
FindMode.restoreDefaultSelectionHighlight = forTrusted(() =>
  document.body.classList.remove("vimium-find-mode")
);

/*}}}*/
/*_ getCurrentRange {{{*/
const getCurrentRange = function() {
  const selection = getSelection();
  if (selection.type === "None") {
    const range = document.createRange();
    range.setStart(document.body, 0);
    range.setEnd(document.body, 0);
    return range;
  }

  if (selection.type === "Range") {
    selection.collapseToStart();
  }

  return selection.getRangeAt(0);
};
/*}}}*/
/*_ getLinkFromSelection {{{*/
const getLinkFromSelection = function() {
  let node = globalThis.getSelection().anchorNode;
  while (node && (node !== document.body)) {
    if (node.nodeName.toLowerCase() === "a") {
      return node;
    }
    node = node.parentNode;
  }
  return null;
};
/*}}}*/
/*_ focusFoundLink {{{*/
const focusFoundLink = function() {
  if (FindMode.query.hasResults) {
    const link = getLinkFromSelection();
    if (link) {
      link.focus({ preventScroll: true }); /* smooth scroll handled by highlight */
    }
  }
};
/*}}}*/
/*_ selectFoundInputElement {{{*/
const selectFoundInputElement = function() {
  // Since the last focused element might not be the one currently pointed to by find (e.g. the
  // current one might be disabled and therefore unable to receive focus), we use the approximate
  // heuristic of checking that the last anchor node is an ancestor of our element.
  const findModeAnchorNode = document.getSelection().anchorNode;
  if (
    FindMode.query.hasResults && document.activeElement &&
    DomUtils.isSelectable(document.activeElement) &&
    DomUtils.isDOMDescendant(findModeAnchorNode, document.activeElement)
  ) {
    return DomUtils.simulateSelect(document.activeElement);
  }
};
/*}}}*/
/*_ getRegexMatchIndices {{{*/
// Retrieve the starting indices of all matches of the queried pattern within the given text.
const getRegexMatchIndices = (text, regex) => {
  const indices = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (!match[0]) {
      break;
    }
    indices.push(match.index);
  }

  return indices;
};
/*}}}*/

// ┌───────────┐
// │ highlight ●
// └───────────┘
/* highlight ● CALLED BY exec , content_scripts/vimium_frontend.js focusThisFrame {{{*/
/*{{{*/
// Highlights text starting from the given startIndex with the specified length.
const SCROLL_MARGIN = "100";

/*}}}*/
const highlight = (textNode, startIndex, length) => {
if(log_this) dom_log.log8("highlight(textNode , [startIndex "+startIndex+"] , [length "+length+"])");
/*{{{
if(log_this) console.log(textNode);
if(log_this) dom_log.log_caller();
}}}*/
  /* SET SELECTION {{{*/
  if(startIndex === -1) return false;
  const selection = globalThis.getSelection();
  const     range = document.createRange();

  selection.removeAllRanges();
  selection.addRange(range);
try {
  range.setStart(textNode, startIndex         );
  range.setEnd  (textNode, startIndex + length);
} catch(e) {
if(log_this) dom_log.logX("⚠ ⚠ ⚠ highlight: Exception: "+e.message, dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
if(log_this) dom_log.logX("⚠ ⚠ ⚠ highlight: textNode: "+dom_log.get_node_xpath(textNode), dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
  return false;
}
  /*}}}*/
  // Ensure the highlighted element is visible within the viewport.
  /* 1/2 CENTER_ON_SELECTION {{{*/
  if( Highlightings.CENTER_ON_SELECTION ) return true;

  /*}}}*/
  /* 2/2 scrollTo ● scroll_listener will save the [RESULTING scrollY] to detect [SCROLLED BY USER] {{{*/
  const rect = range.getBoundingClientRect();
  if (rect.top < 0 || rect.bottom > globalThis.innerHeight) {
    let  w_h = globalThis.innerHeight;
    let   dy = (rect.top    < 0  ) ? rect.top
      :        (rect.bottom > w_h) ? rect.bottom-w_h
      :                              0;
    if( dy ) {
      dy      += SCROLL_MARGIN * ((dy < 0) ? -1 : 1);
      let top  = globalThis.scrollY + dy;

      /* IF NO SMOOTH SCROLLING MAY BE IN PROGRESS */

if(log_this) dom_log.logBIG("highlight.scrollTo("+top+")");
                          // Scroll instantly when we find a search result. This matches the behavior of Chrome and
                          // Firefox's native search UI. See #4661.
      globalThis.scrollTo({ top, behavior: "smooth" });
      globalThis.addEventListener("scroll",   Highlightings.scroll_listener);
    }
  }
  /*}}}*/
  return true;  /* visible when scrolling terminates */
};
/*}}}*/
/*_ getAllTextNodes {{{*/
const getAllTextNodes = function() {
    const textNodes = [];
    /*_ getChildrenTextNodes {{{*/
    let getChildrenTextNodes = function(node) {
//if(log_this) dom_log.log8("getChildrenTextNodes("+node.tagName+")");
        if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node);
        } else if(    Highlightings.isExpandable( node )
                  && !Highlightings.is_node_COLLAPSED( node )
        ) {
            const children = node.childNodes;
            for (const child of children)
                getChildrenTextNodes(child, textNodes);
        }
    };
    /*}}}*/
    getChildrenTextNodes( document.body );
if(log_this) dom_log.log8("getAllTextNodes: FOUND "+(textNodes.length)+" textNodes");
    return textNodes;
};
/*}}}*/

// ┌────────┐
// │ onload ●
// └────────┘
/*{{{*/
const VIMIUM_QUERY_KEY = "findModeRawQueryList";

let   vimium_last_query;
/*}}}*/
/*_ onload_listener {{{*/
let onload_listener_timeout;

let onload_listener = function()
{
if(log_this) console.log("document.readyState: "+ document.readyState);

  if(   (document.readyState == "complete"   )
     || (document.readyState == "interactive"))
  {
    dom_log.logging_onLoad();

    window.addEventListener("resize", HUD_msg.window_resize_handler);

    vimium_last_query = FindModeHistory.getQuery();

    FindMode.updateQuery( vimium_last_query );

//  let items
//    = await chrome.storage.local.get("queryFilter" );
//  FindMode.updateQuery(        items["queryFilter"]); /* eslint-disable-line dot-notation */

    clipboard_add_css();
  }
  else if(!onload_listener_timeout)
  {
    onload_listener_timeout = setTimeout(onload_listener, 200);
  }
};
/*}}}*/
    /*_ clipboard_add_css {{{*/
/*{{{*/
const CLIP_EDIT_ID          = "vimium_clip_edit";
const CLIP_EDIT_PLACEHOLDER = "SET CLIPBOARD CONTENT";

const CLIPBOARD_CSS_HTML    =`
iframe.vimium-hud-frame {
  border: 3px dashed magenta;
  border-radius: 0.5em;
}
/* CLIP_EDIT_ID {{{*/
#${CLIP_EDIT_ID} {
/*{{{
          z-index:                           2147483647;
}}}*/
       visibility:                               hidden;
       box-sizing:                           border-box;
    border-radius:                                  4px;
    border       : 3px dashed light-dark(magenta, cyan);
        min-width:                                 48ch;
       min-height:                                 12ch;
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
/* ::before {{{*/
#${CLIP_EDIT_ID}::before {
       opacity   :                         100%;
       position  :                     absolute;
       top       :                         -1em;
       left      :                            0;
    border-radius:                          4px;
       border    :              1px solid #AAAC;
            color: light-dark(  white, gray   );
 background-color: light-dark(#000000, #181818);
       padding   :              0   5px        ;
       content   :   '${CLIP_EDIT_PLACEHOLDER}';
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
 ● content_scripts/vimium.css ● document.styleSheets[0]
 /iframe.vimium-hud-frame

 ●         pages/hud_page.css ● document.styleSheets[1] ● pages/hud_page.html

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

// ┌────────┐
// │ EXPORT ●
// └────────┘
/*{{{*/
globalThis.PostFindMode     = PostFindMode;
globalThis.FindMode         = FindMode;
globalThis.newPostFindMode  = newPostFindMode; /* called by content_scripts/hud.js hideFindMode() */

/*● name ● logging {{{*/
const  name = "mode_find";  // not defined in [Javascript context hud_page.html]

let logging = function(state,onload)
{
  let changed = (state != undefined) && (log_this != state);
  if( changed )  log_this  = state;
  if(!onload  )  dom_log.logging({ name, log_this, changed });
  return         log_this;
};
/*}}}*/
return { name
    ,    logging
    ,    PostFindMode
    ,    VIMIUM_QUERY_KEY
    ,    FindMode
    ,    newPostFindMode
    ,    onload_listener
};
/*}}}*/
}());
globalThis.mode_find = mode_find;
document.addEventListener("DOMContentLoaded", mode_find.onload_listener);

/*{{{
vim: sw=2
}}}*/
