/* ┌────────────────────────────────────────────────────────────────────────┐ */
/* │ content_scripts/mode_find.js..................... _TAG (251006:18h:29) │ */
/* └────────────────────────────────────────────────────────────────────────┘ */
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console         */
/* globals chrome          */
/* globals DomUtils        */
/* globals FindModeHistory */
/* globals HUD             */
/* globals InsertMode      */
/* globals KeyboardUtils   */
/* globals Marks           */
/* globals Mode            */
/* globals Settings        */
/* globals Utils           */
/* globals dom_log         */
/* globals forTrusted      */
/* globals handlerStack    */
/* globals setTimeout      */
/* globals clearTimeout    */

/* eslint-disable arrow-body-style            */
/* eslint-disable comma-dangle                */
/* eslint-disable consistent-return           */
/* eslint-disable implicit-arrow-linebreak    */
/* eslint-disable lines-between-class-members */
/* eslint-disable no-unused-vars              */
/* eslint-disable no-warning-comments         */

/* exported vimium_frontend */

/*}}}*/
let vimium_mode_find    = (function() { /* eslint-disable-line max-classes-per-file */
"use strict";
/* NOTE {{{
// NOTE(smblott). Ultimately, all of the FindMode-related code should be moved here.
}}}*/

const AUTO_CENTER_VIEW_ON_SELECTION = true;
/* const {{{*/
const NODE_COLLAPSED        = "COLLAPSED";
const NODE_OUTOFVIEW        = "OUT OF VIEW ";
const NODE_SELECTION        = "SELECT_NODE";

const CLASS_OUTOFVIEW       = "outofview";
const CLASS_COLLAPSED       = "collapsed";
const CLASS_SELECTION       = "selection";

//nst CSS_BG_OUTOFVIEW      = "#22A4";
//nst CSS_BG_COLLAPSED      = "#A224";
//nst CSS_BG_SELECTION      = "#AA24";

/*
/\v<(NODE_COLLAPSED|NODE_OUTOFVIEW|NODE_SELECTION)>
*/
/*}}}*/

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
/*{{{
// When we use find, the selection/focus can land in a focusable/editable element. In this
// situation, special considerations apply. We implement three special cases:
//   1. Disable insert mode, because the user hasn't asked to enter insert mode. We do this by using
//      InsertMode.suppressEvent.
//   2. Prevent unmapped printable keyboard events from propagating to the page; see #1415. We do
//      this by inheriting from SuppressPrintable.
//   3. If the very-next keystroke is Escape, then drop immediately into insert mode.
//
}}}*/
const newPostFindMode = function() {
//dom_log.log7("content_scripts/mode_find.js.newPostFindMode()");
    if (!document.activeElement || !DomUtils.isEditable(document.activeElement)) {
        return;
    }
    else {
        return new PostFindMode();
    }
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
// │ FindMode │
// └──────────┘
/*➔ FindMode ● extends Mode {{{*/
class FindMode extends Mode {
  /* constructor {{{*/
  constructor(options) {
      super();
//{{{
// ┌───────────────────────────────────────────────────────────────────┐
// │ A ● new FindMode         ● CALLED BY mode_normal.js.enterFindMode │
// └───────────────────────────────────────────────────────────────────┘
  console.clear();
  dom_log.log1("🟤 new FindMode(options "+(options ? JSON.stringify(options) : options)+")");
dom_log.log_caller();
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
      /*}}}*/
      this.wrapscan = "";
      // Save the selection, so findInPlace can restore it. {{{
      this.initialRange = getCurrentRange();
      FindMode.query = { rawQuery: "" };
      /*}}}*/
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
      /*  HUD.showFindMode {{{*/
      HUD.showFindMode(this);

      Highlightings.clear();
      /*}}}*/
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
// │ findInPlace │
// └─────────────┘
  /* findInPlace ● CALLED BY dev/content_scripts/hud.js(showFindMode) {{{*/
  findInPlace(query, options) {
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
  }
  /*}}}*/
  /* updateQuery ● CALLED BY onload , findInPlace , getQuery , content_scripts/hud.js(search) {{{*/
  static updateQuery(query) {
//{{{
// ┌───────────────────────────────────────────────────────────────┐
// │ B ● FindMode.updateQuery   ● CALLED BY findInPlace , getQuery │
// └───────────────────────────────────────────────────────────────┘
if(query != vimium_last_query) console.clear();
  dom_log.log2("🔴🔴 FindMode.updateQuery(query "+JSON.stringify(query)+")");
//dom_log.log_caller();
//dom_log.logBIG("query:");
//console.dir(query);
/*{{{
dom_log.log8("document.scrollingElement");
console.dir(  document.scrollingElement );
dom_log.log8("document.getRootNode()");
console.dir(  document.getRootNode() );
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
    this.query.rawQuery = query;
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
      ? this.query.parsedQuery
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
    // │ Highlightings .. f(pattern)                                               │
    // ├───────────────────────────────────────────────────────────────────────────┤
    //{{{
    if(this.query.rawQuery)
      Highlightings.set_Match_pattern( pattern );
    else
      Highlightings.clear();
    //}}}
    // └───────────────────────────────────────────────────────────────────────────┘
    // ┌───────────────────────────────────────────────────────────────────────────┐
    // │ filter Body TextNodes ● TODO                                              │
    // ├───────────────────────────────────────────────────────────────────────────┤
    /*{{{*/

//  const      textNodes         = getBodyTextNodes();
    const      textNodes         = Highlightings.get_Matched_TEXT_array(); // [IWE REPLACING FindMode search with Highlightings function]

    const      matchedNodes      = textNodes   .filter((node) => { return node.textContent.match( pattern ); }); // shallow copy
    const      regexMatches      = matchedNodes.map   ((node) =>          node.textContent.match( pattern )   ); //    new array
    this.query.regexMatches      = regexMatches;
    this.query.regexPattern      = pattern;
    this.query.regexMatchedNodes = matchedNodes;
    this.updateActiveRegexIndices();

    return this.query.matchCount
          =   regexMatches != null
            ? regexMatches.flat().length
            : null
      ;
    /*}}}*/
    // └───────────────────────────────────────────────────────────────────────────┘
  }
  /*}}}*/

  /* ┌──────────────────────────────────────────────────────────────────────────────────────────────┐ */
  /* │ C ● FindMode.updateActiveRegexIndices ● CALLED BY updateQuery , getNextQueryFromRegexMatches │ */
  /* └──────────────────────────────────────────────────────────────────────────────────────────────┘ */
  /* updateActiveRegexIndices {{{*/
  // set activeRegexIndices near the latest selection
  static updateActiveRegexIndices(backwards)
  {
/*{{{*/
//console.clear();
  dom_log.log3("🟠🟠🟠 FindMode.updateActiveRegexIndices(backwards "+backwards+")");
//dom_log.log_caller();
/*}}}*/
/* If called by updateActiveRegexIndices ...return first selection {{{*/
    if(typeof backwards == "undefined")
    {
      this.query.activeRegexIndices = [0 , 0];

dom_log.log4("....FIRST SELECTION ROW #"+ (this.query.activeRegexIndices[0]+1));
      return;
    }
/*}}}*/
    let activeNodeIndex = -1;
    let selection       = globalThis.getSelection();
/*{{{*/
dom_log.log4("....selection.rangeCount=["+selection.rangeCount+"]");
/*}}}*/

    /* 1/3 ● User clicked on page */
    if(activeNodeIndex < 0) activeNodeIndex = this.updateActiveRegexIndices_ON_USER_SELECTION     (selection, backwards);

    /* 2/3 ● User scrolled page */
    if(activeNodeIndex < 0) activeNodeIndex = this.updateActiveRegexIndices_ON_USER_SCROLL        (selection, backwards);

    /* 3/3 ● Seek next or prev */
    if(activeNodeIndex < 0) activeNodeIndex = this.updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV (selection, backwards);

    /* wrapscan highlight */
    if( this.wrapscan ) this.outline_activeNode();

/*{{{*/
if(activeNodeIndex < 0) dom_log.logX("⚠ ⚠ ⚠ ⚠ FOUND NOTHING", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
/*}}}*/
    this.query.activeRegexIndices = [Math.max(activeNodeIndex, 0), 0];
  }
  /*}}}*/
//{{{
  /*.updateActiveRegexIndices_ON_USER_SELECTION {{{*/
  static updateActiveRegexIndices_ON_USER_SELECTION(selection, backwards)
  {
    /* ● NO CURRENT SELECTION {{{*/
    if(selection.rangeCount <= 0)
      return -1;

    /*}}}*/
    /* ● NOT A QUERY SELECTION {{{*/
    if( this.query.regexMatchedNodes.includes( selection.anchorNode ) )
      return -1;

    /*}}}*/
    /* ● PICK FIRST NODE JUST BEYOND USER SELECTION .. f(backwards) .. f(compareBoundaryPoints) {{{*/
    /* [sel_range] [findFunction] {{{*/
    let       sel_range = selection.getRangeAt(0);
/*{{{
    let      comp_range = selection.getComposedRanges()[0];
console.log("comp_range");
console.dir( comp_range );
}}}*/
//dom_log.log8("....selection.anchorNode.parentElement: "+selection.anchorNode.parentElement.tagName);
    let        sel_rect = selection.anchorNode.parentElement.getBoundingClientRect();
//dom_log.log9("....sel_rect.top: "+ sel_rect.top);
//dom_log.log9("....selection.anchorNode.parentElement.offsetTop: "+selection.anchorNode.parentElement.offsetTop);
//  let   sel_container = Highlightings.get_node_container( selection.anchorNode );
    let      node_range = document.createRange();

    let                   findFunction = backwards ? Array.prototype.findLastIndex : Array.prototype.findIndex;
//dom_log.log8("findFunction=["+findFunction.name+"]");
//console.log ("this.query.regexMatchedNodes");
//console.dir ( this.query.regexMatchedNodes );
      /*}}}*/
    let activeNodeIndex = findFunction.apply(this.query.regexMatchedNodes,[(node) => {
/*{{{*/
//dom_log.log9("....node[# "+node.parentElement.getAttribute("data-num")+"] [offsetTop "+node.parentElement.offsetTop+"] [top "+node.parentElement.getBoundingClientRect().top+"]");
      let result;
/*}}}*/
      /* DIFFERENT DOCUMENT ● compare selection <=> nodes offsetTop {{{*/
      if( !nodes_are_in_same_document(selection.anchorNode, node) )
      {
//dom_log.logX("⚠ ⚠ ⚠ ⚠ DIFFERENT DOCUMENT ⚠ ⚠ ⚠ ⚠", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
/* comparing getBoundingClientRect top {{{*/
        let        node_rect = node.parentElement.getBoundingClientRect();
//dom_log.log9(     "node_rect.top: "+node_rect.top);

        result = backwards
            ?     (node_rect.top < sel_rect.top)
            :     (node_rect.top > sel_rect.top);
/*}}}*/
/* comparing containers offsetTop {{{
        let      node_container = Highlightings.get_node_container( node );
        result = backwards
            ?     (node_container.offsetTop < sel_container.offsetTop)
            :     (node_container.offsetTop > sel_container.offsetTop);
}}}*/
/* comparing parentElement offsetTop {{{
        result = backwards
            ?     (node.parentElement.offsetTop < selection.anchorNode.parentElement.offsetTop)
            :     (node.parentElement.offsetTop > selection.anchorNode.parentElement.offsetTop);
}}}*/
//        /* getComposedRanges ...returns an instance of StaticRange incopatible with compareBoundaryPoints {{{*/
//        node_range.setStart(node, 0);
//        let doc_range = sel_range;
//        if("getComposedRanges" in Selection.prototype) {
//        //doc_range = selection.getComposedRanges({ shadowRoots: Highlightings.ShadowRoot_array })[0]; // https://developer.mozilla.org/en-US/docs/Web/API/Selection/getComposedRanges
//          doc_range = selection.getComposedRanges({ shadowRoots: Highlightings.ShadowRoot_array })   ; // https://developer.mozilla.org/en-US/docs/Web/API/Selection/getComposedRanges
//        }
//        else {
//          console.log("getComposedRanges() method not supported in this browser");
//        }
//
//          result
//            =  backwards
//            ?   doc_range.compareBoundaryPoints(Range.START_TO_START, node_range) >= 0
//            :   doc_range.compareBoundaryPoints(Range.START_TO_START, node_range) <= 0;
//        /*}}}*/
      }
      /*}}}*/
      /* .....SAME DOCUMENT ● compare sel_range <=> node_range {{{*/
      else {
//dom_log.logX("....SAME DOCUMENT", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
          node_range.setStart(node, 0);
          result
            =  backwards
            ?   sel_range.compareBoundaryPoints(Range.START_TO_START, node_range) >= 0
            :   sel_range.compareBoundaryPoints(Range.START_TO_START, node_range) <= 0;
      }
      /*}}}*/
      return result;
    }]);
    /*}}}*/
    /* ● NEAR USER SELECTION {{{*/
    if(activeNodeIndex >= 0)
    {
      let numRows = this.query.regexMatchedNodes.length;
      let     msg = (backwards ? "▲ " : "▼ ")+ (activeNodeIndex+1)+" of "+numRows;
HUD_show(msg, 500);
dom_log.log4("🟠🟠🟠🟠 NEAR USER SELECTION: "+ msg);
    }
    /*}}}*/
    return activeNodeIndex;
  }
  /*}}}*/
  /*.updateActiveRegexIndices_ON_USER_SCROLL {{{*/
  static updateActiveRegexIndices_ON_USER_SCROLL(selection, backwards)
  {
    /* ● ONLY AFTER A USER SCROLL {{{*/
    if( !get_scrolled_by_user() )
      return -1;

    /*}}}*/
//  /* NO CURRENT SELECTION {{{*/
//  if(selection.rangeCount <= 0)
//    return -1;

//  /*}}}*/
    /* ● VISIBLE ● (backwards ? BEFORE : AFTER) {{{*/
    let matched_nodes     = this.query.regexMatchedNodes;
    let         numRows   = this.query.regexMatchedNodes.length;
    let activeNodeIndex   = this.query.regexMatchedNodes.indexOf( selection.anchorNode );

    let targetNodeIndex   =  activeNodeIndex + (backwards ? -1 : 1);
        targetNodeIndex   = (targetNodeIndex +  numRows) % numRows;
//dom_log.log7("....activeNodeIndex=["+activeNodeIndex+"] ➔ ["+targetNodeIndex+"]");

    let visible_node_rows_before = [];
    for(let row = targetNodeIndex; row >= (0                     ); row -= 1) {
      if(!this.is_node_OUTOFVIEW( matched_nodes[row] ))
        visible_node_rows_before.push(          row  );
    }
//dom_log.log("visible_node_rows_before:", visible_node_rows_before);

    let visible_node_rows_after  = [];
    for(let row = targetNodeIndex; row <= (matched_nodes.length-1); row += 1) {
      if(!this.is_node_OUTOFVIEW( matched_nodes[row] ))
        visible_node_rows_after.push(           row  );
    }
//dom_log.log("visible_node_rows_after.:", visible_node_rows_after );

    /*}}}*/
    /* 1/6 ● NONE VISIBLE ..................return -1 {{{*/
    if(   (visible_node_rows_before.length < 1)
       && (visible_node_rows_after .length < 1)
    ) {
      let msg = (backwards ? "▲" : "▼")+" "+(backwards ? "BEFORE" : "AFTER")+" "+(targetNodeIndex+1)+" of "+numRows;

dom_log.log8("⚫⚫⚫⚫ NONE VISIBLE "+ msg);
      return -1;
    }
    /*}}}*/
    /* 2/6 ● NEXT OR PREVIOUS ..............return NEXT_OR_PREVIOUS {{{*/
//  let targetNode = this.query.regexMatchedNodes[ targetNodeIndex ];

    if(   (backwards && visible_node_rows_before.includes( targetNodeIndex ))
       || (             visible_node_rows_after .includes( targetNodeIndex ))
    ) {
      let msg = (backwards ? "▲" : "▼")+" "+("#"+(targetNodeIndex+1))+" from "+numRows+" "+(backwards ? "PREVIOUS" : "NEXT")+" VISIBLE NODE";

HUD_show(msg, 2000);
dom_log.log7("🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 3/6 ● FIRST BEFORE CURRENT ..........return CLOSEST BEFORE CURRENT {{{*/
    if( backwards && visible_node_rows_before.length)
    {
      targetNodeIndex = visible_node_rows_before[0];

      let msg
        = "▲ #"+(targetNodeIndex+1)+" from "+numRows+" VISIBLE NODE BEFORE";

HUD_show(msg, 2000);
dom_log.log7("🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 4/6 ● FIRST  AFTER CURRENT ..........return CLOSEST  AFTER CURRENT {{{*/
    if(!backwards && visible_node_rows_after .length)
    {
      targetNodeIndex = visible_node_rows_after [0];

      let msg
        = "▼ #"+(targetNodeIndex+1)+" from "+numRows+" VISIBLE NODE AFTER" ;

HUD_show(msg, 2000);
dom_log.log7("🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 5/6 ● NONE BEFORE BUT SOME  AFTER ...return    TOP-MOST {{{*/
    if(backwards && visible_node_rows_after .length)
    {
      let  rows_array  = visible_node_rows_after;
      let    top_most  = rows_array[0];
      targetNodeIndex  = rows_array[ top_most ];
      let msg = "▲ "+("#"+(targetNodeIndex+1))+" from "+numRows+" visible top node";

HUD_show(msg, 2000);
dom_log.log7("🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 6/6 ● NONE  AFTER BUT SOME BEFORE ...return BOTTOM-MOST {{{*/
    else if(        visible_node_rows_before.length)
    {
      let  rows_array  = visible_node_rows_before; // ...as there are none after
      let    bot_most  = rows_array[rows_array.length-1];
      targetNodeIndex  = rows_array[ bot_most ];
      let msg = "▼ "+("#"+(targetNodeIndex+1))+" from "+numRows+" visible bottom node";

HUD_show(msg, 2000);
dom_log.log7("🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
  }
  /*}}}*/
  /*.updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV {{{*/
  static updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV(selection, backwards)
  {
//if(selection.rangeCount <= 0) dom_log.logX("selection.rangeCount <= 0)", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
    let activeNodeIndex
      = (selection.rangeCount <= 0)
      ?  0
      :  this.query.regexMatchedNodes.indexOf( selection.anchorNode );
//dom_log.log4("....activeNodeIndex=["+activeNodeIndex+"]");
    /* wrapscan First {{{*/
    let   numRows      = this.query.regexMatchedNodes.length;
    this.wrapscan      = "";
    if(  backwards    && (activeNodeIndex == 0   )) {
      this.wrapscan    = "▲ "+(activeNodeIndex+1)+" of "+numRows+" 🔴 First";

      HUD_show(this.wrapscan, 1000);
dom_log.log8("⚫⚫⚫⚫"+this.wrapscan );
    }
    /*}}}*/
    /* wrapscan Last {{{*/
    else if(!backwards && (activeNodeIndex == (numRows-1))) {
      this.wrapscan    = "▼ "+(activeNodeIndex+1)+" of "+numRows+" 🔴 Last";

      HUD_show(this.wrapscan, 1000);
dom_log.log8("⚪️⚪️⚪️⚪️"+this.wrapscan );
    }
    /*}}}*/
    /* SEEK NEXT OR PREVIOUS {{{*/
    else {
      activeNodeIndex  += (backwards ? -1 : 1);
      activeNodeIndex   = (activeNodeIndex + numRows) % numRows;

      let           msg = (backwards ? "▲ " : "▼ ")+ (activeNodeIndex+1)+" of "+numRows;
      HUD_show(msg, 1000);
if(backwards) dom_log.log5(" ▲ ▲ ▲ ▲ SEEK BEFORE "+ msg);
else          dom_log.log4(" ▼ ▼ ▼ ▼ SEEK AFTER "+ msg);
    }
    /*}}}*/
    return activeNodeIndex;
  }
  /*}}}*/
//}}}

// ┌─────┐
// │ GET │
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
  /* get_wrapscan {{{*/
  static get_wrapscan() {

      return this.wrapscan;
  }
  /*}}}*/
  /* getNextQueryFromRegexMatches {{{*/
  static getNextQueryFromRegexMatches(backwards) {
/*{{{*/
// ┌────────────────────────────────────────────────────────────────┐
// │ C ● FindMode.getNextQueryFromRegexMatches ● CALLED BY getQuery │
// └────────────────────────────────────────────────────────────────┘
//console.clear();
  dom_log.log2("🔴🔴 FindMode.getNextQueryFromRegexMatches(backwards "+backwards+")");
//dom_log.log_caller();
/*}}}*/
    // find()ing an empty query always returns false {{{
    if (!this.query.regexMatches?.length) {
      return "";
    }
    /*}}}*/
    /* start from last user selection {{{*/
//  let [r  , c  ] = this.query.activeRegexIndices;
    let [r  , c  ] = this.query.activeRegexIndices;
    this.updateActiveRegexIndices( backwards );
    /*}}}*/
    const stepSize = 0; // (r != row) ? 0 : (backwards ? -1 : 1);
    let [row, col] = this.query.activeRegexIndices;
/*{{{*/
this.log_visible_regexMatchedNodes();
//dom_log.log("%c...row "+row+"%c .. stepSize "+stepSize
//           , dom_log.lfX[row % 10]
//           , dom_log.lfX[  8     ]);

//dom_log.log8("...[numRows "+numRows+"] [row "+row+"]");


//dom_log.log8("[numRows "+numRows+"] ● [stepSize "+stepSize+"]")
//dom_log.log8(" ● [row "+row+"] ● [col "+col+"]")
/*}}}*/
/* [IWE 251006] TODO: understand how col works] {{{
    let numRows    = this.query.regexMatches.length;
    col += stepSize;
    while(col < 0 || col >= this.query.regexMatches[row].length) {
      if( col < 0) {
        row += numRows - 1;
        row %= numRows;
        col += this.query.regexMatches[row].length;
      } else {
        col -= this.query.regexMatches[row].length;
        row += 1;
        row %= numRows;
      }
    }
}}}*/
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
/*{{{*/
dom_log.logBIG("getQuery(backwards "+backwards+"): ...mostRecentQuery: "+JSON.stringify(mostRecentQuery));
/*}}}*/
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

// ┌──────────┐
// │ EXECUTE  │
// └──────────┘
  /* execute ● CALLED BY findNext and findInPlace {{{*/
  // :options is an optional dict. valid parameters are 'caseSensitive' and 'backwards'.
  static execute(query, options) {
/*{{{*/
// ┌───────────────────────────────────────────────────────────────┐
// │ D ● FindMode.execute        ● CALLED BY findInPlace, findNext │
// └───────────────────────────────────────────────────────────────┘
//console.clear();
  dom_log.log4("🟡🟡🟡🟡 FindMode.execute(query "+(query ? JSON.stringify(query) : query)+")");
//dom_log.log_caller();
/*}}}*/
    let result = null; /* FindMode.getQuery {{{*/
    options = {
      backwards      :  false,
      caseSensitive  : !this.query.ignoreCase,
      colorSelection :  true,
      ...options };
    if( query == null) {
        query = FindMode.getQuery( options.backwards );
    }
  /*}}}*/
    /* removeEventListener selectionchange {{{*/
    if (options.colorSelection) {
      document.body.classList.add("vimium-find-mode");
      // ignore the selectionchange event generated by find()
      document.removeEventListener("selectionchange", this.restoreDefaultSelectionHighlight, true);
    } /*}}}*/
    /* highlight {{{*/
    if (this.query.regexMatches?.length) {
      const [row, col] = this.query.activeRegexIndices;
      const node = this.query.regexMatchedNodes[row];
      const text = node.textContent;
      const matchIndices = getRegexMatchIndices(text, this.query.regexPattern);
      if (matchIndices.length > 0) {
        this.highlight_query(options.backwards);
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
    // We are either (in) normal mode ("n"), or find mode ("/"). We are not in insert mode.
    // Nevertheless, if a previous find landed in an editable element, then that element may still
    // be activated. In this case, we don't want to leave it behind (see #1412).
    if (document.activeElement && DomUtils.isEditable(document.activeElement)) {
      if (!DomUtils.isSelected(document.activeElement)) {
        document.activeElement.blur();
      }
    }
    /*}}}*/
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
    if( FindMode.query.hasResults ) {
      vimium_last_query = FindMode.query.rawQuery;
      storage_add(VIMIUM_QUERY_KEY, FindMode.query.rawQuery);
    }
    return FindMode.saveQuery();
  }
  /*}}}*/
// ┌──────────┐
// │ findNext │
// └──────────┘
  /* findNext ● CALLED BY content_scripts/mode_normal.js(performFind) {{{*/
  static findNext(backwards) {
    // Bail out if we don't have any query text.
//{{{
// ┌───────────────────────────────────────────────────────────────┐
// │ B ● FindMode.findNext ● CALLED BY mode_normal.js(performFind) │
// └───────────────────────────────────────────────────────────────┘
  console.clear();
  dom_log.log1("🟤 FindMode.findNext(backwards "+backwards+")");
//dom_log.log_caller();
/*}}}*/
    const nextQuery = FindMode.getQuery(backwards); /*{{{*/
    if(  !nextQuery ) {
      /*  wrapscan {{{*/
      let wrapscan = FindMode.get_wrapscan();
      if( wrapscan ) HUD.show(wrapscan           , 1000);
      /*}}}*/
      else           HUD.show("No query to find.", 1000);
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
dom_log.logBIG("checkReturnToViewPort: ...BRING INTO VIEW: scrollTo("+this.scrollX+", "+this.scrollY+")");
      globalThis.scrollTo(this.scrollX, this.scrollY);
    }
  }
  /*}}}*/

// ┌───────┐
// │ [IWE] │
// └───────┘
  /*● highlight_query ● CALLED BY execute {{{*/
  static highlight_query(backwards)
  {
    let highlight_why;
    let [row, col] = this.query.activeRegexIndices;
    let       node = this.query.regexMatchedNodes[ row ];
    /* 1/3 ● NODE_COLLAPSED {{{*/
    if(!highlight_why && this.is_node_COLLAPSED( node ))
    {
        highlight_why = NODE_COLLAPSED;

    }
    /*}}}*/
    /* 2/3 ● NODE_OUTOFVIEW {{{*/
    if(!highlight_why && this.is_node_OUTOFVIEW( node ))
    {
        let   row_max = this.query.regexMatchedNodes.length-1;
        let outOfView = backwards ? (row > 0      )
            :                       (row < row_max);

        if( outOfView ) highlight_why = NODE_OUTOFVIEW;
    }
    /*}}}*/
    /* 3/3 ● SELECTION (DEFAULT) {{{*/
    if(!highlight_why)
    {
        highlight_why = NODE_SELECTION;
    }
    /*}}}*/
    if( highlight_why )
        this.highlight_node(node, highlight_why, row);
  }
  /*}}}*/
  /*. highlight_node {{{*/
  /* const {{{*/
  static HIGHLIGHT_DELAY      =  300;
  static HIGHLIGHT_MIN_H      =   10;
  static HIGHLIGHT_MIN_W      =   24;
  static HIGHLIGHT_MAX_H      =  100;
  static HIGHLIGHT_MAX_W      = 1000;

  static HIGHLIGHTNODE_ID     = "VimiumSelection";
  static highlightNode_el;

  static HIGHLIGHT_DURATION   = 2000;
  static highlight_timeout;

  static BLINK_TIMEOUT_DELAY  = 250;
  static blink_timeout;
  /*}}}*/
  static highlight_node(node, why, row)
  {
/*{{{*/
let l_x = (why == NODE_COLLAPSED) ? 1
  :       (why == NODE_OUTOFVIEW) ? 9
  :       (why == NODE_SELECTION) ? 5 : 2;
let dot = dom_log.dot[l_x];
dom_log.log(dot+ dot + dot + dot + dot+"%c highlight_node("+why+")", dom_log.lfX[l_x]);
/*}}}*/
    /* ● INIT highlightNode_el {{{*/
    if( !this.highlightNode_el )
    {
      this   .highlightNode_el    = document.createElement("DIV");
      this   .highlightNode_el.id = FindMode.HIGHLIGHTNODE_ID;

      document.body.appendChild( this.highlightNode_el );
    }
    /*}}}*/
    /*  this.highlight_timeout  {{{*/
    if( this.highlight_timeout ) {
      clearTimeout(this.highlight_timeout);

      this.highlight_timeout = null;
    }
    /*}}}*/
    /* SELECTION VISIBLE {{{*/
    let   rect = node.parentElement.getBoundingClientRect();
    let    w_h = globalThis.innerHeight;
    let     dy = (rect.top    < 0  ) ? rect.top
      :        (rect.bottom > w_h) ? rect.bottom - w_h
      :                              0;
    if(dy) dy += SCROLL_MARGIN * ((dy < 0) ? -1 : 1);
    //}}}*/
    // ┌─────────────────────────────────┐
    // │ ● 1/2 CENTER VIEW ON SELECTION  │
    // └─────────────────────────────────┘
    //{{{
    if(dy && AUTO_CENTER_VIEW_ON_SELECTION) {
      let node_middle = (rect.top + rect.height/2);
      let         top = globalThis.scrollY + node_middle - w_h/2;

dom_log.log(dot+ dot + dot + dot + dot+"%c CENTER VIEW: scrollTo("+top+")", dom_log.lfX[l_x]);
      globalThis.scrollTo({ top, behavior: "smooth" });
      globalThis.addEventListener("scroll",   scroll_listener);
    }
    //}}}
    // ┌─────────────────────────────────┐
    // │ ● 2/2 BRING SELECTION INTO VIEW │
    // └─────────────────────────────────┘
    //{{{
    if(dy && !AUTO_CENTER_VIEW_ON_SELECTION) {
      let w_y = globalThis.scrollY;
      let top = globalThis.scrollY + dy;

dom_log.log(dot+ dot + dot + dot + dot+"%c BRING INTO VIEW: scrollTo("+top+")", dom_log.lfX[l_x]);
      globalThis.scrollTo({ top, behavior: "smooth" });
      globalThis.addEventListener("scroll",   scroll_listener);
//{{{
let sign = (dy < 0) ? "" : "+";
dom_log.log("%c.....scrollY "+w_y+"%c ● "+sign+dy.toFixed(0)+" => "+globalThis.scrollY
            ,dom_log.lfX[l_x]     ,dom_log.lfX[2]                                     );
//}}}
    }
    //}}}
    // ┌──────────────────┐
    // │ highlightNode_el │
    // └──────────────────┘
    /* ● [selection] GEOMETRY {{{*/
    rect     = node.parentElement.getBoundingClientRect();
    let n_y  = rect.top    .toFixed(0);
    let n_x  = rect.left   .toFixed(0);
    let n_w  = rect.width  .toFixed(0);
    let n_h  = rect.height .toFixed(0);

    /*}}}*/
    /* ● BLINK IF: ● SCROLL ● BIG MOVE ●  BLINKING {{{*/
    let blink_required;
    if( node.textContent.length < 50) {
      blink_required
        = (dy                ) ? "SCROLL"
        : (this.blink_timeout) ? "BLINKING"
        :                        undefined;

      /* ALSO BLINK IF: ● BIG MOVE */
      if(!blink_required )
      {
        rect    = this.highlightNode_el.getBoundingClientRect();
        let d_y = Math.abs(rect.top   - n_y).toFixed(0);
        let d_x = Math.abs(rect.left  - n_x).toFixed(0);
        let m_y = (window.innerHeight / 3  ).toFixed(0);
        let m_x = (window.innerWidth  / 3  ).toFixed(0);

        if     (d_y > window.innerHeight/2) blink_required = "MOVE_Y "+d_y+">"+m_y;
        else if(d_x > window.innerWidth /2) blink_required = "MOVE_X "+d_x+">"+m_x;
      }
    }
//dom_log.logBIG("blink_required "+blink_required+"");
    /*}}}*/
    /* ● [highlightNode_el] GEOMETRY {{{*/
// TODO ● highlightNode_el has to cope with smooth scrolling (piggybacked on selection to scroll along with it)
    let e_h  = Math.max(this.HIGHLIGHT_MIN_H , Math.min( this.HIGHLIGHT_MAX_H     , n_h ));
    let e_w  = Math.max(this.HIGHLIGHT_MIN_W , Math.min( this.HIGHLIGHT_MAX_W     , n_w ));
    let e_y  = Math.max(0                    , Math.min( window.innerHeight - e_h , n_y ));
    let e_x  = Math.max(0                    , Math.min( window.innerWidth  - e_w , n_x ));

    let hel   = this.highlightNode_el;
    hel.style.minHeight = (e_h                     )+"px";
    hel.style.minWidth  = (e_w                     )+"px";
    hel.style.top       = (e_y + globalThis.scrollY)+"px";
    hel.style.left      = (e_x + globalThis.scrollX)+"px";

    /*}}}*/
    /* ● TEXT {{{*/
    hel.textContent   = node.textContent;

    let                   style = window.getComputedStyle( node.parentElement );
    hel.style.fontSize   = style.fontSize;
    hel.style.fontWeight = style.fontWeight;
    /*}}}*/
    /* ● STYLE {{{*/
//  hel.style.backgroundColor = (why == NODE_OUTOFVIEW) ? CSS_BG_OUTOFVIEW
//    :                        (why == NODE_COLLAPSED) ? CSS_BG_COLLAPSED
//    :                      /*(why == NODE_SELECTION)*/ CSS_BG_SELECTION;

//  hel.style.border          = (why == NODE_OUTOFVIEW) ? CSS_BORDER_OUTOFVIEW
//    :                        (why == NODE_COLLAPSED) ? CSS_BORDER_COLLAPSED
//    :                      /*(why == NODE_SELECTION)*/ CSS_BORDER_SELECTION;

    hel.className             = (why == NODE_OUTOFVIEW) ? CLASS_OUTOFVIEW
      :                        (why == NODE_COLLAPSED) ? CLASS_COLLAPSED
      :                      /*(why == NODE_SELECTION)*/ CLASS_SELECTION;

    hel.className            += "  bg"+row%10;
    /*}}}*/
    /* ● BLINK ANIMATION .. f(scrolled or postponed blink) {{{*/
    if( blink_required )
    {
dom_log.log(dot+ dot + dot + dot + dot+"%c blink_required: "+blink_required, dom_log.lfX[l_x]+dom_log.lbF);
      if(this.blink_timeout) clearTimeout(      this.blink_timeout );

      this.blink_timeout   =   setTimeout(() => {
        this.blink_timeout = null;
        this.highlightNode_el.classList.add("blink");
      },this.BLINK_TIMEOUT_DELAY);
    }
    /*}}}*/
    /* ● TRAIL ANIMATION {{{*/
    let al = this.highlightNode_el.active_el;
    if( al ) {
      al.classList.add("vimium_active");
      setTimeout(() => al.classList.remove("vimium_active"), 2000);
    }
    this.highlightNode_el.active_el = node.parentElement;

//  setTimeout(() => this.highlightNode_el.style.display = "none",         this.HIGHLIGHT_DELAY     );
//  setTimeout(() => this.highlightNode_el.style.display = "inline-block", this.HIGHLIGHT_DELAY+  50);
//  setTimeout(() => this.highlightNode_el.style.display = "none",         this.HIGHLIGHT_DELAY+  80);
    /*}}}*/
// log XY WH {{{
rect     = hel.getBoundingClientRect();
/**/e_y  = rect.top    .toFixed(0);
/**/e_x  = rect.left   .toFixed(0);
/**/e_w  = rect.width  .toFixed(0);
/**/e_h  = rect.height .toFixed(0);

e_x = ""+e_x; while(e_x.length < 5) e_x = " "+e_x    ;
e_y = ""+e_y; while(e_y.length < 5) e_y =     e_y+" ";
e_w = ""+e_w; while(e_w.length < 5) e_w = " "+e_w    ;
e_h = ""+e_h; while(e_h.length < 5) e_h =     e_h+" ";

n_x = ""+n_x; while(n_x.length < 5) n_x = " "+n_x;
n_y = ""+n_y; while(n_y.length < 5) n_y =     n_y+" ";
n_w = ""+n_w; while(n_w.length < 5) n_w = " "+n_w    ;
n_h = ""+n_h; while(n_h.length < 5) n_h =     n_h+" ";

let lfx  = (n_x == e_x) ? dom_log.lfX[l_x] : dom_log.lfX[2];
let lfy  = (n_y == e_y) ? dom_log.lfX[l_x] : dom_log.lfX[2];
let lfw  = (n_w == e_w) ? dom_log.lfX[l_x] : dom_log.lfX[2];
let lfh  = (n_h == e_h) ? dom_log.lfX[l_x] : dom_log.lfX[2];

dom_log.log("%c.....XY ● WH "  +n_x+" "  +n_y+" ● "  +n_w+" "  +n_h, dom_log.lfX[l_x]);
dom_log.log("%c.....XY ● WH %c"+e_x+" %c"+e_y+"   %c"+e_w+" %c"+e_h
            ,dom_log.lfX[l_x]
            ,               lfx      ,lfy        ,lfw      ,lfh    );

//}}}
    /* highlight_timeout {{{*/
    this.highlightNode_el  .classList.remove("hidden");

    this.highlight_timeout = setTimeout(() => {
      this.highlightNode_el.classList.remove("blink" );
      this.highlightNode_el.classList.add   ("hidden");
    },this.HIGHLIGHT_DURATION);
    /*}}}*/
  }
  /*}}}*/
    /*● outline_activeNode {{{*/
    static outline_activeNode()
    {
      this.highlightNode_el.style.outlineColor   = "red";
      this.highlightNode_el.style.outlineWidth   = "4px";
      this.highlightNode_el.style.transform      = "scale(1.5)";

      setTimeout(() => {
        this.highlightNode_el.style.outlineColor = "";
        this.highlightNode_el.style.outlineWidth = "";
        this.highlightNode_el.style.transform    = "";
      }, 500);
    }
    /*}}}*/
  /*● log_visible_regexMatchedNodes {{{*/
  static CHECK_MAX = 5;
  static log_visible_regexMatchedNodes()
  {
dom_log.log3("...log_visible_regexMatchedNodes");
  this.log_diff_Highlightings_FindMode();
    /* [nodes_array] [sel_row] {{{*/
    let nodes_array = this.query.regexMatchedNodes;
    let     sel_row = this.query.activeRegexIndices[0]; // [row , col]
    /*}}}*/
    /* ● row_min ● row_max {{{*/
    let row_min = Math.max(sel_row - Math.floor(this.CHECK_MAX/2), 0                 );
    let row_max = Math.min(row_min +            this.CHECK_MAX   , nodes_array.length);

    /**/row_min = Math.min(row_min , row_max-this.CHECK_MAX); // do not squeeze at end
    /**/row_min = Math.max(row_min , 0                     ); // .....but not bellow 0
    /*}}}*/
/* ● FIRST {{{*/

if(row_min > 0                 ) dom_log.log("%c 🠉🠉🠉"      , dom_log.lfX[2]);
else                             dom_log.log("%c ─── FIRST", dom_log.lfX[2]);
/*}}}*/
console.group("%c FindMode.updateQuery", dom_log.lfX[nodes_array.length%10]);
/* COLORS ● visible ● outOfView ● collapsed {{{*/

    let l_v = 4; // visible
    let l_o = 8; // outOfView
    let l_c = 7; // collapsed
dom_log.log("\t\t#__\t| HHH_YYY |\t[text] %c [visible] %c [outOfView] %c [collapsed]"
            ,                               dom_log.lfX[l_v]
            ,                                            dom_log.lfX[l_o]
            ,                                                           dom_log.lfX[l_c]);
/*}}}*/
    for(let row = row_min; row < row_max; ++row)
    {
      /* ● node_outOfView ● node_collapsed ● visible {{{*/
      let node = nodes_array[row];

      let node_outOfView = this.is_node_OUTOFVIEW( node );
      let node_collapsed = this.is_node_COLLAPSED( node );

      let l_x =  node_collapsed  ? l_c
        :        node_outOfView  ? l_o
        :                          l_v;

      let dot = dom_log.dot[l_x];
      /*}}}*/
      /* ● num ● Y ● H {{{*/
      let p_h = ""+ this.get_min_parent_height( node ); while(p_h.length < 4) p_h = "_"+p_h;
      let p_y = ""+ node.parentElement.offsetTop      ; while(p_y.length < 3) p_y = p_y+"_";
      let num = ""+row;                                 while(num.length < 2) num = "_"+num;

      /*}}}*/
      /* ● textContent {{{*/
      let  node_textContent
        = (node.textContent.length    < 100)
        ?  node.textContent
        :  node.textContent.substring(0,100);

      /*}}}*/
      /* log {{{*/
      let prefix = (row == sel_row) ? "\u25B6" : "";
      console.log("%c "+prefix+"\t"+dot+"\t#"+num+"\t"+p_h+"_"+p_y+"\t%c["+ node_textContent.replace(/\n/g,"\u293E") +"]"
                  ,dom_log.lfX[l_x]                                  ,dom_log.lfX[l_x]);

/*{{{

if(row == sel_row) console.log(node.parentElement.className, node.parentElement );

if(row == sel_row) {
  for(let el = node.parentElement; el.parentElement; el = el.parentElement) {
    dom_log.log( dom_log.get_node_xpath(el) );
    console.dir( el );
  }
}

}}}*/

      /*}}}*/
    }
/* ● LAST {{{*/
if(row_max < nodes_array.length) dom_log.log("%c 🠋🠋🠋"      , dom_log.lfX[2]);
else                             dom_log.log("%c ─── LAST" , dom_log.lfX[2]);
/*}}}*/

    console.groupEnd();
  }
  /*}}}*/
  /*. log_diff_Highlightings_FindMode {{{*/
  static log_diff_Highlightings_FindMode()
  {
    /* Highlightings */
//  let hnode_array = Array.from( document.getElementsByTagName(Highlightings.HIGHLIGHT_TAG) );
    let hnode_array = Highlightings.get_Matched_TEXT_array();

    /* FindMode */
    let nodes_array = Array.from( this.query.regexMatchedNodes );

    // ┌──────────────────┐
    // │ Highlightings    │
    // └──────────────────┘
    let       h_length = hnode_array.length;
    let l_h = h_length % 10;
    dom_log.log("%c"+ h_length +" MATCHES %c FOR Highlightings.set_Match_pattern ", dom_log.lfX[l_h], dom_log.lfX[5]);

    for(let h=0; h<hnode_array.length; ++h)
    {
      let text_node = hnode_array[h];
      if(!nodes_array.includes( text_node ) )
        dom_log.log("%c...hnode_array["+h+"] = "+dom_log.get_node_xpath(text_node),                   dom_log.lfX[5]);
    }

    // ┌──────────────────────┐
    // │ FindMode nodes_array │
    // └──────────────────────┘
    let       n_length = nodes_array.length;
    let l_n = n_length % 10;
    dom_log.log("%c"+ n_length +" MATCHES %c FOR FindMode.updateQuery"            , dom_log.lfX[l_n], dom_log.lfX[7]);

    for(let n=0; n<nodes_array.length; ++n)
    {
      let text_node = nodes_array[n];
      if( !hnode_array.includes( text_node ) )
        dom_log.log("%c...nodes_array["+n+"] = "+dom_log.get_node_xpath(text_node),                   dom_log.lfX[7]);
    }

  }
  /*}}}*/
  /*.    get_min_parent_height {{{*/
  static get_min_parent_height(el)
  {
    if(el instanceof Node) el = el.parentElement;

    let p_h    = Infinity;
    while(el) {
      let rect = el.getBoundingClientRect();
      if((rect.height > 0) && (rect.height < p_h))
        p_h    = rect.height;
      el       = el.parentElement;
    }
    return p_h === Infinity ? null : p_h;
  }
  /*}}}*/
  /*.    is_node_OUTOFVIEW {{{*/
  static is_node_OUTOFVIEW(node,verbose)
  {
    if(!node.parentElement) return true;

    let   rect =  node.parentElement.getBoundingClientRect();
    let result = (rect.top    > window.innerHeight)
      ||         (rect.bottom <                  0)
      ||         (rect.right  <                  0)
      ||         (rect.left   > window.innerWidth );

if( verbose ) {
  console.dir(node.parentElement);
  console.log(rect);
  dom_log.log8("is_node_OUTOFVIEW: ...return "+result);
}
    return result;
  }
  /*}}}*/
  /*.    is_node_COLLAPSED {{{*/
  static is_node_COLLAPSED(node,verbose)
  {
    /* MIN_VISIBLE_PARENT_HEIGHT */
    let    p_h =  this.get_min_parent_height( node );
    let result = (p_h < MIN_VISIBLE_PARENT_HEIGHT);

if( verbose ) {
  console.dir(node.parentElement);
  console.log ("Parent Min Height = "+p_h);
  dom_log.log8("is_node_COLLAPSED: ...return "+result);
}
    return  result;
  }
  /*}}}*/

}
/*}}}*/
/*➔ FindMode ● restoreDefaultSelectionHighlight {{{*/
FindMode.restoreDefaultSelectionHighlight = forTrusted(() =>
  document.body.classList.remove("vimium-find-mode")
);

/*}}}*/

// ┌──────┐
// │ UTIL │
// └──────┘
/*_ getCurrentRange {{{*/
const getCurrentRange = function()
{
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
const getLinkFromSelection = function()
{
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
const focusFoundLink = function()
{
  if (FindMode.query.hasResults) {
    const link = getLinkFromSelection();
    if (link) {
      link.focus({ preventScroll: true }); /* smooth scroll handled by scroll_listener ...below */
    }
  }
};
/*}}}*/
/*_ selectFoundInputElement {{{*/
const selectFoundInputElement = function()
{
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
const getRegexMatchIndices = function(text, regex)
{
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
// │ highlight │
// └───────────┘
/* highlight ● CALLED BY exec , content_scripts/vimium_frontend.js(focusThisFrame) {{{*/
// Highlights text starting from the given startIndex with the specified length.
const highlight = function(textNode, startIndex, length) {
  if(startIndex === -1) { return false; }
/*{{{
dom_log.log8("highlight(textNode , [startIndex "+startIndex+"] , [length "+length+"])");
console.log(textNode);
dom_log.log_caller();
}}}*/
  /* SET SELECTION {{{*/
  const selection = globalThis.getSelection();
  const     range = document.createRange();
try {
  range.setStart(textNode, startIndex         );
  range.setEnd  (textNode, startIndex + length);
} catch(e) {
dom_log.logX("⚠ ⚠ ⚠ highlight: Exception: "+e.message, dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
dom_log.logX("⚠ ⚠ ⚠ highlight: textNode: "+dom_log.get_node_xpath(textNode), dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
  debugger; /* eslint-disable-line no-debugger */
  return false;
}

  selection.removeAllRanges();
  selection.addRange(range);
  /*}}}*/
  // Ensure the highlighted element is visible within the viewport.
  /* 1/2 AUTO_CENTER_VIEW_ON_SELECTION {{{*/
  if( AUTO_CENTER_VIEW_ON_SELECTION )
  {
    return true;
  }
  /*}}}*/
  /* 2/2 scrollTo {{{*/
  const rect = range.getBoundingClientRect();
  if (rect.top < 0 || rect.bottom > globalThis.innerHeight)
  {
    let  w_h = globalThis.innerHeight;
    let   dy = (rect.top    < 0  ) ? rect.top
      :        (rect.bottom > w_h) ? rect.bottom-w_h
      :                              0;
    if( dy ) {
      dy      += SCROLL_MARGIN * ((dy < 0) ? -1 : 1);
      let top  = globalThis.scrollY + dy;

      /* IF NO SMOOTH SCROLLING MAY BE IN PROGRESS */

dom_log.logBIG("highlight.scrollTo("+top+")");
                          // Scroll instantly when we find a search result. This matches the behavior of Chrome and
                          // Firefox's native search UI. See #4661.
      globalThis.scrollTo({ top, behavior: "smooth" });
      globalThis.addEventListener("scroll",   scroll_listener);
    }
  }
  /*}}}*/
  return true;
};
/*}}}*/
/*_ getBodyTextNodes {{{*/
const getBodyTextNodes = function()
{
    const textNodes = [];
    /*_ getChildrenTextNodes {{{*/
    let getChildrenTextNodes = function(node)
    {
//dom_log.log8("getChildrenTextNodes("+node.tagName+")");
        if(          node.nodeType      === Node.TEXT_NODE)
        {
            textNodes.push(node);
        }
      // [IWE 251001]
//      else if(     node.nodeType      === Node.ELEMENT_NODE
//               && (node.style.display === "contents" || node.checkVisibility())) // [IWE ● HIDES shadow children]
        else if(    Highlightings.isExpandable( node )
                && !FindMode.is_node_COLLAPSED( node )) // [IWE]
        {
            const children = node.childNodes;
            for(const child of children)
                getChildrenTextNodes(child, textNodes);
        }
    };
    /*}}}*/
    getChildrenTextNodes( document.body );
dom_log.log8("getBodyTextNodes: FOUND "+(textNodes.length)+" textNodes");
    return textNodes;
};
/*}}}*/

// ┌────────────┐
// │ globalThis │
// └────────────┘
/*{{{*/
globalThis.PostFindMode     = PostFindMode;
globalThis.FindMode         = FindMode;
globalThis.newPostFindMode  = newPostFindMode; /* called by content_scripts/hud.js.hideFindMode() */
/*}}}*/

// ┌────────────────────────────────────────────────────────────────────────┐
// │ [IWE]                                                                  │
// ├────────────────────────────────────────────────────────────────────────┤
//{{{

// ┌───────────────┐
// │ Highlightings │
// └───────────────┘
/*➔ Highlightings {{{*/
class Highlightings {
  /*{{{*/
  // This class manages the highlighting
  // Logic of this feature is from the extension https://github.com/rogershen/chrome-regex-search

  static DEFAULT_MAX_RESULTS = 500;
  static HIGHLIGHT_TAG       = "VimiumMatch";
  static UNEXPANDABLE        = /(script|style|svg|audio|canvas|figure|video|select|input|textarea)/i;

  static Matched_SPAN_array = [];
  static Matched_TEXT_array = [];
  static Containers_array   = [];
  static ShadowRoot_array   = [];
  static Containers_CSS;
  /*}}}***/
    /*➔ clear {{{*/
    /* Remove all highlights from page */
    static clear() {
dom_log.log4("🟡🟡🟡🟡 Highlightings.clear()");

/*{{{
      for(let i=0;  i < Highlightings.Containers_array.length; ++i)
      {
        let container = Highlightings.Containers_array[  i  ];
        let  el_array = container.getElementsByTagName( Highlightings.HIGHLIGHT_TAG );

        if(el_array.length) {
dom_log.log3(   "....clearing "+el_array.length+" nodes in container "+i+": "+dom_log.get_node_xpath( container )+" "+container.className);
        Array.from(el_array).forEach((el) => { el.outerHTML = el.innerHTML; });
        }
      }
}}}*/
      Highlightings.Matched_SPAN_array .forEach((el) => { if(el.parentNode) el.outerHTML = el.innerHTML; });

      Highlightings.Matched_SPAN_array = [];
      Highlightings.Matched_TEXT_array = [];
    }
    /*}}}*/
    /*➔ set_Match_pattern {{{*/
    static set_Match_pattern( pattern )
    {
dom_log.log3("🟠🟠🟠 Highlightings.set_Match_pattern("+pattern+")");
//dom_log.log_caller();
        /* CLEAR {{{*/
        Highlightings.clear();

        /*}}}*/
        /* highlight_regex_from_node .. f(children ●●● TextNode) {{{*/

      /* Collect all element tree for TEXT_NODE */
        let highlight_regex_from_node = function(node) {
//                   dom_log.log8( dom_log.get_node_xpath(node) );
//if(node.className) dom_log.log8( node.className );
          /* Cap max {{{*/
            if(        Highlightings.Matched_SPAN_array.length >= Highlightings.DEFAULT_MAX_RESULTS)
                return Highlightings.Matched_SPAN_array.length;

          /*}}}*/
          /* SKIP collapsed nodes {{{*/
          if( FindMode.is_node_COLLAPSED( node ) )
              return 0;

          /*}}}*/
          /* 1/2 Collect TEXT node ...return (1 more selection) {{{*/
            if(node.nodeType === Node.TEXT_NODE)
            {
                let index  =        node.data.search( pattern );
                if((index >= 0) && (node.data.length > 0))
                {
                    /*{{{
                     * ┌─────────────────────────────────────┐
                     * │_________________node________________│
                     * │                                     │
                     * │    index ▼           ▼ length       │
                     * │__________|_text_node_|_tail_node____│
                     * │                                     │
                     * │__________|_span_node_|_tail_node____│
                     * └─────────────────────────────────────┘
                    }}}*/
                    let text      =      node.data.match( pattern     )[0];
                    let text_node =      node.splitText ( index       )   ;
                    let tail_node = text_node.splitText ( text.length )   ;
//dom_log.log8("...index=["+ index +"]");
//dom_log.log8("....text=["+ text  +"]");
//dom_log.log8("....text_node=["+ text_node.textContent  +"]");

                    // ┌───────────────────────────────────────────────┐
                    // │ Turn text_node into an matched_node colored HTML │
                    // └───────────────────────────────────────────────┘
                    let matched_node = document.createElement( Highlightings.HIGHLIGHT_TAG );

                    matched_node.appendChild( text_node.cloneNode(true) );
                    text_node.parentNode.replaceChild(matched_node, text_node);

                    Highlightings.Matched_SPAN_array.push( matched_node );

                    return 1;
                }
            }
          /*}}}*/
          /* 2/2 or search subtree ...return (0 more selection) {{{*/
          else if( Highlightings.isExpandable(node) )
          {
            let children = node.childNodes;

            /* shadowRoot nodes */
            if((children.length < 1) && node.shadowRoot)
            {
              children   = node.shadowRoot.childNodes;

              /* shadowRoot highlight css */
              if(children.length && Highlightings.isExpandable( node.shadowRoot.firstElementChild ))
                Highlightings.add_highlight_css( node.shadowRoot.firstElementChild );

            }
            for(let i=0; i < children.length; ++i)
                i += highlight_regex_from_node(  children[i] );

          }
          return 0;
          /*}}}*/
        };
        /*}}}*/
        /* start search from body top element {{{*/
        Highlightings.add_highlight_css( document.body );

        highlight_regex_from_node( document.body );
        /*}}}*/
      /* add color into classList .. f(row) {{{*/
      let      nb = Highlightings.Matched_SPAN_array.length;
      for(let row = 0; row < nb; ++row) {
        let   num =    row+1;
        let  node = Highlightings.Matched_SPAN_array[ row ];
        node.classList.add(     "ecc"+(num  %  10));            // color
        node.setAttribute ("data-num", num+"/"+nb );            // superscript content attr(data-num)
      }
      /*}}}*/
/*{{{*/
let match_count = Highlightings.Matched_SPAN_array.length;
dom_log.log8("...IWE Highlightings FOUND match_count=["+match_count+"]");
/*}}}*/
      return match_count;
    }
    /*}}}*/
//  /*➔ get_Matched_SPAN_array {{{*/
//  static get_Matched_SPAN_array()
//  {
//dom_log.log("Highlightings.get_Matched_SPAN_array: ...return "+Highlightings.Matched_SPAN_array.length+" highlighted nodes");
//
//    return Highlightings.Matched_SPAN_array;
//  }
//  /*}}}*/
  /*➔ get_Matched_TEXT_array {{{*/
  static get_Matched_TEXT_array()
  {
    if(Highlightings.Matched_TEXT_array.length == 0)
    {
      for(let n = 0; n < Highlightings.Matched_SPAN_array.length; ++n)
        Highlightings.Matched_TEXT_array.push( Highlightings.Matched_SPAN_array[n].firstChild );
    }
//dom_log.log("Highlightings.get_Matched_TEXT_array: ...return "+Highlightings.Matched_TEXT_array.length+" highlighted nodes");
    return   Highlightings.Matched_TEXT_array;
  }
  /*}}}*/
  /*➔ get_node_container {{{*/
  static get_node_container(node)
  {
    let container = null;
    for(let i= 0; i < Highlightings.Containers_array.length; ++i)
    {
      let parent = Highlightings.Containers_array[i];
      if( is_el_or_child_of_parent_el(node, parent) )
      {
        container = parent;
        break;
      }
    }
//dom_log.log8("get_node_container( "+node.tagName+"."+node.className+"): ...return "+container.tagName+"."+container.className);
//if(container) console.dir( container );
    return container;
  }
  /*}}}*/
    /*. isTextNode {{{*/
    /* Check if the given node is a text node */
    static isTextNode(node) {
        return node && node.nodeType === Node.TEXT_NODE;
    }
    /*}}}*/
    /*. isExpandable {{{*/
    /* Check if the given node is an expandable node that will yield text nodes */
    static isExpandable(node) {
        return node
            && node.nodeType === Node.ELEMENT_NODE && node.childNodes
            && !Highlightings.UNEXPANDABLE.test(node.tagName) && Highlightings.isNodeVisible( node );
    }
    /*}}}*/
    /*. isNodeVisible {{{*/
    static isNodeVisible = function( element ) {
        return (!window.getComputedStyle(element) || window.getComputedStyle(element).getPropertyValue("display") == "")
            || ( window.getComputedStyle(element).getPropertyValue("display") != "none")
        ;
    };
    /*}}}*/
// ┌───────┐
// │ STYLE │
// └───────┘
    /*. add_highlight_css {{{*/
    static add_highlight_css(container_el)
    {
      if(!Highlightings.Containers_array.includes( container_el ) )
      {
dom_log.log7("add_highlight_css("+container_el.tagName+"."+container_el.className+")");

console.log("container_el");
console.dir( container_el );
        Highlightings.Containers_array.push( container_el            );

console.log("container_el.parentNode");
console.dir( container_el.parentNode );

        if(container_el.parentNode instanceof ShadowRoot)
          Highlightings.ShadowRoot_array.push( container_el.parentNode );

        container_el.appendChild( Highlightings.get_highlight_css().cloneNode( true ) );
      }
    }
    /*}}}*/
    /*. get_highlight_css {{{*/
    static get_highlight_css()
    {
      if(       Highlightings.Containers_CSS )
        return( Highlightings.Containers_CSS );

      let el       = document.createElement("STYLE");
      el.id        = "Containers_CSS";
      el.type      = "text/css";

      el.innerHTML =`
#${FindMode.HIGHLIGHTNODE_ID}                    { z-index         : 2147483647; }
#${FindMode.HIGHLIGHTNODE_ID}                    { position        :   absolute; }
#${FindMode.HIGHLIGHTNODE_ID}                    { border-radius   :      0.4em; }
#${FindMode.HIGHLIGHTNODE_ID}                    { outline-style   :      solid; }
#${FindMode.HIGHLIGHTNODE_ID}                    { outline-offset  :        0px; }
#${FindMode.HIGHLIGHTNODE_ID}                    { outline-width   :        1px; }
#${FindMode.HIGHLIGHTNODE_ID}                    { white-space     :   pre-line; }

#${FindMode.HIGHLIGHTNODE_ID}                    { background-color:       #FFF; }
#${FindMode.HIGHLIGHTNODE_ID}                    {            color:       #000; }

#${FindMode.HIGHLIGHTNODE_ID}.${CLASS_OUTOFVIEW} { outline-style   :     dashed; }
#${FindMode.HIGHLIGHTNODE_ID}.${CLASS_COLLAPSED} { outline-style   :     dotted; }
#${FindMode.HIGHLIGHTNODE_ID}.${CLASS_SELECTION} { outline-style   :      solid; }

#${FindMode.HIGHLIGHTNODE_ID}.hidden {
 animation-duration        :            250ms;
 animation-delay           :              0ms;
 animation-name            : hidden_animation;
 animation-timing-function :          ease-in;
 animation-fill-mode       :             both;
}
@keyframes hidden_animation {
   0% { transform: scale(0.8); }
/*{{{
 100% { transform: scale(0.1); visibility: hidden; }
}}}*/
   0% {   opacity: 0.8; }
 100% {   opacity: 0.0; }
}

 ${Highlightings.HIGHLIGHT_TAG}                  { border-radius   :      0.4em; }
 ${Highlightings.HIGHLIGHT_TAG}                  { outline-style   :      solid; }
 ${Highlightings.HIGHLIGHT_TAG}                  { outline-offset  :        0px; }
 ${Highlightings.HIGHLIGHT_TAG}                  { outline-width   :        2px; }

.ecc0, .bg0  { outline-color : ${dom_log.ecc[9]}; outline-width: 4px; outline-style: double; }
.ecc1, .bg1  { outline-color : ${dom_log.ecc[1]}; }
.ecc2, .bg2  { outline-color : ${dom_log.ecc[2]}; }
.ecc3, .bg3  { outline-color : ${dom_log.ecc[3]}; }
.ecc4, .bg4  { outline-color : ${dom_log.ecc[4]}; }
.ecc5, .bg5  { outline-color : ${dom_log.ecc[5]}; }
.ecc6, .bg6  { outline-color : ${dom_log.ecc[6]}; }
.ecc7, .bg7  { outline-color : ${dom_log.ecc[7]}; }
.ecc8, .bg8  { outline-color : ${dom_log.ecc[8]}; }
.ecc9, .bg9  { outline-color : ${dom_log.ecc[9]}; }

.ecc0        { background:linear-gradient(to bottom, ${dom_log.ecc[9]}80 0%, transparent 30%); }
.ecc1        { background:linear-gradient(to bottom, ${dom_log.ecc[1]}80 0%, transparent 30%); }
.ecc2        { background:linear-gradient(to bottom, ${dom_log.ecc[2]}80 0%, transparent 30%); }
.ecc3        { background:linear-gradient(to bottom, ${dom_log.ecc[3]}80 0%, transparent 30%); }
.ecc4        { background:linear-gradient(to bottom, ${dom_log.ecc[4]}80 0%, transparent 30%); }
.ecc5        { background:linear-gradient(to bottom, ${dom_log.ecc[5]}80 0%, transparent 30%); }
.ecc6        { background:linear-gradient(to bottom, ${dom_log.ecc[6]}80 0%, transparent 30%); }
.ecc7        { background:linear-gradient(to bottom, ${dom_log.ecc[7]}80 0%, transparent 30%); }
.ecc8        { background:linear-gradient(to bottom, ${dom_log.ecc[8]}80 0%, transparent 30%); }
.ecc9        { background:linear-gradient(to bottom, ${dom_log.ecc[9]}80 0%, transparent 30%); }

 ${Highlightings.HIGHLIGHT_TAG}::after { position: absolute; transform: translate(10%,-50%); }
 ${Highlightings.HIGHLIGHT_TAG}::after { font-size: 80%; font-weight: 100; color: #FFF; text-shadow: 1px 1px black; letter-spacing: 0.2em; }

.ecc0::after { content: attr(data-num); /*color : ${dom_log.ecc[9]};*/ }
.ecc1::after { content: attr(data-num); /*color : ${dom_log.ecc[1]};*/ }
.ecc2::after { content: attr(data-num); /*color : ${dom_log.ecc[2]};*/ }
.ecc3::after { content: attr(data-num); /*color : ${dom_log.ecc[3]};*/ }
.ecc4::after { content: attr(data-num); /*color : ${dom_log.ecc[4]};*/ }
.ecc5::after { content: attr(data-num); /*color : ${dom_log.ecc[5]};*/ }
.ecc6::after { content: attr(data-num); /*color : ${dom_log.ecc[6]};*/ }
.ecc7::after { content: attr(data-num); /*color : ${dom_log.ecc[7]};*/ }
.ecc8::after { content: attr(data-num); /*color : ${dom_log.ecc[8]};*/ }
.ecc9::after { content: attr(data-num); /*color : ${dom_log.ecc[9]};*/ }

.vimium_active {
 animation-duration        :           1000ms;
 animation-delay           :              0ms;
 animation-name            : active_animation;
 animation-timing-function :         ease-out;
 animation-fill-mode       :             both;
}
@keyframes active_animation {
   0% { background-color: white; }
 100% { background-color: transparent; }
}

.blink {
 animation-duration        :            250ms;
 animation-delay           :            500ms;
 animation-name            :  blink_animation;
 animation-timing-function :           linear;
 animation-fill-mode       :          forward;
}
@keyframes  blink_animation {
  00% { background-color: white; }
  20% { background-color: black; }
  40% { background-color: white; }
  60% { background-color: black; }
  80% { background-color: white; }
 100% { background-color: transparent; }
}

`;
/*
C:/LOCAL/DATA/DEV/PROJECTS/RTabs/Util/RTabs_Profiles/DEV/stylesheet/dom_tools.css
*/

      Highlightings.Containers_CSS = el;
      return( Highlightings.Containers_CSS );
    }
    /*}}}*/
}
/*}}}*/

  /*_ nodes_are_in_same_document {{{*/
  let nodes_are_in_same_document = function(node1,node2)
  {
    return (node1.getRootNode() === node2.getRootNode());

  };
  /*}}}*/
  /*_ is_el_or_child_of_parent_el {{{*/
  let is_el_or_child_of_parent_el = function(el, parent_el)
  {
      if(!parent_el) return false;

      while(el && (el != parent_el))
          el     = el.parentElement;

      return (el == parent_el);
  };
  /*}}}*/

// ┌────────┐
// │ SCROLL │
// └────────┘
/*{{{*/
const SCROLL_DONE_COOLDOWN =   150;
let   scroll_DONE_timeout;
let   scroll_DONE_last_scrollY;
/*}}}*/
/*    scroll_listener {{{*/
const scroll_listener = function(e)
{
dom_log.log9("scroll_listener");

  if(!scroll_DONE_timeout ) {
    scroll_DONE_timeout = setTimeout( scroll_listener_DONE, SCROLL_DONE_COOLDOWN);
  }
};
/*}}}*/
/*    scroll_listener_DONE {{{*/
const scroll_listener_DONE = function()
{
  scroll_DONE_timeout = null;

  let                   this_scrollY  =          window.scrollY;
  let done_scrolling = (this_scrollY == scroll_DONE_last_scrollY);
  if(!done_scrolling )
  {
    scroll_DONE_last_scrollY = this_scrollY;
    scroll_DONE_timeout      = setTimeout(scroll_listener_DONE, SCROLL_DONE_COOLDOWN);
  }
  else {
    globalThis.removeEventListener("scroll",   scroll_listener);

    globalThis.scrolledTo   = { x: globalThis.scrollX , y: globalThis.scrollY };
dom_log.log9("scroll_listener_DONE: "+scrollY);
  }
};
/*}}}*/
/*_ get_scrolled_by_user {{{*/
let get_scrolled_by_user = function()
{
  let first_since_load = (globalThis.scrolledTo == undefined);
  let while_scrolling  = (scroll_DONE_timeout   != null     );

  /*................................................*/ let scrolled_by_user;     let details;
  if     (first_since_load                             ) { scrolled_by_user =  true; details = "first_since_load"; }
  else if(while_scrolling                              ) { scrolled_by_user = false; details = "while_scrolling" ; }
  else if(globalThis.scrolledTo.x != globalThis.scrollX) { scrolled_by_user =  true; details = "scrollX"         ; }
  else if(globalThis.scrolledTo.y != globalThis.scrollY) { scrolled_by_user =  true; details = "scrollY"         ; }
  else                                                   { scrolled_by_user = false; details = "not scrolled"    ; }

//if( first_since_load )
    globalThis.scrolledTo   = { x: globalThis.scrollX , y: globalThis.scrollY };

if( scrolled_by_user ) dom_log.logX("🟣🟣🟣🟣SCROLLED BY USER     ● "+details, dom_log.lbB+dom_log.lfX[7]);
else                   dom_log.logX("⚫⚫⚫⚫SCROLLED BY FindMode ● "+details, dom_log.lbB+dom_log.lfX[8]);

  return scrolled_by_user;
};
/*}}}*/

// ┌─────────┐
// │ storage │
// └─────────┘
/*_ storage {{{*/
/*_ storage_add {{{*/
/*{{{*/
const VAL_ARRAY_LENGTH_MAX = 10;

/*}}}*/
let storage_add  = function(key,val)
{
dom_log.log7("storage_add("+key+","+val+"):");
  storage_get(key, (items) => {
    /* IF ALREADY STORED ● BRING FROM OLD TO FRONT ...return {{{*/
    let val_array = items[ key ];
    if( val_array && val_array.includes(val) )
    {
      let idx = val_array.indexOf( val );
      val_array.splice(idx,1);
      val_array.push  ( val );

//console.log("...["+val+"] ALREADY STORED ● BRING FROM OLD TO FRONT", val_array);
      storage_set(key,val_array);
      return;
    }
    /*}}}*/
    /* ADD FIRST {{{*/
    if(!val_array ) {
      val_array   = [ val ];
    }
    /*}}}*/
    /* ADD MORE {{{*/
    else {
      /* CAP TO VAL_ARRAY_LENGTH_MAX .. remove oldest {{{*/
      if(val_array.length >= VAL_ARRAY_LENGTH_MAX)
      {
dom_log.log7("...REACHED VAL_ARRAY_LENGTH_MAX ["+val_array.length+" / "+VAL_ARRAY_LENGTH_MAX+"]");

        while(      val_array .length >= VAL_ARRAY_LENGTH_MAX) {
          let old = val_array.splice(0, 1);

dom_log.log7("...DROPPING OLDEST QUERY ["+old+"]");
        }
      }
      /*}}}*/
      val_array.push( val );
    }
    /*}}}*/
    /* STORE {{{*/
    storage_set(key,val_array);

    /*}}}*/
  });
};
/*}}}*/
let storage_set = async function(key,val) {          try { if(val)  await chrome.storage.local.set({ [key] : val }); else chrome.storage.local.remove(key); } catch(ex) { dom_log.log2(ex.message); } dom_log.log7("storage_set("+key+", "+val+")"); };
let storage_get = async function(key, cb) { let val; try {    val = await chrome.storage.local.get(   key  , cb   );                                        } catch(ex) { dom_log.log2(ex.message); } dom_log.log7("storage_get("+key         +")"); };
let storage_del = async function(key    ) {          try {          await                                                 chrome.storage.local.remove(key); } catch(ex) { dom_log.log2(ex.message); } dom_log.log7("storage_del("+key         +")"); };
/*}}}*/

// ┌────────┐
// │ onload │
// └────────┘
/* onload {{{*/
const VIMIUM_QUERY_KEY = "vimium_query";
let   vimium_last_query;
let onload = function()
{
  if(document.readyState != "complete") {
    setTimeout(onload, 200);
    return;
  }
  setTimeout(() => storage_get(VIMIUM_QUERY_KEY, onload_find_last_query), 200);
};

let onload_find_last_query = function(items)
{
  let val_array = items[ VIMIUM_QUERY_KEY ];
  if(!val_array) return;

  val_array.forEach((query) => {
      setTimeout(() => {
        vimium_last_query   = query;
        FindMode.updateQuery( query );
        FindMode.handleEnter(       );  // to call saveQuery
      }, 500);
  });

};
/*}}}*/

// ┌─────┐
// │ HUD │
// └─────┘
  /*● HUD_show {{{*/
/*{{{*/
const MSG_SKIPPING               = "🔴 Skipping #";
const MIN_VISIBLE_PARENT_HEIGHT  = 5;
const SCROLL_MARGIN              = "100";

let hud_text;
let hud_timeout;
let hud_text_postponed_while_skipping;
/*}}}*/
  let HUD_show = function(text, duration)
  {
/*{{{
dom_log.log("HUD_show("+text+")");
}}}*/
    if(     !hud_text               ) hud_text = "";
    else if( hud_text.includes(text)) return;

    /* While Skippinng .. only accept more skipping messages */
    if( hud_text.includes(   MSG_SKIPPING ) ) {
      if(text.startsWith(         MSG_SKIPPING ) ) {
        text = ","+text.substring(MSG_SKIPPING.length);
      }
      else {
        hud_text_postponed_while_skipping = text;
        return;
      }
    }
    /* show only the current NEXT OR PREVIOUS */
    else if( (         text.startsWith("▲") ||          text.startsWith("▼"))
    &&       (hud_text.startsWith("▲") || hud_text.startsWith("▼")))
    {
      hud_text = "";
    }

    if(hud_text.length > 0          ) hud_text += " " +text;
    else                                   hud_text  =      text;

    HUD.show(hud_text, duration);

    if(hud_timeout ) clearTimeout( hud_timeout );
    hud_timeout =   setTimeout(() => {
      hud_text  = "";
      if( hud_text_postponed_while_skipping)
      {
        HUD_show( hud_text_postponed_while_skipping, 1000);
        hud_text_postponed_while_skipping = "";
      }
    }, 1000);

  };
  /*}}}*/

// ┌────────┐
// │ EXPORT │
// └────────┘
/*{{{*/
return { PostFindMode
    ,    FindMode
    ,    newPostFindMode
    ,    onload
  //DEBUG
  , get_min_parent_height : FindMode.get_min_parent_height
};
/*}}}*/
//}}}
// └────────────────────────────────────────────────────────────────────────┘

}());
/*{{{
//globalThis.v = vimium_mode_find;
//dom_log.log4("LOADED: vimium_mode_find");
//dom_log.log_caller();
}}}*/
/*{{{
  if(  !globalThis.addEventListener_LOADED) {
        globalThis.addEventListener("DOMContentLoaded", vimium_mode_find.onload);
        globalThis.addEventListener_LOADED = true;
  dom_log.logBIG( "addEventListener_LOADED=["+globalThis.addEventListener_LOADED+"]");
  }
}}}*/
        globalThis.addEventListener("DOMContentLoaded", vimium_mode_find.onload);

/*{{{
j0"*y$
(\w+ ){2,}message\r
/\(getChildrenTextNodes\|highlight_regex_from_node\) = function

SCROLL LISTENER:
/scroll.*listen.*function\c
:vnew C:/LOCAL/DATA/DEV/PROJECTS/RTabs/Util/RTabs_Profiles/DEV/script/stub/dom_scroll.js

DevTools console):
j^"*y$
  await chrome.storage.local.get("vimium_query", () => console.log("items",items));
j"*y}
    let arr=[1,2,3,4,5, 6,7,8,9,10, 11,12,13,14,15];
    console.log( arr.splice(0, arr.length - 10) );

vim: sw=2
}}}*/
