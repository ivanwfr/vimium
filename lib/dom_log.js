/*┌──────────────────────────────────────────────────────────────────────────┐*/
/*│ dom_log [dir log log<0-9>]                                               │*/
/*└──────────────────────────────────────────────────────────────────────────┘*/
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console */

/* exported dom_log */

const DOM_LOG_JS_ID        = "dom_log_js";
const DOM_LOG_JS_TAG       = DOM_LOG_JS_ID  +" (250925:02h:39)";  /* eslint-disable-line no-unused-vars */
/*}}}*/
let dom_log = (function() {
"use strict";


/* SPECIAL_CHAR {{{*/
const LF        = String.fromCharCode(10);

/*}}}*/
/* CSS {{{*/
const lf1  = "color:#964B00;";
const lf2  = "color:#FF0000;";
const lf3  = "color:#FFA500;";
const lf4  = "color:#FFFF00;";
const lf5  = "color:#9ACD32;";
const lf6  = "color:#6495ED;";
const lf7  = "color:#EE82EE;";
const lf8  = "color:#A0A0A0;";
const lf9  = "color:#FFF; text-shadow:#000 1px 1px 1px;";
const lf0  = "color:#000; text-shadow:#DDD 1px 1px 1px;";
const lfX  = [      lf0,      lf1,      lf2,      lf3,      lf4,      lf5,      lf6,      lf7,      lf8,      lf9 ];

const DARK = "#111";
const LIGHT= "#DDD";
const ecc  = ["#000000","#964B00","#FF0000","#FFA500","#FFFF00","#9ACD32","#6495ED","#EE82EE","#A0A0A0","#F0F0F0" ];
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
let   L_ARD  =         "↓ ";
let   L_ARL  = "        ← "; /* EXPORTED */
let   L_ARR  =         "→ "; /* EXPORTED */
let   L_ARU  =         "↑ ";
/* eslint-enable  no-unused-vars */

/*}}}*/

/* console {{{*/

let dir               = console.dir;
let log               = console.log;
let console_clear     = function(msg=null) { console.clear(); if(msg) console.log ("%c.. by "+msg,"color:#666; background:#111; border:0px solid #445; border-radius:1em;"); };

let logBIG            = (msg)    => log("%c"+msg, lbB);
let log_key_val       = (name,o) => { console.log(name+":"); console.dir(o); };
let log_key_val_group = log_key_val;

/* logX {{{*/
const INDENT = "\t\t\t\t\t\t\t\t\t\t";
let indent_level = 0;
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
    if( css )
        console.log(INDENT.substring(0,indent_level)+" %c"+msg, css);
    else
        console.log(INDENT.substring(0,indent_level)      +msg     );
};
/*}}}*/

let log0 = (msg)     =>         logX(    msg, 0  );
let log1 = (msg)     =>         logX(    msg, 1  );
let log2 = (msg)     =>         logX(    msg, 2  );
let log3 = (msg)     =>         logX(    msg, 3  );
let log4 = (msg)     =>         logX(    msg, 4  );
let log5 = (msg)     =>         logX(    msg, 5  );
let log6 = (msg)     =>         logX(    msg, 6  );
let log7 = (msg)     =>         logX(    msg, 7  );
let log8 = (msg)     =>         logX(    msg, 8  );
let log9 = (msg)     =>         logX(    msg, 9  );

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

    return result;
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

/*➔ get_sibling_rank {{{*/
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
/* EXPORT */
/*{{{*/
        return { name : "dom_log"
            , LF
            , console_clear
            , dir

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

            , get_node_xpath
        };

/*}}}*/

}());
globalThis.dom_log = dom_log;
//dom_log.log8("LOADED: dom_log");

/*{{{
"┌─────────────────────────────────────────────────────────────────────────────┐
"│                                                                             │
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
"│                                                                             │
"└─────────────────────────────────────────────────────────────────────────────┘
}}}*/
