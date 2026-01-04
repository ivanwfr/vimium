//┌────────────────────────────────────────────────────────────────────────────┐
//│ dom_log ● log ● log0..log9                                                 ●
//└────────────────────────────────────────────────────────────────────────────┘
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console, chrome   */
/* globals   setTimeout      */
/* globals clearTimeout      */

/* globals FindModeHistory   */
/* globals FindPageStyle     */
/* globals FindPageSync      */
/* globals FindStorage       */
/* globals HUD_msg           */
/* globals Highlightings     */
/* globals vimium_frontend   */
/* globals HUD               */
/* globals mode_find         */

/* exported dom_log */

const DOM_LOG_JS_ID        = "dom_log_js";
const DOM_LOG_JS_TAG       = DOM_LOG_JS_ID  +" (260102:21h:16)";  /* eslint-disable-line no-unused-vars */
/*}}}*/
let dom_log = (function() {
"use strict";


/* SPECIAL_CHAR {{{*/
const LF        = String.fromCharCode(10);
const CS        = "font-size:120%; color: gray; background:black; border:3px solid gray; border-radius:1em; padding:0 1em;";
const SHV       = "\u26A1"; /* ⚡ HIGH VOLTAGE SIGN ⚡*/

/*}}}*/
/* CSS {{{*/
const lf1  = "color:#964B00;";
const lf2  = "color:#FF0000;";
const lf3  = "color:#FFA500;";
const lf4  = "color:#FFDD00;";
const lf5  = "color:#9ACD32;";
const lf6  = "color:#6495ED;";
const lf7  = "color:#EE82EE;";
const lf8  = "color:#707070;";
const lf9  = "color:#C5C5C5; text-shadow:#000 1px 1px 1px;";
const lf0  = "color:#202020; text-shadow:#DDD 1px 1px 1px;";
const lfX  = [      lf0,      lf1,      lf2,      lf3,      lf4,      lf5,      lf6,      lf7,      lf8,      lf9 ];

const DARK = "#111";
const LIGHT= "#DDD";
const ecc  = ["#202020","#964B00","#FF0000","#FFA500","#FFDD00","#9ACD32","#6495ED","#EE82EE","#707070","#C5C5C5" ];
//nst ecc  = [  "BLACK",  "BROWN",    "RED", "ORANGE", "YELLOW",  "GREEN",   "BLUE","MAGENTA",   "GRAY",  "WHITE" ];
const ebg  = [   LIGHT ,   LIGHT ,   LIGHT ,    DARK ,    DARK ,   DARK  ,    DARK ,    DARK ,    DARK ,    DARK  ];

//              0   1    2    3    4    5    6    7    8    9    10  11  12
const dot  = [ "●","🟤","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪️","⚠","✓","✖" ];
//..............1   2    2    2    2    2    2    2    1    1    1   1   1    // byte length

/* eslint-disable no-unused-vars */
const lbH  = "font-weight:900; line-height:1.5em; border:1px solid gray; margin:   0 1ex 1ex   0; padding:0 .5em 0 .5em; border-radius:1em 1em 1em 1em; background:linear-gradient(to bottom, #555 0%, #223 80%, #454 100%);";
const lbL  = "font-weight:900; line-height:1.5em; border:1px solid gray; margin:   0   0   0 1ex; padding:0 .5em 0 .5em; border-radius:1em   0   0 1em; background:linear-gradient(to   left, #333 0%           ,#445 100%);";
const lbR  = "font-weight:900; line-height:1.5em; border:1px solid gray; margin:   0 1ex   0   0; padding:0 .5em 0 .5em; border-radius:  0 1em 1em   0; background:linear-gradient(to  right, #333 0%           ,#544 100%);";
const lbC  = "font-weight:900; line-height:1.5em; border:1px solid gray; margin:   0   0   0   0; padding:0 .5em 0 .5em; border-radius:  0   0   0   0;";

const lbB  = "font-size:150%; font-weight:500;";
const lbF  = "font-size:120%; font-weight:500; border:2px solid white;";
const LBB  = "font-size:300%; font-weight:100;";
let   L_ARD  =         "↓ ";
let   L_ARL  = "        ← "; /* EXPORTED */
let   L_ARR  =         "→ "; /* EXPORTED */
let   L_ARU  =         "↑ ";
/* eslint-enable  no-unused-vars */

/*}}}*/

/*{{{*/
const CONSOLE_CLEAR_COOLDOWN_DELAY = 1000;

let console_clear_cooldown_timeout;
let console_clear_last_msg;

const FRAMES = [ "TOP" , "IFRAME" ];
let preserve_state = false;
let in_top_frame;
let frame_name;
/*}}}*/
/*➔ console_clear {{{*/
let console_clear      = function(msg=null) { console_clear_post( msg ); };
let console_clear_post = function(msg=null)
{
    msg = SHV+mPadEnd(msg,50)+SHV;

    /* ON COOLDOWN {{{*/
    if(console_clear_cooldown_timeout && (msg != console_clear_last_msg)) { // allow same caller burst
        console_clear_last_msg = msg;
    }
    /*}}}*/
    /* CLEAR {{{*/
    else {
        console_clear_last_msg = msg;
        console.clear();
        if( msg )
            console.log("%c cleared by "+msg, CS);
        else
            console.trace();
    }
    if(console_clear_cooldown_timeout) clearTimeout( console_clear_cooldown_timeout );
    console_clear_cooldown_timeout
        = setTimeout( function() { console_clear_cooldown_timeout = null; } , CONSOLE_CLEAR_COOLDOWN_DELAY);
    /*}}}*/
    trace_msg( msg );
};
/*}}}*/
/*➔ sleep {{{*/
let sleep = async function(delay,_caller)
{
log("%c"+dot[6]+"%c SLEEPING "+delay+"ms %c "+_caller, lbB+lf6, lbH+lf6, lbH);

    await new Promise(function executor(resolve)
                      {
                          setTimeout(() => resolve(log("resolve: sleep "+delay+" DONE") ), delay);
                      });

/*{{{*/
log("sleep DONE");
/*}}}*/
};
/*}}}*/

/*➔ log0..log9 ● logBIG ● log_key_val {{{*/
/*{{{*/
const      LEN_BIG =  80;
const      LEN_MAX = 256;
const       INDENT = "\t\t\t\t\t\t\t\t\t\t";

let   indent_level = 0;
/*}}}*/
let logBIG            = (msg)    => log("%c"+msg, lbB);
let log_key_val       = (name,o) => { console.log(name+":"); console.dir(o); };
let log_key_val_group = log_key_val;

/*➔ log {{{*/
let log = function(msg, ...args)
{
//console.trace();
    console.log(msg, ...args);

    trace_msg( msg );
};
/*}}}*/
/* logX {{{*/
let logX = (msg,l_x) => {

    let this_level = -1;

    let              prefix2 = msg.substring(0,2);
    if(dot.includes( prefix2 ))
        for(      this_level = 0; msg.startsWith(prefix2); ++this_level)  prefix2 += msg.substring(0,2);

    let              prefix1 = msg.substring(0,1);
    if(dot.includes( prefix1 ) || (prefix1 == "."))
        for(      this_level = 0; msg.startsWith(prefix1); ++this_level)  prefix1 += msg.substring(0,1);

    if(this_level >= 0)
        indent_level  = this_level;

    let css
        = (typeof l_x == "number") ? lbH+lfX[l_x]
        : (typeof l_x == "string") ?         l_x
        :                              undefined;

    msg = msg.replace(/\n/g,"\u21B2");

    if(!msg.includes(LF) && !msg.includes(SYMBOL_DOWN_LEFT_ARROW))// ↲⌴
        msg = ellipsis(msg, LEN_BIG);
    else
        msg = ellipsis(msg, LEN_MAX);

    if( css )
        console.log(INDENT.substring(0,indent_level)+" %c"+msg, css);
    else
        console.log(INDENT.substring(0,indent_level)      +msg     );

    if(!trace_mutex && trace_regex && msg && msg.match(trace_regex)) {
        console.log("%c TRACE 🟤🔴🟠🟡🟢🔵🟣⚫⚪️ %c"+trace_regex,lbB+lbL+lf0,lbB+lbR+lf6);
        log_caller();
    }
};
/*}}}*/

let log0 = (msg)      =>        logX(    msg, 0  );
let log1 = (msg)      =>        logX(    msg, 1  );
let log2 = (msg)      =>        logX(    msg, 2  );
let log3 = (msg)      =>        logX(    msg, 3  );
let log4 = (msg)      =>        logX(    msg, 4  );
let log5 = (msg)      =>        logX(    msg, 5  );
let log6 = (msg)      =>        logX(    msg, 6  );
let log7 = (msg)      =>        logX(    msg, 7  );
let log8 = (msg)      =>        logX(    msg, 8  );
let log9 = (msg)      =>        logX(    msg, 9  );

/*}}}*/
/*➔ trace {{{*/
let trace_regex;
let trace_mutex;

let trace = function(pattern)
{
    if(pattern != undefined) {
        trace_regex = pattern ? new RegExp(pattern) /* SET   */
            :                   null;               /* CLEAR */

        if(trace_regex) chrome.storage.local.set({   trace_pattern  : pattern });
        else            chrome.storage.local.remove("trace_pattern");
    }

    trace_mutex =  true;
    log("%c TRACE %c"+(pattern || (trace_regex && trace_regex.source))+"%c"+trace_regex, lbH+lf6 ,lbL+lf3,lbR+lf4);
    trace_mutex = false;
};

let trace_onLoad = async function()
{
    let   items = await chrome.storage.local.get("trace_pattern");
    let pattern = items.trace_pattern;
    if( pattern ) trace( pattern );
};
/*}}}*/
/*_ trace_msg {{{*/
let trace_msg = function( msg )
{
    /*┌──────────────────────────────────────────────────────────────────────┐*/
    /*│ trace_regex has been set by calling dom_log.trace( pattern )         │*/
    /*└──────────────────────────────────────────────────────────────────────┘*/
    if(trace_regex && !trace_mutex && msg && msg.match(trace_regex)) {
        console.log("%c TRACE 🟤🔴🟠🟡🟢🔵🟣⚫⚪️ %c"+trace_regex,lbB+lbL+lf0,lbB+lbR+lf6);
        log_caller();
    }
};
/*}}}*/

/*➔ log_caller {{{*/
let log_caller = function(level_max)
{
    let stack_trace = get_callers( level_max );

    if( stack_trace.includes(LF) ) console.log("%c"+stack_trace.replace(LF,"%c"+LF), lbH+lf6, lf8);
    else                         { console.log("%c"+stack_trace                    , lf6+lbF     ); console.trace(); }
};
let get_callers = function(level_max)
{
    let xx, ex_stack;
    try {   xx.raise(); } catch(ex) { ex_stack = parse_ex_stack_FUNC_FILE_LINE_COL(ex.stack, level_max); }
    return  ex_stack.trim();
};
/*}}}*/
/*_ parse_ex_stack_FUNC_FILE_LINE_COL {{{*/
/*{{{
ReferenceError: exception is not defined
    at XXX1 (file:///.../XXX5.js:12558:38)
    at XXX2 (file:///.../XXX5.js:12497:5)
    at XXX3 (file:///.../XXX5.js:13273:5)
    at XXX4 (file:///.../XXX5.js:2697:5)

/\v\s*at\s*(\S+)\s+\((.+):(\d+):(\d+)
/\v\s*at\s*\zs(\S+)\ze\s+\((.+):(\d+):(\d+)
/\v\s*at\s*(\S+)\s+\(\zs(.+)\ze:(\d+):(\d+)
/\v\s*at\s*(\S+)\s+\((.+):\zs(\d+)\ze:(\d+)
/\v\s*at\s*(\S+)\s+\((.+):(\d+):\zs(\d+)\ze
}}}*/
/*.....................................................func.........file...............line....col..........*/

let parse_ex_stack_FUNC_FILE_LINE_COL = function(text, level_max=10)
{
    let  result = "";
    let   lines = text.split(LF);
    let     sym = L_ARL;
    let line_match;
    for(let i=3; i<=(3+level_max); ++i) /* skip log_caller and get_callers */
    {
        if( line_match = get_ex_stack_line_match(lines[i]) )
            result    += (result ? LF : "") + sym+" "+line_match;
        sym = L_ARU; /* past first line arrow */
    }

    if( !result.includes(LF) ) result += LF + sym +" ... (async)";

    return result.replace(/^.*\blog\w*\b.*\n/gm,"");
};
/*}}}*/
/*_ get_ex_stack_line_match {{{*/
/*................................................at    (FILE__).....\( FILE_PATH____).(\......(LINE ).(COL  )*/
const regexp_FUNC_FILE_LINE_COL = new RegExp("\\s*at\\s*([^\\(]+)\\s+\\((?:[^\\/]*\\/)*(\..+?):(\\d+?):(\\d+?)");
/*{{{
const regexp_FUNC_FILE_LINE_COL = new RegExp("\\s*at\\s*([^\\(]+)\\s+\\(([^\\/]*\\/)*(\\w+\\.\\w*):(\\d+):(\\d+)");
}}}*/

let get_ex_stack_line_match = function(ex_stack_line)
{
    let matches = regexp_FUNC_FILE_LINE_COL.exec(ex_stack_line);

    if(!matches ) return "";

    let func = matches[1].replace("Object.","");
    let file = matches[2];
    let line = matches[3];
    let col  = matches[4];
    let match= mPadStart(func, 48)+".. "+file+" "+line+":"+col;

/*{{{
log(ex_stack_line);
log("...... matches[1]=["+matches[1]+"]");
log("...... matches[2]=["+matches[2]+"]");
log("...... matches[3]=["+matches[3]+"]");
log("...... matches[4]=["+matches[4]+"]");
log("...... matches[5]=["+matches[5]+"]");
log("...... matches[6]=["+matches[6]+"]");
log("..match..........=["+match     +"]");
}}}*/
    return match;
};
/*}}}*/
/*_ mPadStart .. mPadEnd {{{*/
/* eslint-disable      no-unused-vars */
let mPadStart = function(s,l,c=" ") { s = String(s); while(s.length < l) s = c+s; return s; };

let mPadEnd   = function(s,l,c=" ") { s = String(s); while(s.length < l) s = s+c; return s; };
/* eslint-enable       no-unused-vars */
/*}}}*/
/*_ ellipsis {{{*/
/*{{{*/
const HORIZONTAL_ELLLIPSIS = "\u2026";
const ELLIPSIS_DEFAULT_LEN = 96;
/*}}}*/
let ellipsis = function(_msg, len=ELLIPSIS_DEFAULT_LEN)
{
    let msg = show_CR_LF( String(_msg) );
    return (msg.length    <= len)
        ?   msg
        :   msg.substring(0, len-3)+HORIZONTAL_ELLLIPSIS
    ;
};
/*}}}*/
/*_ show_CR_LF {{{*/
/*{{{*/
const regexp_CR                 = new RegExp("\\r"                          , "g");
const regexp_LF                 = new RegExp("\\n"                          , "g");
const regexp_SPACE              = new RegExp("^ +| +$"                      , "g");
const SYMBOL_DOWN_LEFT_ARROW    = "\u21B5";
const SYMBOL_RETURN             = "\u23CE";
const SYMBOL_COUNTER_BORE       = "\u2334";
const SYMBOL_KEYBOARD_SPACE     = "\u2423";
/*}}}*/
let show_CR_LF = function(text)
{
    return text
        .   replace(regexp_CR   , "")
        .   replace(regexp_LF   , SYMBOL_RETURN         )
        .   replace(regexp_SPACE, SYMBOL_COUNTER_BORE   )
//      .   trim()
    ;
};
/*}}}*/

// ┌──────────────────┐
// │ DOM PARENT CHILD ●
// └──────────────────┘
/*➔ is_el_child_of_id {{{*/
let is_el_child_of_id = function(el, id)
{
    while(el && (el.id != id) && (el = el.parentElement)) /* eslint-disable-line no-param-reassign */
        ;
    return (el != null);
};
/*}}}*/
/*➔ is_el_child_of_class {{{*/
let is_el_child_of_class = function(el, className)
{
    while(el && el.classList && !el.classList.contains( className ) && (el = el.parentElement))
        ;
    return (el != null);
};
/*}}}*/
/*➔ get_node_xpath {{{*/
let get_node_xpath = function(node)
{
    if(node ==         window  ) return "window";
    if(node instanceof Document) return "window.document";

    let  node_type_pos_array;
    for( node_type_pos_array = []
    ;    node && !(node instanceof Document)
    ;    node =   (node.nodeType == Node.ATTRIBUTE_NODE)
              ?    node.ownerElement
              :    node.parentNode
    ) {
        let node_type_pos = {};

        /* TYPE */
        switch( node.nodeType ) {
            case Node.TEXT_NODE                   : node_type_pos.name =                   "text"; break;
            case Node.ATTRIBUTE_NODE              : node_type_pos.name =      "@" + node.nodeName; break;
            case Node.PROCESSING_INSTRUCTION_NODE : node_type_pos.name = "processing-instruction"; break;
            case Node.COMMENT_NODE                : node_type_pos.name =                "comment"; break;
            case Node.ELEMENT_NODE                : node_type_pos.name =            node.nodeName; break;
        }

        /* POS */
        node_type_pos.position = get_sibling_rank( node );

        node_type_pos_array.push( node_type_pos );
    }

    let xpath = "";
    for(let i=node_type_pos_array.length-1; i >= 0; i -= 1)
    {
        let node_type_pos   = node_type_pos_array[i];
        xpath += node_type_pos.name ? ("/"+node_type_pos.name) : ".";
        if((node_type_pos.position != null) && (node_type_pos.position != "1"))
            xpath += "["+ node_type_pos.position+"]";
    }

    xpath = xpath.toLowerCase();

//  if( xpath_base && xpath.startsWith( xpath_base ))
//      xpath =        xpath.substring( xpath_base.length+1 );

    return xpath;
};
/*}}}*/
/*➔ get_nodeXPath_target {{{*/
let get_nodeXPath_target = function(nodeXPath)
{
    let first_node;
    try {

        let evaluator  = new XPathEvaluator();
        let expression = evaluator.createExpression(nodeXPath);

        let result     = expression.evaluate(document, XPathResult.ORDERED_NODE_ITERATOR_TYPE);

        let node;
        while(node = result.iterateNext())
        {
            if(!first_node)
                first_node = node;
        }

    }
    catch(ex) {
        console.log(ex);
    }
    return first_node;
};
/*}}}*/
/*_ get_sibling_rank {{{*/
let get_sibling_rank = function(node)
{
    if(node.nodeType == Node.ATTRIBUTE_NODE) return null;

    let rank = 1;
    for(let prev_node =      node.previousElementSibling
    ;       prev_node
    ;       prev_node = prev_node.previousElementSibling
    ) {
        if(prev_node.nodeName == node.nodeName)
            rank += 1;
    }
    return rank;
 };
/*}}}*/

/*_ log_array {{{*/
/*{{{*/
const LOG_ARRAY_IDX_MAX = 6;

/*}}}*/
let log_array = function(name, array, max=LOG_ARRAY_IDX_MAX)
{
    let     txt = name ? "\t%c"+name : "\t";
    let     css = name ?        [CS] : []  ;
    let     end = Math.min(max, array.length);
    for(let idx = 1; idx <= end; ++idx)
    {
        // partial log ● add an ellipsis and the last entry
        if((idx == end) && (end < array.length)) {
            txt    += "%c...";
            css.push(lfX[8]) ;
            idx = array.length;
        }
        txt    += "%c"+   idx +"%c"+array[idx-1];
        css.push( lbL+lfX[idx % 10]                     );
        css.push( lbR+lfX[idx % 10]+"background: black;");
    }
    log(txt, ...css);
};
/*}}}*/

/* MODULES_NAMES {{{*/
const MODULES_NAMES
    = [
// content_scripts/mode_find.js
        "mode_find"

// lib/find_mode_styling.js
    ,   "FindPageStyle"
    ,   "Highlightings"
    ,   "NodeMatcher"
    ,   "FindStorage"
    ,   "FindPageSync"
    ,   "HUD_msg"

// lib/find_mode_history.js
    ,   "FindModeHistory"

// pages/hud_page.js
    ,   "HUD"
    ,   "hud_page"

// lib/find_mode_dom_tree.js
    ,   "FindTreeWalker"

// content_scripts/vimium_frontend.js
    ,   "vimium_frontend"

];
const LOGGING_MODULES = (() => { let array=[]; MODULES_NAMES.filter((name) => { if(globalThis[name]) array.push( globalThis[name] ); }); return array; })();

let context_modules;
let missing_modules;
/*}}}*/
/*➔ log_modules ● Devtools Javascript context {{{*/
let log_modules = function()
{
    log("%c MODULES", CS)
        if(!context_modules) {
            context_modules = [];
            missing_modules = [];
            MODULES_NAMES.forEach((name) => {
                if(globalThis[name]) context_modules.push( name );
                else                 missing_modules.push( name );
            });

            in_top_frame   = (LOGGING_MODULES.length > 2);
            frame_name     = FRAMES[in_top_frame ? 0:1]
        }

log_array("✔", context_modules, 99);
log_array("?", missing_modules, 99);
};
/*}}}*/
/*➔ logging (alias ll in Devtools) {{{*/
let logging = function(args)
{
//console.log("LOGGING_MODULES");
//console.dir( LOGGING_MODULES );
//console.log("typeof args: "+ typeof args);//FIXME

    //┌─────────────────────────┐
    //│ CHANGE ONE MODULE STATE ●
    //└─────────────────────────┘
    if(typeof args == "object") {
        /* log logging state */
        let { name , log_this , changed } = args;
        log("%c"+mPadStart(name, 20) +": log_this = "+log_this+(changed ? " changed":""), dom_log.lfX[log_this ? 5:8]);
        /* store changed state */
        if( changed ) {
            let key = name+".log_this";
            if( log_this ) chrome.storage.local.set   ({ [key]: log_this });
            else           chrome.storage.local.remove(   key             );
        }
    }
    //┌─────────────────────────┐
    //│ QUERY  ALL MODULE STATE ●
    //└─────────────────────────┘
    else if(typeof args == "undefined") {
        LOGGING_MODULES.forEach((o) => { if( o ) o.logging(    ); });
    }
    //┌─────────────────────────┐
    //│ CHANGE ALL MODULE STATE ●
    //└─────────────────────────┘
    else {
        LOGGING_MODULES.forEach((o) => { if( o ) o.logging(args); });
    }
};
/*}}}*/
/*_ logging_onLoad {{{*/
let logging_onLoad = function()
{
    log_modules();

    let onload = true;
    LOGGING_MODULES.forEach(async (o) => {
        if( o ) {
            let key = o.name+".log_this";
            await chrome.storage.local.get(key, (items) => o.logging(items[key], onload) );
        }
    });

    trace_onLoad();
};
/*}}}*/

// ┌───────┐
// │ EVENT ●
// └───────┘
/*_ preventDefault {{{*/
let preventDefault = function(e)
{
/* NOTE: {{{
 *  [e.stopPropagation         ()] .. stop bubbling phase #3 handlers
 *  [e.stopImmediatePropagation()] .. stop   target phase #2 handlers
 *  [e.preventDefault          ()] .. i.e. return false from within on<event> attribute handler
 *
 *  [e.cancelBubble]               .. depreciated .. (may not reach [outer body])
 *  [e.returnValue]                .. depreciated
 }}}*/
    if(e.cancelable) {
        if( e.stopPropagation          ) e.stopPropagation         (); /* capturing and bubbling phases */
        if( e.stopImmediatePropagation ) e.stopImmediatePropagation(); /* other listeners of the same event */
        if( e.preventDefault           ) e.preventDefault          (); /* browser agent default .. (checkbox toggle) */
    }
};
/*}}}*/

// ┌──────┐
// │ UTIL ●
// └──────┘
/*_ list_equals {{{*/
let list_equals = function(l1,l2)
{
    if(!l1        || !l2       )
        return false;

    if( l1.length !=  l2.length)
        return false;

    for(let i=0; i<l1.length; ++i)
        if(l1[i] != l2[i])
            return false;

    return true
};
/*}}}*/

/* EXPORT */
/*{{{*/
        return { name : "dom_log"
            , LF
            , CS

            , logging_onLoad , llo : logging_onLoad
            , logging        , ll  : logging

            /* MODULES */
            , log_modules
            , context_modules: () => context_modules
            , missing_modules: () => missing_modules

            /* CONSOLE */
            , console_clear
            , trace

            , log_array
            , log
            , log0
            , log1
            , log2
            , log3
            , log4
            , log5
            , log6
            , log7
            , log8
            , log9
            , logX

            , lbH
            , lbL
            , lbR
            , lbC
            , lbB
            , lbF
            , lfX

            , ecc
            , ebg

            , dot

            , logBIG
            , log_key_val
            , log_key_val_group

            , get_callers
            , log_caller

            , is_el_child_of_id
            , is_el_child_of_class
            , get_node_xpath
            , get_nodeXPath_target

            , mPadStart
            , mPadEnd
            , ellipsis
            , show_CR_LF

            , preventDefault
            , list_equals
        };

/*}}}*/

}());
globalThis.dom_log  = dom_log;

/*{{{
"┌─────────────────────────────────────────────────────────────────────────────┐
"│                                                                             ●
:e  $BROWSEEXT/SplitterExtension/manifest.json

:e  $BROWSEEXT/SplitterExtension/javascript/background.js
:e  $BROWSEEXT/SplitterExtension/javascript/content.js
:e             $RPROFILES/script/dom_sentence.js
:e             $RPROFILES/script/stub/dom_tools.js
:e             $RPROFILES/script/stub/dom_scroll.js
:e             $RPROFILES/script/stub/dom_util.js
"...           $RPROFILES/script/stub/dom_log.js
:e             $RPROFILES/stylesheet/dom_host.css

:e             $RPROFILES/script/dom_select.js
:e             $RPROFILES/script/dom_util.js
:e             $RPROFILES/script/dom_log.js

:e             $RPROFILES/script/splitter.js
:e             $RPROFILES/script/dom_load.js
"│                                                                             ●
"└─────────────────────────────────────────────────────────────────────────────┘
}}}*/
