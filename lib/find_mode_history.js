// ┌───────────────────────────────────────────────────────────────────────────┐
// │ lib/find_mode_history.js ........................... _TAG (251231:22h:36) ●
// └───────────────────────────────────────────────────────────────────────────┘
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console, chrome    */
/* globals setTimeout         */
/* globals dom_log            */
/* globals HUD_msg            */
/* globals Utils              */

/* exported find_mode_history */
/* exported FindModeHistory   */

/* eslint-disable strict */
/* eslint-disable dot-notation */
/* eslint-disable newline-per-chained-call */
/*}}}*/

let find_mode_history = (function() {
"use strict";
  let log_this=false;
/*{{{*/
// This // implements find-mode query history as a list of raw queries, most recent first.
// This is under lib/ since it is used by both content scripts and iframes from pages/.
/*}}}*/
  const FindModeHistory = {
    /* ● storage ● key ● max ● rawQueryList {{{*/
    storage: chrome.storage.local, //  storage: chrome.storage.session,
    key: "findModeRawQueryList",
    max: 50,
    rawQueryList: null,

    queryFilter : null,
    queryFilter_preserved_once : false,

    trashList   : null,
    trashFilter : null,

    /*}}}*/
    /*● init ● onload ● onChanged {{{*/
    async init() {
      /* isIncognitoMode {{{*/
      this.isIncognitoMode = chrome.extension.inIncognitoContext;

      /*}}}*/
      /* onload {{{*/
      if (!this.rawQueryList) {
        if (this.isIncognitoMode) this.key = "findModeRawQueryListIncognito";

        let result = await this.storage.get(this.key);
        if (this.isIncognitoMode) {
          // This is the first incognito tab, so we need to initialize the incognito-mode query
          // history.
          result   = await this.storage.get( "findModeRawQueryList" );
          this.rawQueryList = result.findModeRawQueryList || [];
          this.storage.set({ findModeRawQueryListIncognito: this.rawQueryList });
        } else {
          this.rawQueryList = result[this.key] || [];
        }

        result         = await this.storage.get([this.key+"Trash"]);
        this.trashList =                  result[this.key+"Trash"] || [];
/*{{{*/
if(log_this) {
  dom_log.log("%c"+dom_log.dot[7]+" FindModeHistory.init", dom_log.CS+HISTORY_LFX);
  dom_log.log_array("● Q", this.rawQueryList);
  dom_log.log_array("● T", this.trashList);
}
/*}}}*/
      }
      /*}}}*/
      /* onChanged listener {{{*/
      chrome.storage.onChanged.addListener((changes, _area) => {
if(!changes[this.key] && !changes["queryFilter"]) return; /* FIXME */
/*{{{*/
if(log_this) {
  dom_log.log("%c"+dom_log.dot[7]+" FindModeHistory.onChanged %c storage."+_area     +"%c"+JSON.stringify( Object.keys(changes) ).replace(/[^\w\.:]/g," ")
              ,dom_log.CS+HISTORY_LFX                        ,dom_log.lbH+HISTORY_LFX ,dom_log.lbH+HISTORY_LFX+dom_log.lbB);
  dom_log.log_array("Σ", Object.keys(changes));
}
/*}}}*/
        /* [findModeRawQueryList] .. [this.key] {{{*/
        if(changes[ this.key ]) {
          let { oldValue ,  newValue } = changes[this.key];
          if(   oldValue != newValue ) {
/*{{{*/
if(log_this) {
  dom_log.log_array("▲", oldValue);
  dom_log.log_array("▼", newValue);
}
/*}}}*/
            if( !dom_log.list_equals(this.rawQueryList, changes[this.key].newValue) ) {
              this.rawQueryList = changes[this.key].newValue;
              if(typeof HUD_msg != "undefined")
                HUD_msg.updateQuery();
            }
else if(log_this) dom_log.log7("[rawQueryList] ALREADY UPDATED ● SAME AS changes["+this.key+"]");
          }
        }
        /*}}}*/
        /* [queryFilter] {{{*/
        if(changes["queryFilter"]) {
          let { oldValue ,  newValue } = changes["queryFilter"];
//        if(   oldValue != newValue ) {
/*{{{*/
if(log_this) {
  dom_log.log( "\t%c▲%c"+(oldValue || "[]"), dom_log.lbL+dom_log.lfX[9], dom_log.lbR+dom_log.lfX[(oldValue ? 2:0)]);
  dom_log.log( "\t%c▼%c"+(newValue || "[]"), dom_log.lbL+dom_log.lfX[9], dom_log.lbR+dom_log.lfX[(newValue ? 4:0)]);
}
/*}}}*/

            this.queryFilter = changes["queryFilter"].newValue;
            if(typeof HUD_msg != "undefined")
              HUD_msg.updateQuery( this.queryFilter );
//        }
        }
        /*}}}*/
        /* [historyFirst] {{{*/
        if(changes["historyFirst"]) {
          let { oldValue ,  newValue } = changes["historyFirst"];
//        if(   oldValue != newValue ) {
/*{{{*/
if(log_this) {
  dom_log.log( "\t%c▲%c"+(oldValue || "[]"), dom_log.lbL+dom_log.lfX[9], dom_log.lbR+dom_log.lfX[(oldValue ? 2:0)]);
  dom_log.log( "\t%c▼%c"+(newValue || "[]"), dom_log.lbL+dom_log.lfX[9], dom_log.lbR+dom_log.lfX[(newValue ? 4:0)]);
}
/*}}}*/

            this.historyFirst = changes["historyFirst"].newValue;
//        }
        }
        /*}}}*/
      });
      /*}}}*/
    },

    /*}}}*/
    /*● getQuery {{{*/
    getQuery(index,filter) {
      if(index  == null     )  index = 0;
      if(filter == undefined) filter = this.queryFilter; // fallback to stored queryFilter
      let filteredList
        =  filter
        ?  this.filterQueryList( filter )
        :  this.rawQueryList;
      let query = (filteredList && filteredList[index]) || "";

/*{{{*/
if(log_this) {
  dom_log.log( "%c getQuery"
              +"%c index "  + index
              +"%c"+(filter ? ("filter ["+filter+"]") : "NO FILTER")
              +"%c return"
              +"%c"+dom_log.mPadEnd(dom_log.ellipsis(query,16),19)
              , dom_log.lbL+HISTORY_LFX     // called function
              , dom_log.lbC+dom_log.lfX[9]  // index
              , dom_log.lbR+dom_log.lfX[filter ? 4:8]
              , dom_log.lbL+dom_log.lfX[8]  // return
              , dom_log.lbR+dom_log.lfX[3]);// query

  dom_log.log_array("filteredList", filteredList);
}
/*}}}*/
      return query;
    },

    /*}}}*/
    /* ● saveQuery {{{*/
    async saveQuery(query) {
      if (query.length == 0) return;
  //  if (query ==  "clear") this.rawQueryList = [];
      else                   this.rawQueryList = this.refreshRawQueryList(query, this.rawQueryList);
/*{{{*/
if(log_this) {
  dom_log.log("%c"+dom_log.dot[7]+" FindModeHistory.saveQuery("+query+")", dom_log.CS+HISTORY_LFX);
  dom_log.log_array("", this.rawQueryList);
}
/*}}}*/
      const newSetting = {};
      newSetting[this.key] = this.rawQueryList;
      await this.storage.set( newSetting );

      // If there are any active incognito-mode tabs, then propagate this query to those tabs too.
      if (!this.isIncognitoMode) {
        const result = await this.storage.get("findModeRawQueryListIncognito");
        if (result.findModeRawQueryListIncognito) {
          await this.storage.set({
                                 findModeRawQueryListIncognito: this.refreshRawQueryList(
                                                                                         query,
                                                                                         result.findModeRawQueryListIncognito
                                                                                        )
          });
        }
      }
    },

    /*}}}*/
    /*_ refreshRawQueryList {{{*/
    refreshRawQueryList(query, rawQueryList) {
      return ([query].concat(rawQueryList.filter((q) => q !== query))).slice(0, this.max + 1);
//    return (rawQueryList.filter((q) => q !== query).concat([query])).slice(  -this.max    );
      /*{{{
 ● Remove any existing instances of query and add it to the front.
 ● Cap the result to this.max + 1 items.
 ● Return a new array.
}}}*/
    },

    /*}}}*/
    /* historyFirst ● set ● get {{{*/
    historyFirst : 0,
    async set_historyFirst( first ) {
if(log_this) dom_log.log("FindModeHistory.set_historyFirst: "+            first);
      this.historyFirst = first;
      await this.storage.set({ historyFirst: first });
    },
    get_historyFirst(       ) {
if(log_this) dom_log.log("FindModeHistory.get_historyFirst: "+this.historyFirst);
      return  this.historyFirst;
    },
    /*}}}*/
    // ┌────────────────────────────────────────────────────────────────────────┐
    // │ Find-UI                                                                ●
    // └────────────────────────────────────────────────────────────────────────┘
    /* ● getQueryList                   ● called by lib/find_mode_styling updateQuery to display Find-UI popup list {{{*/
    getQueryList(filter) {
      if(filter == undefined) filter = this.queryFilter; // fallback to stored queryFilter
      let filteredList
        =  filter
        ?  this.filterQueryList( filter , true) // fuzzy
        :  this.rawQueryList;

/*{{{*/
if(log_this) {
  dom_log.log( "%c FindModeHistory.getQueryList %c"+(filter ? filter:"NO FILTER"), dom_log.lbL+HISTORY_LFX, dom_log.lbR+dom_log.lfX[4]);
  dom_log.log_array("", filteredList);
}
/*}}}*/
      return filteredList;
    },

    /*}}}*/
    /*_ filterQueryList {{{*/
    filterQueryList(filter, fuzzy) {
      let      fl = filter.toLowerCase();
/*{{{
//    let      li = this.rawQueryList.filter((q) => {
//      let    ql = q.toLowerCase()
//      return (fuzzy && fl.includes( ql ))
//        ||   (         ql.includes( fl ));
//    });
}}}*/
      let      li = [];
//    for(let   i = this.rawQueryList.length-1; i >= 0                       ; --i)
      for(let   i = 0                         ; i <  this.rawQueryList.length; ++i)
      {
        let     q = this.rawQueryList[i]; // filter backwards
        let    ql = q.toLowerCase()
        if(    (fuzzy && fl.includes( ql ))
           ||  (         ql.includes( fl )))
          li.push( q );
      }
      return   li;
    },

    /*}}}*/
    /* ● clear_queryFilter              ● called by [new FindMode] {{{*/
    clear_queryFilter(_caller) {
/*{{{*/
if( this.queryFilter_preserved_once && log_this) dom_log.logBIG("clear_queryFilter: preserving ["+this.queryFilter+"]");
/*}}}*/
      if( this.queryFilter_preserved_once ) {
//      setTimeout(() => HUD_msg.updateQuery(this.queryFilter, { queryFilter: this.queryFilter }), 2000);
        this.queryFilter_preserved_once = false;
      }
      else {
        this.queryFilter = "";
      }
    },

    /*}}}*/
    /* ● preserve_queryFilter              ● called by [Find_UI_click_listener] {{{*/
    preserve_queryFilter(_caller) {
      this.queryFilter_preserved_once = true;
      return this.queryFilter;
    },

    /*}}}*/
  /* ● delete_pattern_from_queryList    ● called by lib/hud_pop_el_click_listener.js hud_pop_el_click_listener {{{*/
  async delete_pattern_from_queryList(pattern) {
/* log before {{{*/
if(log_this) {
  dom_log.log("%c delete_pattern_from_queryList %c"+pattern, dom_log.lbL+dom_log.lfX[2], dom_log.lbR+dom_log.lfX[2]);
  dom_log.log_array("", this.rawQueryList);
}
/*}}}*/
      /* delete was_matched_list query ● save rawQueryList ● no undo {{{*/
      let idx = this.rawQueryList.indexOf( pattern )
      if( idx >= 0) {
          this.rawQueryList.splice(idx, 1);
        await this.storage.set({ [this.key] : this.rawQueryList });
      }
      /*}}}*/
/* log after {{{*/
if(log_this) {
  dom_log.log("%c delete_pattern_from_queryList %c"+pattern+"%c DONE", dom_log.lbL+dom_log.lfX[2], dom_log.lbC+dom_log.lfX[2], dom_log.lbR+dom_log.lfX[2]);
  dom_log.log_array("✕", this.rawQueryList);
}
/*}}}*/
  },
  /*}}}*/
    /*● trim_queryList                  ● called by pages/hud_page.js handle_DELETE {{{*/
    async trim_queryList(queryFilter) {
      this.queryFilter = queryFilter || this.trashFilter;
/*{{{*/
if(log_this) dom_log.console_clear("trim_queryList");
if(log_this) {
  dom_log.log("%c"+dom_log.dot[2]+" TRIM %c"+this.queryFilter
              ,dom_log.lbH+dom_log.lfX[2]+dom_log.lbB
              ,dom_log.lbH+dom_log.lfX[3]+dom_log.lbB);
  dom_log.log_array("", this.rawQueryList);
}
/*}}}*/
      /* DELETE  MATCHING QUERIES INTO STORED TRASH ● TO SUPPORT UNDO {{{*/

      // ┌───────────────────────────────────────────────────────────────┐
      // │ SPLIT QUERIES LIST into MATCHED-UNMATCHED using CURRENT FILTER
      // │ PUT     MATCHED queries      INTO THE TRASH
      // │ LET   UNMATCHED queries STORED IN THE TRASH
      // │ USE [movedList] to avoid duplicates
      // └───────────────────────────────────────────────────────────────┘
      let old_rawQueryList_length = this.rawQueryList.length;
      let { was_matched_list , not_matched_list } = this.filterSplit(this.queryFilter, this.rawQueryList)
      let     movedList      = was_matched_list.filter((q) => !this.trashList.includes(q));
      this.   trashList      = movedList.concat( this.trashList );  // moved list first (newest)
      this.rawQueryList      = not_matched_list;
      let new_rawQueryList_length = this.rawQueryList.length;

      this.trashFilter       = this.queryFilter;

      let changeCount
        = new_rawQueryList_length
        - old_rawQueryList_length;

      /*}}}*/
/*{{{*/
if(log_this) {
  dom_log.log("%c"+dom_log.dot[2]+" changeCount  %c"+(Math.abs(changeCount)+((changeCount>=0) ? " added":" removed")), dom_log.lbL,dom_log.lbR);
  dom_log.log("%c"+dom_log.dot[2]+" queryFilter  %c"+(this.queryFilter||"empty")                                     , dom_log.lbL,dom_log.lbR);
  dom_log.log("%c"+dom_log.dot[2]+" trashFilter  %c"+(this.trashFilter||"empty")                                     , dom_log.lbL,dom_log.lbR);
  dom_log.log_array("● Q ("+dom_log.mPadStart(this.rawQueryList.length, 3)+")", this.rawQueryList);
  dom_log.log_array("● T ("+dom_log.mPadStart(this.   trashList.length, 3)+")", this.trashList   );
  dom_log.log_array("● ✖ ("+dom_log.mPadStart(        movedList.length, 3)+")",      movedList   );
}
/*}}}*/
      /* storage {{{*/
      await this.storage.set({ [this.key+"Trash"] : this.trashList    }); /* eslint-disable-line no-useless-computed-key */
      await this.storage.set({ [this.key        ] : this.rawQueryList });
      /*}}}*/
      return { changeCount, queryFilter: this.queryFilter };
    },

    /*}}}*/
    /*● undo_queryList                  ● called by pages/hud_page Delete-UNDO {{{*/
    async undo_queryList(queryFilter, as_new_query) {
      this.queryFilter = queryFilter || this.trashFilter;
/*{{{*/
if(log_this) dom_log.console_clear("undo_queryList");
if(log_this) {
  dom_log.log("%c"+dom_log.dot[5]+" UNDO %c"+this.queryFilter+"%c as_new_query "+as_new_query
              ,dom_log.lbH+dom_log.lfX[5]+dom_log.lbB
              ,dom_log.lbH+dom_log.lfX[3]+dom_log.lbB
              ,dom_log.lbH+dom_log.lfX[4]+dom_log.lbB
             );
  dom_log.log_array("", this.rawQueryList);
}
/*}}}*/
      /* RESTORE MATCHING QUERIES FROM STORED TRASH ● SUPPORTING UNDO {{{*/

      // ┌───────────────────────────────────────────────────────────────┐
      // │ SPLIT TRASHED LIST into MATCHED-UNMATCHED using CURRENT FILTER
      // │ GET     MATCHED queries BACK FROM THE TRASH
      // │ LET   UNMATCHED queries STORED IN THE TRASH
      // │ USE [movedList] to avoid duplicates
      // └───────────────────────────────────────────────────────────────┘
      let old_rawQueryList_length = this.rawQueryList.length;
      let { was_matched_list , not_matched_list } = this.filterSplit(this.queryFilter, this.trashList)
      let     movedList      = was_matched_list.filter((q) => !this.rawQueryList.includes(q));
      this.   trashList      = not_matched_list                     ;
      this.rawQueryList      = as_new_query ? movedList.concat( this.rawQueryList )
        :                                                       this.rawQueryList.concat( movedList );
      let new_rawQueryList_length = this.rawQueryList.length;

      let changeCount
        = new_rawQueryList_length
        - old_rawQueryList_length;

      /*}}}*/
/*{{{*/
if(log_this) {
  dom_log.log("%c"+dom_log.dot[5]+" changeCount  %c"+(Math.abs(changeCount)+((changeCount>=0) ? " added":" removed")), dom_log.lbL,dom_log.lbR);
  dom_log.log("%c"+dom_log.dot[5]+" queryFilter  %c"+(this.queryFilter||"empty")                                     , dom_log.lbL,dom_log.lbR);
  dom_log.log("%c"+dom_log.dot[5]+" trashFilter  %c"+(this.trashFilter||"empty")                                     , dom_log.lbL,dom_log.lbR);
  dom_log.log_array("● Q ("+dom_log.mPadStart(this.rawQueryList.length, 3)+")", this.rawQueryList);
  dom_log.log_array("● T ("+dom_log.mPadStart(this.   trashList.length, 3)+")", this.trashList   );
  dom_log.log_array("● ✔ ("+dom_log.mPadStart(        movedList.length, 3)+")",      movedList   );
}
/*}}}*/
      /* storage {{{*/
      await this.storage.set({ [this.key+"Trash"] : this.trashList    }); /* eslint-disable-line no-useless-computed-key */
      await this.storage.set({ [this.key        ] : this.rawQueryList });
      /*}}}*/
      return { changeCount, queryFilter: this.queryFilter };
    },

    /*}}}*/
    /*_ filterSplit {{{*/
    filterSplit(filter, unfilteredList) {

      if(!filter)
        return { was_matched_list: [] , not_matched_list: unfilteredList };

//    let pattern = filter.replace(/\\./g,"");
//    let pattern = Utils.escapeRegexSpecialCharacters( filter );
      let pattern = filter.toLowerCase();

      let was_matched_list = [];
      let not_matched_list = unfilteredList;

      try {
//      was_matched_list   = unfilteredList.filter((q) =>                   q.replace(/\\./g,"").match( pattern ));
//      was_matched_list   = unfilteredList.filter((q) =>  Utils.escapeRegexSpecialCharacters(q).match( pattern ));
        was_matched_list   = unfilteredList.filter((q) =>                   q.toLowerCase()     .match( pattern ));
        not_matched_list   = unfilteredList.filter((q) => !was_matched_list.includes( q ));
      }
      catch(ex) {
if(log_this) console.log(ex);
      }

/*{{{*/
if(log_this) {
dom_log.log("%c filterSplit %c filter %c"+filter+"%c pattern %c"+pattern
           , dom_log.lbL+dom_log.lfX[7]
           ,                dom_log.lbC+dom_log.lfX[7]
           ,                          dom_log.lbR+dom_log.lfX[7]
           ,                                      dom_log.lbL+dom_log.lfX[7]+dom_log.lbB
           ,                                                 dom_log.lbR+dom_log.lfX[7]+dom_log.lbB);
dom_log.log7("● was_matched_list: "+JSON.stringify(was_matched_list)/*.replace(/[^\w\.:]/g," ")*/);
dom_log.log7("● not_matched_list: "+JSON.stringify(not_matched_list)/*.replace(/[^\w\.:]/g," ")*/);
}
/*}}}*/
      return { was_matched_list , not_matched_list };
    }

    /*}}}*/
  };
/* EXPORT FindModeHistory {{{*/
/*● name ● logging {{{*/
let    HISTORY_LFX;
const  name = "FindModeHistory"; FindModeHistory.name = name;   // not defined in [Javascript context Vimium]

FindModeHistory.logging = function(state,onload)
{
  HISTORY_LFX   = dom_log.lfX[7];
  let changed   = (state != undefined) && (log_this != state);
  if( changed   )  log_this  = state;
  if(!onload    )  dom_log.logging({ name, log_this, changed });
  return           log_this;
};
/*}}}*/
globalThis.FindModeHistory = FindModeHistory;
/*}}}*/
}());

/*{{{
vim: sw=2
}}}*/
