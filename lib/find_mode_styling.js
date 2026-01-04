// ┌───────────────────────────────────────────────────────────────────────────┐
// │ lib/find_mode_styling.js ........................... _TAG (260102:20h:49) ●
// └───────────────────────────────────────────────────────────────────────────┘
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console         */
/* globals chrome          */
/* globals navigator       */
/* globals HUD             */
/* globals dom_log         */
/* globals setTimeout      */
/* globals clearTimeout    */

/* globals FindMode        */
/* globals FindModeHistory */
/* globals mode_find       */

/* exported Highlightings  */
/* exported FindPageSync   */
/* exported HUD_msg        */

/*}}}*/

// ┌───────────────┐
// │ FindPageStyle ●
// └───────────────┘
  /*{{{*/
  let  FindPageStyle = (function() {
  "use strict";
  let log_this=false;
  /* TYPE ID CLASS {{{*/

  // TYPE
  const TYPE_VIMIUM_MATCH     = "vimium_match";

  // ID
  const FIND_LOGPANEL_ID      = "vimium_logPanel";
  const FIND_UI_POPUP_ID      = "vimium_find_UI";
  const HIGHLIGHTNODE_ID      = "vimium_hi_node";
  const HIGHLIGHT_BAK_ID      = "vimium_backdrop";
  const VFRAGMENT_CSS_ID      = "vimium_fragment";

  // CLASS
  const BACKCLONE_CLASS       = "vimium_clone";
  const COLLAPSED_CLASS       = "collapsed";
  const CONTAINED_CLASS       = "contained"
  const DELETABLE_CLASS       = "deletable";
  const DEL_QUERY_CLASS       = "del_query";
  const FILTERING_CLASS       = "filtering";
  const FOOT_DIMM_CLASS       = "foot_dimm";
  const HEAD_FOOT_CLASS       = "head_foot";
  const OUTOFVIEW_CLASS       = "outofview";
  const QSELECTED_CLASS       = "qselected";
  const QUERYTEXT_CLASS       = "querytext";
  const SELECTION_CLASS       = "selection";
  const VIM_MATCH_CLASS       = "vim_match";
  const VIM_TRAIL_CLASS       = "vim_trail";

  /*}}}*/
  /* CSS_HTML {{{*/
  let     CSS_HTML;
  let get_CSS_HTML = function() {
    if(!CSS_HTML) {
        CSS_HTML=`
  /* :root {{{*/
  :root {
/*{{{
    color-scheme :    light dark;
  --light-bg     :    ghostwhite;
  --light-color  : darkslategray;
  --light-code   :        tomato;

  --dark-bg      : darkslategray;
  --dark-color   :    ghostwhite;
  --dark-code    :          gold;
}}}*/
  }
  /*}}}*/
  /* ::selection {{{*/
  body.vimium-find-mode ::selection {
      background-color: light-dark(  red, white);
                 color: light-dark(green, black);
  }
  /*}}}*/
  /* z-index {{{*/
  #${FIND_LOGPANEL_ID},                                           /* Find_LOG_el        */
  #${FIND_UI_POPUP_ID}        { z-index: 2147483646           ; }

  .${BACKCLONE_CLASS }        { z-index: 2147483644 !important; } /* backdrop children  */
  .${BACKCLONE_CLASS }::after { z-index: 2147483644 !important; } /* backdrop children  */

  #${HIGHLIGHT_BAK_ID}        { z-index: 2147483643           ; } /* backdrop           */
  .${VIM_MATCH_CLASS }::after { z-index: 2147483643           ; } /* vim_match Node     */

  #${HIGHLIGHTNODE_ID}        { z-index: 2147483642           ; } /* query STAND OUT EL */

  /*}}}*/
  /* BACKCLONE_CLASS {{{*/

  .${BACKCLONE_CLASS} {
/*{{{
    padding-left   :    1em;
    padding-right  :    7em;
    overflow        : hidden;
}}}*/
    outline-offset  :    5px;
    white-space     :    pre;
  }

  .${BACKCLONE_CLASS}::after {
    visibility      : visible                  !important;
/*{{{
    margin-left     : 0.5em;
    font-weight     :  bold;
      font-size     :  12px;
}}}*/
              color : light-dark(black, white) !important;
   background-color : light-dark(white, black) !important;
    content         :           attr(data-num)           ;
  }

  /*}}}*/
  /* HIGHLIGHT_BAK_ID {{{*/

  #${HIGHLIGHT_BAK_ID} {
   backdrop-filter: brightness(0.4);
          position:           fixed;
               top:               0;
              left:               0;
             right:               0;
            bottom:               0;
  }

  /*}}}*/
  /* TYPE_VIMIUM_MATCH {{{*/

   ${TYPE_VIMIUM_MATCH}::after {
         position:                      absolute;
        transform:           translate(10%,-50%);
        font-size:                           80%;
      font-weight:                           100;
   letter-spacing:                         0.2em;
           color :      light-dark(white, black);
/*{{{
   text-shadow: 1px 1px light-dark(black, white);
}}}*/
   }

  /*}}}*/
  /* HIGHLIGHTNODE_ID {{{*/
  #${HIGHLIGHTNODE_ID} {
   position        :                             absolute;
   outline-style   :                                solid;
   outline-offset  :                                  9px;
   outline-width   :                                  6px;
/*{{{
   outline-style   :                                solid;
   outline-width   :                                  9px;
}}}*/
   border-radius   :                                0.4em;
   white-space     :                             pre-line;
/*{{{
   margin          :                              6px 6px;
              color:               light-dark(#000, #000);
   background-color:               light-dark(#FFF, #FFF);
   background-color: light-dark(transparent, transparent);
   backdrop-filter :                      brightness(0.4);
}}}*/
   color           : light-dark(transparent, transparent); /* use text geometry only */
   transition      :                   all ease-out 100ms;
  }
  #${HIGHLIGHTNODE_ID}.${OUTOFVIEW_CLASS} { outline-style: dotted; }
  #${HIGHLIGHTNODE_ID}.${COLLAPSED_CLASS} { outline-style: dashed; }
  #${HIGHLIGHTNODE_ID}.${SELECTION_CLASS} { outline-style:  solid; }

  #${HIGHLIGHTNODE_ID}.hi_still {
    opacity       : 50%;
    transition    : all ease-in 250ms;
    outline-offset: 0px;
    border-radius : 4px;
  }
  /*}}}*/
  /* FIND_UI_POPUP_ID {{{*/
  #${FIND_UI_POPUP_ID} {
             cursor:                            default;
      border-radius:                                4px;
      border       : 1px solid light-dark(#FAAC, #AAAC);
              width:                               32ch;
         box-shadow:            3px 3px 9px black inset;
              color:       light-dark(  white, gray   );
   background-color:       light-dark(#000000, #181818);
            padding:                              0.5em;
        white-space:                                pre;
        font-weight:                            lighter;
  }

  #${FIND_UI_POPUP_ID} .num    { opacity: 70%; }
  #${FIND_UI_POPUP_ID}::before {
         opacity   :                               100%;
         position  :                           absolute;
         top       :                             -1.5em;
         left      :                                  0;
/*{{{
         transform :              translate(-70%,-150%);
}}}*/
      border-radius:                                4px;
         border    : 1px solid light-dark(#AFAC, #AAAC);
         padding   :                    0   5px        ;
         content   :                    'Ctrl , \\24DD';
              color:       light-dark(  white, gray   );
   background-color:       light-dark(#000000, #181818);
  }

  #${FIND_UI_POPUP_ID}           {            color: light-dark(#FFF, #AAA); }
  HR                             { background-color: light-dark(#FFF, #AAA); }
  #${FIND_UI_POPUP_ID}>SPAN>SPAN {          display: inline-block; }

  /*}}}*/
  /* FIND_LOGPANEL_ID {{{*/

  #${FIND_LOGPANEL_ID} {
      border-radius:                                  4px;
         box-sizing:                           border-box;
            padding:                                0.5em;
             cursor:                              default;
        white-space:                                  pre;
          min-width:                                  7ch;
        font-weight:                              lighter;
              color: light-dark(      white, gray       );
   background-color: light-dark(transparent, transparent);
         text-align:                                right;
  }

  #${FIND_LOGPANEL_ID}.logging {
         border    :              1px solid #AAAC;
         box-shadow:      3px 3px 9px black inset;
   background-color: light-dark(#000000, #181818);
         text-align:                         left;
  }

  #${FIND_LOGPANEL_ID}::before {
         opacity   :                         100%;
         position  :                     absolute;
         right     :                            0;
         bottom    :                          1px;
         border    :              1px solid #AAAC;
      border-radius:                          4px;
              color: light-dark(  white, gray   );
   background-color: light-dark(#000000, #181818);
         padding   :                        0 5px;
         content   :                   'Ctrl , L';
  }

  #${FIND_LOGPANEL_ID}.logging::before {
      right        :               initial;
         bottom    :                 unset;
      transform    : translate(-115%,-40%);
      border       :       1px solid #AAAC;
  }

  /*}}}*/
  /* CONTAINED DELETABLE FILTERING QSELECTED QUERYTEXT {{{*/
                       .${CONTAINED_CLASS} { opacity:  90%; }
                       .${DELETABLE_CLASS} { opacity:  90%; } /* starts with */
                       .${FILTERING_CLASS} { opacity:  70%; }
                       .${QSELECTED_CLASS} { opacity: 100%; }
                       .${QUERYTEXT_CLASS} { opacity:  50%; }

  #${FIND_LOGPANEL_ID}>.${CONTAINED_CLASS} { float: right; margin-right: 1em; }
  #${FIND_LOGPANEL_ID}>.${DELETABLE_CLASS} { float: right; margin-right: 1em; }
  #${FIND_LOGPANEL_ID}>.${FILTERING_CLASS} { float: right; margin-right: 1em; }
  #${FIND_LOGPANEL_ID}>.${QSELECTED_CLASS} { float: right; margin-right: 1em; }
  #${FIND_LOGPANEL_ID}>.${QUERYTEXT_CLASS} { float: right; margin-right: 1em; }

  /*}}}*/
  /* lit {{{*/
  #${FIND_LOGPANEL_ID}.lit::before,
  #${FIND_UI_POPUP_ID}.lit::before {  border: 3px solid red; }
  /*}}}*/
  /* DEL_QUERY_CLASS {{{*/
  .${DEL_QUERY_CLASS} {
         cursor:              pointer;
          color: light-dark(red, red);
          float:                right;
      font-size:                  95%;
    margin-left:                  1em;
        padding:                0 1ex;
  }
/*{{{
  .${DEL_QUERY_CLASS}:hover                                { outline: solid light-dark(red, red) 1px; }
}}}*/
  #${FIND_UI_POPUP_ID}>SPAN:has(.${DEL_QUERY_CLASS}:hover) { outline: solid light-dark(red, red) 1px; }

  /*}}}*/
  /* FILTERING_CLASS {{{*/
  .${FILTERING_CLASS} {
        font-weight:                        100;
    text-decoration:                  underline;
              color: light-dark(orange, orange);
  }

  /*}}}*/
  /* QSELECTED_CLASS {{{*/
  .${QSELECTED_CLASS} {
        margin-left:                     -0.2em;
              color: light-dark( white, white );
    text-decoration:                  underline;
        font-weight:                        900;
  }

  .${DELETABLE_CLASS} {
          color    : light-dark(orange, orange);
    font-weight    :                        900;
  }
/*{{{
  .${DELETABLE_CLASS}::after {
        position:                   absolute;
       transform:          translate(10%,0%);
         content:                'Deletable';
       font-size:                        80%;
     font-weight:                        100;
  letter-spacing:                      0.2em;
           color: light-dark(orange, orange);
           color: light-dark(orange, orange);
  }
}}}*/

  /*}}}*/
  /* CONTAINED_CLASS FOOT_DIMM_CLASS HEAD_FOOT_CLASS {{{*/

  .${CONTAINED_CLASS} {
   color         : light-dark(magenta, magenta);
   font-weight   :                          900;
  }

  .${FOOT_DIMM_CLASS},
  .${HEAD_FOOT_CLASS} {
    font-size    :                          80%;
    font-weight  :                      lighter;
    color        : light-dark( orange, orange );
    opacity      :                          80%;
  }

  .${FOOT_DIMM_CLASS} {
    color        : light-dark(   #AAA, #888   );
  }

  /*}}}*/
  /* ecc0..ecc9 {{{*/
  .ecc0, .bg0  { outline-color : light-dark( ${dom_log.ecc[0]}, ${dom_log.ecc[0]}); outline-width: 4px; outline-style: double; }
  .ecc1, .bg1  { outline-color : light-dark( ${dom_log.ecc[1]}, ${dom_log.ecc[1]}); }
  .ecc2, .bg2  { outline-color : light-dark( ${dom_log.ecc[2]}, ${dom_log.ecc[2]}); }
  .ecc3, .bg3  { outline-color : light-dark( ${dom_log.ecc[3]}, ${dom_log.ecc[3]}); }
  .ecc4, .bg4  { outline-color : light-dark( ${dom_log.ecc[4]}, ${dom_log.ecc[4]}); }
  .ecc5, .bg5  { outline-color : light-dark( ${dom_log.ecc[5]}, ${dom_log.ecc[5]}); }
  .ecc6, .bg6  { outline-color : light-dark( ${dom_log.ecc[6]}, ${dom_log.ecc[6]}); }
  .ecc7, .bg7  { outline-color : light-dark( ${dom_log.ecc[7]}, ${dom_log.ecc[7]}); }
  .ecc8, .bg8  { outline-color : light-dark( ${dom_log.ecc[8]}, ${dom_log.ecc[8]}); }
  .ecc9, .bg9  { outline-color : light-dark( ${dom_log.ecc[9]}, ${dom_log.ecc[9]}); }

  .ecc0        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[0]}80, ${dom_log.ecc[0]}80) 0%, transparent 30%); }
  .ecc1        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[1]}80, ${dom_log.ecc[1]}80) 0%, transparent 30%); }
  .ecc2        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[2]}80, ${dom_log.ecc[2]}80) 0%, transparent 30%); }
  .ecc3        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[3]}80, ${dom_log.ecc[3]}80) 0%, transparent 30%); }
  .ecc4        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[4]}80, ${dom_log.ecc[4]}80) 0%, transparent 30%); }
  .ecc5        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[5]}80, ${dom_log.ecc[5]}80) 0%, transparent 30%); }
  .ecc6        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[6]}80, ${dom_log.ecc[6]}80) 0%, transparent 30%); }
  .ecc7        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[7]}80, ${dom_log.ecc[7]}80) 0%, transparent 30%); }
  .ecc8        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[8]}80, ${dom_log.ecc[8]}80) 0%, transparent 30%); }
  .ecc9        { background:linear-gradient(to bottom, light-dark( ${dom_log.ecc[9]}80, ${dom_log.ecc[9]}80) 0%, transparent 30%); }

  /*}}}*/
  /* VIM_MATCH_CLASS ● CLASS {{{*/
  .${VIM_MATCH_CLASS} {
       border-radius: 3px;
               color:                  light-dark(black, white);
      outline       : 9px solid        light-dark(#8888, #0f24); /* larger than target ● with no layout change */
      outline-offset:-9px;
/*{{{
    background-color:                  light-dark(#0007, #0007);
      outline       : 2px solid       light-dark(  red, red);
}}}*/
/*{{{
           box-shadow: 0px 0px 13px 5px light-dark(black, white) inset;
               border: 1px solid #E3BE23;
}}}*/
/* GOLDEN BACKGROUND {{{
     background: linear-gradient(to bottom, #fff785 0%, #ffc542 100%);
}}}*/
         text-shadow: 1px 1px          light-dark(white, black);
  }
  .${VIM_MATCH_CLASS}::after {
    visibility      :         hidden;
    content         : attr(data-num);
    font-weight     :         normal;
               color: light-dark(#222 , #DDD);
    background-color: light-dark(#2224, #2224);
  }
  /*}}}*/
  /* VIM_TRAIL_CLASS ● CLASS {{{*/
  .${VIM_TRAIL_CLASS} {
/*{{{
    display: inline-block !important;
}}}*/
/*{{{
   outline                   :      3px solid light-dark(red,red);
}}}*/
   animation-duration        :              250ms;
   animation-delay           :              100ms;
   animation-name            : fip_prev_animation;
   animation-timing-function :           ease-out;
/*{{{
   transform-origin          :            50% 50%;
}}}*/
/*{{{
   animation-fill-mode       :             both;
   animation-iteration-count :                3;
}}}*/
  }
  .${VIM_TRAIL_CLASS}::after {
    visibility      : visible;
  }
  @keyframes fip_prev_animation {
     0% { transform: scale(1.2); }
   100% { transform: scale(1.0); }
/* transform {{{
}}}*/
  /* background-color {{{*/
     0% { background-color: light-dark(      white, white      ); }
   100% { background-color: light-dark(transparent, transparent); }
  /*}}}*/
/* box-shadow {{{
     0% { box-shadow:-9px -9px 9px magenta; }
    33% { box-shadow: 9px -9px 9px magenta; }
    66% { box-shadow: 9px  9px 9px magenta; }
   100% { box-shadow:-3px  3px 3px magenta; }
}}}*/
/* outline {{{
     0% { outline-offset:              9px; }
   100% { outline-offset:              0px; }
}}}*/
  }

  /*}}}*/
  /* HIGHLIGHTNODE_ID ● hi_blink CLASS {{{*/
  .hi_blink {
   animation-duration        :           1250ms;
   animation-delay           :           1000ms;
   animation-name            :  blink_animation;
   animation-timing-function :           linear;
   animation-fill-mode       :          forward;
  }

  @keyframes  blink_animation {
    00% { background-color: light-dark(      white, white      ); }
    20% { background-color: light-dark(      black, black      ); }
    40% { background-color: light-dark(      white, white      ); }
    60% { background-color: light-dark(      black, black      ); }
    80% { background-color: light-dark(      white, white      ); }
   100% { background-color: light-dark(transparent, transparent); }
  }
  /*}}}*/
/* @see dom_tools {{{
  C:/LOCAL/DATA/DEV/PROJECTS/RTabs/Util/RTabs_Profiles/DEV/stylesheet/dom_tools.css
}}}*/
  `;
      }
      return CSS_HTML;
  };
  /*}}}*/
  /* EXPORT {{{*/

  /*● name ● logging {{{*/
  const  name = "FindPageStyle";
  let    FINDPAGESTYLE_LFX;

  let logging = function(state,onload)
  {
    FINDPAGESTYLE_LFX = dom_log.lfX[4];
    let changed   = (state != undefined) && (log_this != state);
    if( changed   )  log_this  = state;
    if(!onload    )  dom_log.logging({ name, log_this, changed });
    return           log_this;
  };
  /*}}}*/
  return { name
    ,      logging

    ,      get_CSS_HTML
    ,      BACKCLONE_CLASS
    ,      COLLAPSED_CLASS
    ,      CONTAINED_CLASS
    ,      DELETABLE_CLASS
    ,      DEL_QUERY_CLASS
    ,      FILTERING_CLASS
    ,      FIND_LOGPANEL_ID
    ,      FIND_UI_POPUP_ID
    ,      FOOT_DIMM_CLASS
    ,      HEAD_FOOT_CLASS
    ,      HIGHLIGHTNODE_ID
    ,      HIGHLIGHT_BAK_ID
    ,      OUTOFVIEW_CLASS
    ,      QSELECTED_CLASS
    ,      QUERYTEXT_CLASS
    ,      SELECTION_CLASS
    ,      TYPE_VIMIUM_MATCH
    ,      VFRAGMENT_CSS_ID
    ,      VIM_MATCH_CLASS
    ,      VIM_TRAIL_CLASS
  };
  /*}}}*/
  }());
  globalThis.FindPageStyle  = FindPageStyle;
  /*}}}*/

// ┌───────────────┐
// │ Highlightings ●
// └───────────────┘
/*{{{*/
let  Highlightings = (function() {
"use strict";
let log_this=false;
/* ID CLASS MAGIN MIN MAX DELAY DURATINO {{{*/

/* This class manages the highlighting */
/* ...based on https://github.com/rogershen/chrome-regex-search */

const HIGHLIGHT_MAX_H        =  100;
const HIGHLIGHT_MAX_W        = 1000;
const HIGHLIGHT_MIN_H        =   10;
const HIGHLIGHT_MIN_W        =   24;

const HI_BLINK_TIMEOUT_DELAY = 1000;
const HI_STILL_TIMEOUT_DELAY = 1000;

const CENTER_ON_SELECTION    = true;
const SCROLL_MARGIN          = "100";


let   Hel;
let   highlight_timeout;
let   blink_timeout;
let   highlight_out_of_view_timeout;

let   DocFragment_CSS;

/*}}}***/
/* COLLAPSED ● OUTOFVIEW ● SELECTION {{{*/
const NODE_COLLAPSED        = "COLLAPSED";
const NODE_OUTOFVIEW        = "OUT OF VIEW ";
const NODE_SELECTION        = "SELECT_NODE";

/*}}}*/
// ┌──────────┐
// │ BACKDROP ●
// └──────────┘
/*{{{*/
let   backdrop_el;
let   backdrop_matched_nodes_to_clone = [];
let   backdrop_matched_nodes_cloned   = [];
/*}}}*/
  /*➔ backdrop_init     ● called by NodeMatcher.clear {{{*/
  let backdrop_init = function(_caller)
  {
    if(!backdrop_el) {
if(log_this) dom_log.log4("Highlightings.backdrop_init ● called by "+_caller);

      backdrop_el    = document.createElement("DIV");
      backdrop_el.id = FindPageStyle.HIGHLIGHT_BAK_ID;
      backdrop_el.style.display  = "none";
      document.body.appendChild( backdrop_el );
    }
    /* DELETE CLONES */
    let array = Array.from(document.querySelectorAll("."+FindPageStyle.BACKCLONE_CLASS));
    if( array && (array.length >0))
    {
if(log_this) dom_log.log4("Highlightings.backdrop_init ● called by "+_caller+" ● removing "+array.length+" clones");

      array.forEach((el) => el.parentElement.removeChild(el));
    }
    backdrop_matched_nodes_to_clone = [];
    backdrop_matched_nodes_cloned   = [];
  };
  /*}}}*/
/*➔ backdrop_hide {{{*/
  let backdrop_hide = function(_caller)
  {
if(log_this) dom_log.log4("Highlightings.backdrop_hide ● called by "+_caller);

    backdrop_init("backdrop_hide");
    backdrop_el.style.display  = "none";

    window.removeEventListener("scroll", scroll_listener);
  };
  /*}}}*/
/*➔ backdrop_show   ● called by HUD_msg.updateQuery {{{*/
  let backdrop_show = function(_caller)
  {
//(log_this) dom_log.log4("Highlightings.backdrop_show ● called by "+_caller);

    backdrop_init("backdrop_show");
    backdrop_el.style.display = "block";

    window.addEventListener("scroll", scroll_listener);
  };
  /*}}}*/
  /*_ backdrop_add_matched_node {{{*/
  let backdrop_add_matched_node = function( el )
  {
    backdrop_matched_nodes_to_clone.push( el );
  };
  /*}}}*/
  /*_ backdrop_clone_visible_nodes {{{*/
  let backdrop_clone_visible_nodes = function()
  {
//dom_log.log("backdrop_clone_visible_nodes");

//console.dir(backdrop_matched_nodes_to_clone);
//  backdrop_matched_nodes_to_clone = backdrop_matched_nodes_to_clone.filter((el) => !FindPageSync.is_node_OUTOFVIEW( el ));

    /* each new call may get some scrolled in nodes since previous call */
    let      visible_nodes_to_clone = backdrop_matched_nodes_to_clone.filter((el) => !FindPageSync.is_node_OUTOFVIEW( el ));
//console.dir(visible_nodes_to_clone);

    for(let i=0; i<visible_nodes_to_clone.length; ++i)
    {
      let node = visible_nodes_to_clone[i];

      if(!backdrop_matched_nodes_cloned.includes( node )) {
        backdrop_clone_node                     ( node );
        backdrop_matched_nodes_cloned.push      ( node );
      }
    }

if(log_this) dom_log.log("%c backdrop_clone_visible_nodes %c"+backdrop_matched_nodes_cloned.length+" / "+backdrop_matched_nodes_to_clone.length
                         ,dom_log.lbL+HIGHLIGHT_LFX      ,dom_log.lbC+HIGHLIGHT_LFX                                                            );
  };
  /*}}}*/
                                // ┌──────────────────────┐
                                // │ [vimium_clone]       ● CLASS
                                // └──────────────────────┘
/*_ backdrop_clone_node     ● called by highlight_node {{{*/
  let backdrop_clone_node = function(el)
  {
//dom_log.log("backdrop_clone_node(el=["+el.tagName+(el.id ? " #"+el.id : "") + (el.className ? "."+el.className : "")+"])");

    let clone = el.cloneNode( true ); // deep (text...)
    delete clone.id;

//  clone.classList.remove( FindPageStyle.VIM_MATCH_CLASS );
    clone.classList.add   ( FindPageStyle.BACKCLONE_CLASS );
    let el_style = window.getComputedStyle( el );
    clone.style.fontSize    = el_style.fontSize;

    let rect                = el.getBoundingClientRect();
    clone.style.position    = "absolute";
    clone.style.top         = (rect.top  + window.scrollY)+"px";
    clone.style.left        = (rect.left + window.scrollX)+"px";
    clone.style.width       = (rect.width                )+"px";
    clone.style.height      = (rect.height               )+"px";

    document.body.appendChild( clone );
  };
  /*}}}*/
  /*● highlight_query       ● CALLED BY FindMode.execute {{{*/
  let highlight_query = function(backwards,row,nodes_array)
  {
//(log_this) dom_log.console_clear("highlight_query");
    /* 1/3 ● NODE_COLLAPSED {{{*/
    let       node = nodes_array[ row ];
    let highlight_why;
    if(!highlight_why && NodeMatcher.is_node_COLLAPSED( node ))
    {
        highlight_why = NODE_COLLAPSED;

    }
    /*}}}*/
    /* 2/3 ● NODE_OUTOFVIEW {{{*/
    if(!highlight_why && FindPageSync.is_node_OUTOFVIEW( node ))
    {
        let   row_max = nodes_array.length-1;
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
        highlight_node(node, highlight_why, row, backwards);
  };
  /*}}}*/
  /*_ highlight_node {{{*/
  let highlight_node = function(node, why, row, backwards)
  {
/*{{{*/
let l_x = (why == NODE_COLLAPSED) ? 1
  :       (why == NODE_OUTOFVIEW) ? 9
  :       (why == NODE_SELECTION) ? 5 : 2;
let dot = dom_log.dot[l_x];
if(log_this) dom_log.log(dot+ dot + dot + dot + dot+"%c highlight_node %c"+why, HIGHLIGHT_LFX, dom_log.lfX[l_x]);
/*}}}*/
    /* ● INIT Hel {{{*/
    if( !Hel )
    {
      Hel    = document.createElement("DIV");
      Hel.id = FindPageStyle.HIGHLIGHTNODE_ID;

      document.body.appendChild( Hel );
    }
    /*}}}*/
    if(!node.parentElement) return;
    let is_Hel_CORNERED = set_Hel_CORNERED( backwards );
    /*  highlight_timeout  {{{*/
    if( highlight_timeout ) {
      clearTimeout(highlight_timeout);

      highlight_timeout = null;
    }
    /*}}}*/
    /* SELECTION VISIBLE {{{*/
    let   rect = node.parentElement.getBoundingClientRect();
    let    w_h = window.innerHeight;
    let     dy = (rect.top  < 0  ) ? rect.top
      :        (rect.bottom > w_h) ? rect.bottom - w_h
      :                              0;
    if(dy) dy += SCROLL_MARGIN * ((dy < 0) ? -1 : 1);
    //}}}*/
    // ┌─────────────────────────────────┐
    // │ ● 1/3 CENTER VIEW ON SELECTION  ●
    // └─────────────────────────────────┘
    //{{{
    if(dy &&  CENTER_ON_SELECTION) {
      let node_middle = (rect.top + rect.height/2);
      let         top = window.scrollY + node_middle - w_h/2;

if(log_this) dom_log.log(dot+ dot + dot + dot + dot+"%c CENTER VIEW: scrollTo %c"+top, HIGHLIGHT_LFX, dom_log.lfX[l_x]);
      window.scrollTo({ top, behavior: "smooth" });
      window.addEventListener("scroll",   scroll_listener);
    }
    //}}}
    // ┌─────────────────────────────────┐
    // │ ● 2/3 BRING SELECTION INTO VIEW ●
    // └─────────────────────────────────┘
    //{{{
    if(dy && !CENTER_ON_SELECTION) {
      let w_y = window.scrollY;
      let top = window.scrollY + dy;

if(log_this) dom_log.log(dot+ dot + dot + dot + dot+"%c BRING INTO VIEW: scrollTo %c"+top, HIGHLIGHT_LFX, dom_log.lfX[l_x]);
      window.scrollTo({ top, behavior: "smooth" });
      window.addEventListener("scroll",   scroll_listener);
//{{{
let sign = (dy < 0) ? "" : "+";
if(log_this) dom_log.log("%c.....scrollY "+w_y+"%c ● "+sign+dy.toFixed(0)+" => "+window.scrollY
            ,dom_log.lfX[l_x]                  ,dom_log.lfX[2]);
//}}}
    }
    //}}}
    // ┌─────────────────────────────────┐
    // │ ● 3/3 NODES INTO VIEW NO SCROLL ●
    // └─────────────────────────────────┘
/*{{{*/
    if(!dy) {
if(log_this) dom_log.log(dot+ dot + dot + dot + dot+"%c NODES INTO VIEW %c NO SCROLLING", HIGHLIGHT_LFX, dom_log.lfX[l_x]);

      backdrop_clone_visible_nodes();
    }
/*}}}*/
    // ┌──────────────────┐
    // │ Hel              ●
    // └──────────────────┘
    /* ● BLINK IF: ● SCROLL ● BIG MOVE ●  BLINKING {{{*/
    let blink_required;
    if( node.textContent.length < 50) {
      blink_required
        = (dy           ) ? "SCROLL"
        : (blink_timeout) ? "BLINKING"
        :                    undefined;

      /* ALSO BLINK IF: ● BIG MOVE */
      if(!blink_required )
      {
        rect    = node.parentElement.getBoundingClientRect();
        let n_y = rect.top    .toFixed(0);
        let n_x = rect.left   .toFixed(0);

        rect    = Hel.getBoundingClientRect();
        let d_y = Math.abs(rect.top   - n_y).toFixed(0);
        let d_x = Math.abs(rect.left  - n_x).toFixed(0);

        let m_y = (window.innerHeight / 3  ).toFixed(0);
        let m_x = (window.innerWidth  / 3  ).toFixed(0);

        if     (d_y > window.innerHeight/2) blink_required = "MOVE_Y "+d_y+">"+m_y;
        else if(d_x > window.innerWidth /2) blink_required = "MOVE_X "+d_x+">"+m_x;
      }
    }
//if(log_this) dom_log.logBIG("blink_required "+blink_required+"");
    /*}}}*/
    if     (is_Hel_CORNERED) setTimeout(() => set_Hel_LAYOUT(node, why, row, blink_required),  250);
//  else if(blink_required ) setTimeout(() => set_Hel_LAYOUT(node, why, row, blink_required), 2000); // CLUMSY
    else                                      set_Hel_LAYOUT(node, why, row, blink_required)       ;
  }
  /*}}}*/
/*_ set_Hel_CORNERED {{{*/
let set_Hel_CORNERED = function(backwards)
{
if(log_this) dom_log.log("set_Hel_CORNERED");

  /* currently [Hel.matched_el] target */
  if( !Hel.matched_el )
    return false;

  /* current [Hel] position */
  let rect = Hel.matched_el.getBoundingClientRect();
  let  w_h = window.innerHeight;
  if((rect.top > 0) && (rect.bottom < w_h))
    return false;

  /* corner [Hel] */
  rect     = Hel.getBoundingClientRect();
  let e_w  = rect.width  .toFixed(0);
  let e_h  = rect.height .toFixed(0);
  Hel.style.top  = (window.scrollY + ((backwards ? (window.innerHeight - 4 * e_h) : 4 * e_h)))+"px";
  Hel.style.left = (window.scrollX + ((backwards ? (window.innerWidth  - 4 * e_w) : 4 * e_w)))+"px";
  return true;
};
/*}}}*/
/*_ set_Hel_LAYOUT ● GEOMETRY ● font class ● trail blink still {{{*/
let set_Hel_LAYOUT = function(node, why, row, blink_required)
{
/*{{{*/
let l_x = (why == NODE_COLLAPSED) ? 1
  :       (why == NODE_OUTOFVIEW) ? 9
  :       (why == NODE_SELECTION) ? 5 : 2;
let dot = dom_log.dot[l_x];
if(log_this) dom_log.log(dot+ dot + dot + dot + dot+"%c set_Hel_LAYOUT %c"+why, HIGHLIGHT_LFX, dom_log.lfX[l_x]);
/*}}}*/
    /* ● [Hel] GEOMETRY {{{*/
    set_Hel_GEOMETRY(node, why);

    /*}}}*/
    /* ● [selection node] GEOMETRY ● [n_y n_x n_w n_h] {{{*/
    let rect = node.parentElement.getBoundingClientRect();
    let n_y  = rect.top    .toFixed(0);
    let n_x  = rect.left   .toFixed(0);
    let n_w  = rect.width  .toFixed(0);
    let n_h  = rect.height .toFixed(0);

    /*}}}*/
    /* ● TEXT ● FONT {{{*/
    Hel.textContent      = node.textContent;

    let                    style = window.getComputedStyle( node.parentElement );
    Hel.style.fontSize   = style.fontSize;
    Hel.style.fontWeight = style.fontWeight;
    /*}}}*/
    /* ● STYLE ● f(OUTOFVIEW COLLAPSED SELECTION) {{{*/
    Hel.className        = (why == NODE_OUTOFVIEW) ? FindPageStyle.OUTOFVIEW_CLASS
      :                    (why == NODE_COLLAPSED) ? FindPageStyle.COLLAPSED_CLASS
      :                  /*(why == NODE_SELECTION)*/ FindPageStyle.SELECTION_CLASS;

    Hel.className        += " bg"+((row+1) % 10);
    /*}}}*/
                                // ┌──────────────────────┐
                                // │ [hi_blink]           ● CLASS
                                // └──────────────────────┘
    /* ● BLINK ANIMATION .. f(scrolled or postponed hi_blink) {{{*/
    if( blink_required )
    {
if(log_this) dom_log.log(dot+ dot + dot + dot + dot+"%c blink_required %c"+blink_required, HIGHLIGHT_LFX, dom_log.lfX[l_x]+dom_log.lbF);
      if(blink_timeout) clearTimeout(      blink_timeout );

      blink_timeout =   setTimeout(() => {
        blink_timeout = null;
        Hel.classList.add("hi_blink");
      }, HI_BLINK_TIMEOUT_DELAY);

/* repeat once later ● not so good! {{{
      if((why == NODE_OUTOFVIEW) && !highlight_out_of_view_timeout)
      {
        highlight_out_of_view_timeout = setTimeout(() => {
          highlight_out_of_view_timeout = null;
          highlight_node(node, why, row);
        }, 500);
      }
}}}*/
    }
    /*}}}*/
                                // ┌──────────────────────┐
                                // │ [vim_trail]          ● CLASS
                                // └──────────────────────┘
    /* ● TRAIL ANIMATION {{{*/

    // CLEAR CURRENT
/*{{{
    if( Hel.matched_el ) {
      let el = Hel.matched_el;
      setTimeout(() => el.classList.remove( FindPageStyle.VIM_TRAIL_CLASS ), 1000);
    }
}}}*/
/*{{{
    if( Hel.matched_el ) {
      Hel.matched_el.classList.add   ( FindPageStyle.VIM_MATCH_CLASS );
    }
}}}*/

    // PICK NEXT
        Hel.matched_el = node.parentElement;

    // STAND OUT NEXT
    if( Hel.matched_el ) {
      let                      el = Hel.matched_el;
/*{{{
      Hel.matched_el.classList.remove( FindPageStyle.VIM_MATCH_CLASS );
}}}*/
      Hel.matched_el.classList.add   ( FindPageStyle.VIM_TRAIL_CLASS );
      setTimeout(() =>         el.classList.remove( FindPageStyle.VIM_TRAIL_CLASS ), 1000);
    }

    /*}}}*/
// log XY WH {{{
rect     = Hel.getBoundingClientRect();
let e_y  = rect.top    .toFixed(0);
let e_x  = rect.left   .toFixed(0);
let e_w  = rect.width  .toFixed(0);
let e_h  = rect.height .toFixed(0);

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

if(log_this) dom_log.log("%c.....XY ● WH "  +n_x+" "  +n_y+" ● "  +n_w+" "  +n_h, dom_log.lfX[l_x]);
if(log_this) dom_log.log("%c.....XY ● WH %c"+e_x+" %c"+e_y+"   %c"+e_w+" %c"+e_h
                         ,dom_log.lfX[l_x]
                         ,               lfx      ,lfy        ,lfw      ,lfh    );

//}}}
                                // ┌──────────────────────┐
                                // │ [hi_still]            ● CLASS
                                // └──────────────────────┘
    /* highlight_timeout {{{*/
    Hel  .classList.remove("hi_still");
    highlight_timeout = setTimeout(() => {
      Hel.classList.remove("hi_blink" );
      Hel.classList.add   ("hi_still");
    }, HI_STILL_TIMEOUT_DELAY);
    /*}}}*/
};
/*}}}*/
/*_ set_Hel_GEOMETRY ● top left minHeight minWidth {{{*/
let set_Hel_GEOMETRY = function(node,why)
{
/*{{{*/
let l_x = (why == NODE_COLLAPSED) ? 1
  :       (why == NODE_OUTOFVIEW) ? 9
  :       (why == NODE_SELECTION) ? 5 : 2;
let dot = dom_log.dot[l_x];
if(log_this) dom_log.log(dot+ dot + dot + dot + dot+"%c set_Hel_GEOMETRY %c"+why, HIGHLIGHT_LFX, dom_log.lfX[l_x]);
/*}}}*/
  /* ● [selection node] GEOMETRY ● [n_y n_x n_w n_h] {{{*/
  let rect = node.parentElement.getBoundingClientRect();
  let n_y  = rect.top    .toFixed(0);
  let n_x  = rect.left   .toFixed(0);
  let n_w  = rect.width  .toFixed(0);
  let n_h  = rect.height .toFixed(0);

  /*}}}*/

  let e_h  = Math.max(HIGHLIGHT_MIN_H , Math.min(HIGHLIGHT_MAX_H          , n_h));
  let e_w  = Math.max(HIGHLIGHT_MIN_W , Math.min(HIGHLIGHT_MAX_W          , n_w));
  let e_y  = Math.max(0               , Math.min(window.innerHeight - e_h , n_y));
  let e_x  = Math.max(0               , Math.min(window.innerWidth  - e_w , n_x));
  /* not confined in viewport {{{
  let e_y  = n_y;
  let e_x  = n_x;
  }}}*/

  Hel.style.top        = (e_y + window.scrollY)+"px";
  Hel.style.left       = (e_x + window.scrollX)+"px";
  Hel.style.minHeight  = (e_h                 )+"px";
  Hel.style.minWidth   = (e_w                 )+"px";
  /* not confined in viewport {{{
  Hel.style.top        = (e_y                 )+"px";
  Hel.style.left       = (e_x                 )+"px";
  }}}*/

};
/*}}}*/
    /*● outline_activeNode {{{*/
    let outline_activeNode = function()
    {
      Hel.style.outlineColor   = "red";
      Hel.style.outlineWidth   = "4px";
      Hel.style.transform      = "scale(1.5)";

      setTimeout(() => {
        Hel.style.outlineColor = "";
        Hel.style.outlineWidth = "";
        Hel.style.transform    = "";
      }, 500);
    }
    /*}}}*/
    /*● add_highlight_css     ● called by NodeMatcher.filter_node_children {{{*/
    let add_highlight_css = function(docFragment_el)
    {
      if( !docFragment_el ) return;
      let array = NodeMatcher.get_docFragment_array();
      if(!array.includes( docFragment_el ) )
      {
if(log_this) dom_log.log4("add_highlight_css("+docFragment_el.tagName+"."+docFragment_el.className.replace(/\n/g,"\u21B2")+")");

        /* collect docFragment */
        NodeMatcher.add_docFragment( docFragment_el );

        /* insert highlight_css */
        docFragment_el.appendChild( get_highlight_css().cloneNode( true ) );
      }
    }
    /*}}}*/
    /*. get_highlight_css {{{*/
    let get_highlight_css = function()
    {
      if(       DocFragment_CSS )
        return( DocFragment_CSS );

      let el       = document.createElement("STYLE");
      el.id        = FindPageStyle.VFRAGMENT_CSS_ID;
      el.type      = "text/css";

      el.innerHTML = FindPageStyle.get_CSS_HTML();

      DocFragment_CSS = el;
      return( DocFragment_CSS );
    }
    /*}}}*/
  /*➔ get_node_docFragment {{{*/
  let get_node_docFragment = function(node)
  {
    let docFragment = null;
    let array = NodeMatcher.get_docFragment_array();
    for(let i= 0; i < array.length; ++i)
    {
      let parent = array[i];
      if( FindPageSync.is_el_or_child_of_parent_el(node, parent) )
      {
        docFragment = parent;
        break;
      }
    }
//if(log_this) dom_log.log4("get_node_docFragment( "+node.tagName+"."+node.className+"): ...return "+docFragment.tagName+"."+docFragment.className);
//if(docFragment) console.dir( docFragment );
    return docFragment;
  }
  /*}}}*/
// ┌────────┐
// │ SCROLL ●
// └────────┘
/*{{{*/
const SCROLL_DONE_COOLDOWN =   150;

let   scroll_DONE_timeout;
let   scroll_DONE_last_scrollY;

let   scrolledTo;
let   scrolledTo_top;
let   scrolledTo_bottom;
/*}}}*/
/*  scroll_listener {{{*/
let scroll_listener = function(e)
{
//if(log_this) dom_log.log4("scroll_listener");

  if(!scroll_DONE_timeout ) {
    scroll_DONE_timeout = setTimeout( scroll_listener_DONE, SCROLL_DONE_COOLDOWN);
  }
};
/*}}}*/
/*    scroll_listener_DONE {{{*/
let scroll_listener_DONE = function()
{
  scroll_DONE_timeout = null;

  let                   this_scrollY  =          window.scrollY;
  let done_scrolling = (this_scrollY == scroll_DONE_last_scrollY);
  if(!done_scrolling )
  {
    scroll_DONE_last_scrollY = this_scrollY;
    scroll_DONE_timeout      = setTimeout(scroll_listener_DONE, SCROLL_DONE_COOLDOWN);
  }
  /* got 2 consecutive calls with the same scrollY .. scrolling is idle */
  else {
    if(backdrop_el.style.display != "block")
      window.removeEventListener("scroll", scroll_listener);

    scrolledTo        = { x: window.scrollX , y: window.scrollY };
    scrolledTo_top    = (                      window.scrollY  == 0);
    scrolledTo_bottom = ((window.innerHeight + window.scrollY) >= document.body.offsetHeight);
if(log_this) dom_log.log4("scroll_listener_DONE: "+(scrolledTo_top ? " TOP" : (scrolledTo_bottom ? " BOTTOM" : window.scrollY)));

    backdrop_clone_visible_nodes();
  }
};
/*}}}*/
/*_ get_scrolled_by_user {{{*/
let get_scrolled_by_user = function()
{
  let first_since_load = (scrolledTo          == undefined);
  let while_scrolling  = (scroll_DONE_timeout != null     );

  /*..............................................*/ let scrolled_by_user;     let details;
  if     (first_since_load                           ) { scrolled_by_user =  true; details = "first_since_load" ; }
  else if(while_scrolling                            ) { scrolled_by_user = false; details = "while_scrolling"  ; }
  else if(globalThis.mode_normal_scrolled_to == "TOP") { scrolled_by_user =  true; details = "scrolled to TOP"  ; }
  else if(globalThis.mode_normal_scrolled_to == "BOT") { scrolled_by_user =  true; details = "scrolled to BOT"  ; }
  else if(scrolledTo.y      != window.scrollY        ) { scrolled_by_user =  true; details = "scrollY"          ; }
  else if(scrolledTo.x      != window.scrollX        ) { scrolled_by_user =  true; details = "scrollX"          ; }
  else                                                 { scrolled_by_user = false; details = "not scrolled"     ; }

/*if( first_since_load )*/
    scrolledTo   = { x: window.scrollX , y: window.scrollY };

if(log_this) {
if( scrolled_by_user ) dom_log.logX("🟣🟣🟣🟣SCROLLED BY USER     ● "+details, dom_log.lbB+dom_log.lfX[7]);
else                   dom_log.logX("⚫⚫⚫⚫SCROLLED BY FindMode ● "+details, dom_log.lbB+dom_log.lfX[8]);
}

  return scrolled_by_user;
};
/*}}}*/
/* EXPORT {{{*/

/*● name ● logging {{{*/
const  name = "Highlightings";
let    HIGHLIGHT_LFX;

let logging = function(state,onload)
{
  HIGHLIGHT_LFX = dom_log.lfX[4];
  let changed   = (state != undefined) && (log_this != state);
  if( changed   )  log_this  = state;
  if(!onload    )  dom_log.logging({ name, log_this, changed });
  return           log_this;
};
/*}}}*/
return { name
  ,      logging

  ,      add_highlight_css

  /* mode_find.js calls */
  ,      CENTER_ON_SELECTION  /* TODO ● make it an option */
  ,      highlight_query
  ,      outline_activeNode

  /* FindPageSync calls */
  ,      get_node_docFragment
  ,      get_scrolled_by_user

  /* mode_find.js + FindPageSync calls */
  ,      scroll_listener

  /* BACKDROP */
  ,      backdrop_init              // called by NodeMatcher.clear
  ,      backdrop_add_matched_node  // called by NodeMatcher.set_Match_pattern
  ,      backdrop_show              // called by HUD_msg.updateQuery
  ,      backdrop_hide              // called by HUD_msg.hide_popup
  //DEBUG
  , backdrop_clone_visible_nodes
  , set_Hel_CORNERED
};
/*}}}*/
}());
globalThis.Highlightings    = Highlightings;
/*}}}*/

// ┌─────────────┐
// │ NodeMatcher ●
// └─────────────┘
/*{{{*/
let  NodeMatcher = (function() {
"use strict";
/*{{{*/
let log_this=false;

const DEFAULT_MAX_RESULTS   = 500;
const UNEXPANDABLE          = /(script|style|svg|audio|canvas|figure|video|select|input|textarea)/i;


let   DocFragment_array     = [];
let   Matched_SPAN_array    = [];
let   Matched_TEXT_array    = [];
let   ShadowRoot_array      = [];
/*}}}*/

    /*➔ clear                   ● called by [new FindMode]{{{*/
    /* Remove all highlights from page */
    let clear = function() {
if(log_this) dom_log.log6("🟡🟡🟡🟡 NodeMatcher.clear");

      Matched_SPAN_array .forEach((el) => {
        if(el.parentNode && el.parentNode.nodeType != Node.DOCUMENT_FRAGMENT_NODE)
          el.outerHTML = el.innerHTML;
      });

      Matched_SPAN_array = [];
      Matched_TEXT_array = [];

      Highlightings.backdrop_init("NodeMatcher.clear");
    }
    /*}}}*/
  /*➔ can_match_query {{{*/
  let can_match_query = function(rawQuery, _caller) {
    let result
      = (rawQuery && (rawQuery.length > 1));

if(log_this) dom_log.log("%c NodeMatcher.can_match_query %c"+ dom_log.mPadEnd(rawQuery, 32) +"%c ...return "+ result   +"%c called by "+_caller
                         ,dom_log.lbL+NODEMATCH_LFX     ,dom_log.lbR+NODEMATCH_LFX           ,dom_log.lfX[result ? 5:8] ,dom_log.lfX[8]        );
    return result;
  };
  /*}}}*/
    /*➔ set_Match_pattern       ● called by FindMode.updateQuery {{{*/
    let set_Match_pattern = function( pattern )
    {
if(log_this) dom_log.log6("🟠🟠🟠 set_Match_pattern("+pattern+")");
//console.log("NodeMatcher.set_Match_pattern("+pattern+")");
        /* CLEAR {{{*/
        clear();

        /*}}}*/
        /* start search from body top element {{{*/
        Highlightings.add_highlight_css( document.body );

        filter_node_children(document.body, pattern);
        /*}}}*/
                                // ┌──────────────────────┐
                                // │ [VIM_MATCH_CLASS]    ● CLASS
                                // └──────────────────────┘
      /* set color f(row) ● add to BACKDROP {{{*/
      let      nb = Matched_SPAN_array.length;
      for(let row = 0; row < nb; ++row) {
        let   num =    row+1;
        let  node = Matched_SPAN_array[ row ];
//      node.classList.add(            "ecc"+(num  %  10) ); /* color */
        node.classList.add( FindPageStyle.VIM_MATCH_CLASS ); /* content font-weight */
        node.setAttribute (        "data-num", num+"/"+nb ); /* attr(data-num) */

        if( HUD.is_showing() )
          Highlightings.backdrop_add_matched_node( node );
      }
      /*}}}*/
/*{{{*/
let match_count = Matched_SPAN_array.length;
if(log_this) dom_log.log("%c🟡🟡🟡🟡 FOUND MATCH %c "+match_count+" %c for "+pattern
                         , dom_log.lbL+NODEMATCH_LFX
                         ,                       dom_log.lbC+dom_log.lfX[match_count % 10]
                         ,                                          dom_log.lbR+dom_log.lfX[4]);
/*}}}*/
      return match_count;
    };

    /*}}}*/
/*➔ filter_node_children    ● called by set_Match_pattern {{{*/
let filter_node_children = function(node,pattern) {
/*{{{*/
//                   if(log_this) dom_log.log6( dom_log.get_node_xpath(node) );
//if(node.className) if(log_this) dom_log.log6( node.className );

/*}}}*/
  // ┌─────────────────────────────────────────────────┐
  // │ 1/3 ● CAP MAX AND SKIP COLLAPSED AND TOOL NODES ●
  // └─────────────────────────────────────────────────┘
  /*{{{*/

    if( is_node_TOOL(node) )
        return 0;

    if( is_node_COLLAPSED(node) )
        return 0;

    if(        Matched_SPAN_array.length >= DEFAULT_MAX_RESULTS)
        return Matched_SPAN_array.length;

  /*}}}*/
  // ┌─────────────────────────────────────────────────┐
  // │ 2/3 ● ADD TEXT NODE                             ●
  // └─────────────────────────────────────────────────┘
  /* 1/2 ...return 1 more selection {{{*/
  if(node && node.nodeType === Node.TEXT_NODE)
  {
    let   index = -1;
    try { index = node.data.search( pattern ); } catch(ex) {}

    if((index >= 0) && (node.data.length > 0))
    {
      /*{{{
       * ┌─────────────────────────────────────┐
       * │_________________node________________●
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
      /*{{{
if(log_this) dom_log.log6("...index=["+ index +"]");
if(log_this) dom_log.log6("....text=["+ text  +"]");
if(log_this) dom_log.log6("....text_node=["+ text_node.textContent  +"]");
}}}*/

      // ┌───────────────────────────────────────────────┐
      // │ Turn text_node into an matched_node colored HTML ●
      // └───────────────────────────────────────────────┘
      let matched_node = document.createElement( FindPageStyle.TYPE_VIMIUM_MATCH );

      matched_node.appendChild( text_node.cloneNode(true) );
      text_node.parentNode.replaceChild(matched_node, text_node);

      Matched_SPAN_array.push( matched_node );
      /* EXPERIMENT: pick only those in viewport {{{
            if( is_node_IN_DISPLAY(node) ) {
              Matched_SPAN_array.push( matched_node );
            }
            else {
              if(matched_node.parentNode && matched_node.parentNode.nodeType != Node.DOCUMENT_FRAGMENT_NODE)
                matched_node.outerHTML = matched_node.innerHTML;
            }
}}}*/

      return 1;
    }
  }
  /*}}}*/
  // ┌─────────────────────────────────────────────────┐
  // │ 3/3 ● FILTER CONTAINERS SUBTREE                 ●
  // └─────────────────────────────────────────────────┘
  /* 2/2 ...search subtree {{{*/
  else if(node && isExpandable(node))
  {
    let children = node.childNodes;

    /* SHADOWROOT NODES */
    if((children.length < 1) && node.shadowRoot)
    {
      children   = node.shadowRoot.childNodes;

      /* INSERT [DocFragment_CSS] INTO [ShadowRoot] CONTAINERS */
      if(children.length && isExpandable( node.shadowRoot.firstElementChild ))
        Highlightings.add_highlight_css(  node.shadowRoot.firstElementChild );

    }
    /* SEARCH CONTAINER SUBTREE */
    for(let i=0; i < children.length; ++i)
        i += filter_node_children(children[i], pattern);

  }
  return 0;
  /*}}}*/
};
/*}}}*/
// ┌─────────────┐
// │ CHECK NODE  ●
// └─────────────┘
/*➔ is_node_COLLAPSED       ● called by filter_node_children ● Highlightings.highlight_query {{{*/
/*{{{*/
const MIN_DISPLAYED_PARENT_HEIGHT  = 5;

/*}}}*/
let is_node_COLLAPSED = function(node,verbose)
{
  if(!node || !node.parentNode || node.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE)
    return false;

  let       p_h =  FindPageSync.get_min_parent_height( node );
  let    result = (p_h < MIN_DISPLAYED_PARENT_HEIGHT);
  return result;
}
/*}}}*/
/*_ is_node_TOOL            ● called by filter_node_children {{{*/
let is_node_TOOL = function(node)
{
  if(!node ) return false;

  let pel  = node.parentElement;
  if(!pel  ) return false;

  let result
    =  (                 pel.tagName   == FindPageStyle.TYPE_VIMIUM_MATCH ) ? ("TOOL: "+ pel.tagName      )
    :  (                 pel.id        == FindPageStyle.VFRAGMENT_CSS_ID  ) ? ("TOOL: "+ pel.id           )
    :  (                 pel.id        == FindPageStyle.HIGHLIGHTNODE_ID  ) ? ("TOOL: "+ pel.id           )
    :  (                 pel.id        == FindPageStyle.HIGHLIGHT_BAK_ID  ) ? ("TOOL: "+ pel.id           )
    :  (                 pel.id        == FindPageStyle.FIND_UI_POPUP_ID  ) ? ("TOOL: "+ pel.id           )
    :  dom_log.is_el_child_of_id   (node, FindPageStyle.FIND_LOGPANEL_ID  ) ? ("TOOL: "+ FindPageStyle.FIND_LOGPANEL_ID )
    :  dom_log.is_el_child_of_id   (node, FindPageStyle.FIND_UI_POPUP_ID  ) ? ("TOOL: "+ FindPageStyle.FIND_UI_POPUP_ID )
//  :  dom_log.is_el_child_of_class(node, FindPageStyle.BACKCLONE_CLASS   ) ? ("TOOL: "+ FindPageStyle.BACKCLONE_CLASS  )
    :  false
  ;
if(log_this && result) dom_log.log6("is_node_TOOL: "+result);
  return result;
}
/*}}}*/
/*_ is_node_IN_DISPLAY      ● called by filter_node_children {{{*/
let is_node_IN_DISPLAY = function(node)
{
  if(!node || !node.parentNode || node.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE)
    return false;

  let result
  =      !HUD.is_showing()
    ||  !FindPageSync.is_node_OUTOFVIEW( node )
  ;
if(log_this) dom_log.log("%c is_node_OUTOFVIEW %c"+node.textContent+"%c"+result
                         ,NODEMATCH_LFX       ,dom_log.lfX[9]       ,dom_log.lfX[result ? 2:4]);
  return result;
}
/*}}}*/
/*. isTextNode {{{*/
/* Check if the given node is a text node */
let isTextNode = function(node) {
    return node && node.nodeType === Node.TEXT_NODE;
}
/*}}}*/
/*. isExpandable {{{*/
/* Check if the given node is an expandable node that will yield text nodes */
let isExpandable = function(node) {
    return node
        && node.nodeType === Node.ELEMENT_NODE && node.childNodes
        && !UNEXPANDABLE.test(node.tagName) && isNodeVisible( node );
}
/*}}}*/
/*. isNodeVisible {{{*/
let isNodeVisible = function( element ) {
    return (!window.getComputedStyle(element) || window.getComputedStyle(element).getPropertyValue("display") == "")
        || ( window.getComputedStyle(element).getPropertyValue("display") != "none")
    ;
};
/*}}}*/
// ┌─────────────┐
// │ SEARCH      ●
// └─────────────┘
/*{{{
   ┌───────────────────────────────────────────────────────────────────────────┐
   │ The data property is specific to text-related nodes                       ●
   ├───────────────────────────────────────────────────────────────────────────┤
   │ ● Working with Text, Comment, or CDATASection nodes
   │    - data is the standard property for these node types
   │
   │ ● You need direct read/write access
   │    - data is writable for text nodes
   │    , while textContent creates a new text node when set
   │
   │ ● Performance matters
   │    - data directly accesses the node's content without traversing children
   └───────────────────────────────────────────────────────────────────────────┘
}}}*/
/*➔ get_FROM_NODE_Selection {{{*/
let get_FROM_NODE_Selection = function(nodeStart, regex)
{
  let nodeEnd =    get_NEXT_TEXT_NODE(nodeStart);
  return get_ADJACENT_NODES_Selection(nodeStart, nodeEnd, regex);
};
/*}}}*/
/*_ get_ADJACENT_NODES_Selection {{{*/
let get_ADJACENT_NODES_Selection = function(nodeStart, nodeEnd, regex)
{
    // MATCH ADJASCENT TEXT
    let textStart  = nodeStart.data || nodeStart.textContent;
    let textEnd    = nodeEnd  .data || nodeEnd  .textContent;
    let text       = textStart + textEnd;

    let match      = text.match( regex );
    if(!match      ) return null;

    // START, END, LENGTH
    let matchStart = match.index;
    let matchEnd   = matchStart + match[0].length;

    // RANGE START NODE
    let range      = document.createRange();
    let startInfo  = matchStart < textStart.length
        ? get_NODE_AND_OFFSET(nodeStart, matchStart)
        : get_NODE_AND_OFFSET(nodeEnd  , matchStart - textStart.length);
console.log("startInfo", startInfo);

    range.setStart(startInfo.node, startInfo.offset);

    // RANGE END NODE
    let endInfo    = matchEnd <= textStart.length
        ? get_NODE_AND_OFFSET(nodeStart, matchEnd)
        : get_NODE_AND_OFFSET(nodeEnd  , matchEnd - textStart.length);
console.log(  "endInfo",   endInfo);

    range.setEnd(endInfo.node, endInfo.offset);
console.log(    "range",     range);

    // SELECTION
    let selection  = window.getSelection();
        selection.removeAllRanges();
        selection.addRange( range );

    return selection;
};
/*}}}*/
/*_ get_NEXT_TEXT_NODE {{{*/
let get_NEXT_TEXT_NODE = function( node )
{
    let    current = node;
    while( current )
    {
        if(!current.nextSibling ) {
            current = current.parentNode;
        }
        else {
            current = current.nextSibling;

            if(current.nodeType === Node.TEXT_NODE)
                return current;

            let textNode = get_CHILD_TEXT_NODE( current );
            if( textNode ) return textNode;
        }
    }
    return null;
}
/*}}}*/
/*_ get_CHILD_TEXT_NODE {{{*/
let get_CHILD_TEXT_NODE = function( node )
{
    if(node.nodeType === Node.TEXT_NODE) return node;

    for(let    child of node.childNodes) {
        let textNode =  get_CHILD_TEXT_NODE(child);
        if( textNode )  return textNode;
    }

    return null;
}
/*}}}*/
/*_ get_NODE_AND_OFFSET {{{*/
let get_NODE_AND_OFFSET = function(node, offset)
{
    let xpath = dom_log.get_node_xpath( node );

    // For TEXT_NODE, node and offset are the ones required
    if(node.nodeType === Node.TEXT_NODE)
        return { node, offset, xpath };

    // For ELEMENT_NODE, find the text node at the given offset
    if(node.nodeType === Node.ELEMENT_NODE)
    {
        let current_offset = 0;

        for(let child of node.childNodes)
        {
            let textLength = child.nodeType === Node.TEXT_NODE
                ?             child.data.length
                :             child.textContent.length;

            // Found the child containing this offset
            if(current_offset + textLength > offset)
                return get_NODE_AND_OFFSET(child, offset - current_offset);

            // look for more text length
            current_offset    += textLength;
        }
    }

    // nothing to look for beyond all given node children
    return { node, offset, xpath };
};
/*}}}*/
// ┌─────────────┐
// │ ORGANIZE    ●
// └─────────────┘
  /*➔ get_Matched_TEXT_array  ● called by log_visible_matched_nodes {{{*/
  let get_Matched_TEXT_array = function()
  {
    if(Matched_TEXT_array.length == 0)
    {
      for(let n = 0; n < Matched_SPAN_array.length; ++n)
        Matched_TEXT_array.push( Matched_SPAN_array[n].firstChild );
    }
//if(log_this) dom_log.log6("get_Matched_TEXT_array: ...return "+Matched_TEXT_array.length+" highlighted nodes");
    return   Matched_TEXT_array;
  }
  /*}}}*/
  /*➔ get_docFragment_array   ● called by Highlightings.get_node_docFragment and .add_highlight_css {{{*/
  let get_docFragment_array = function()
  {

//if(log_this) dom_log.log6("get_docFragment_array: ...return "+DocFragment_array.length+" highlighted nodes");
    return DocFragment_array;
  }
  /*}}}*/
  /*➔ add_docFragment         ● called by Highlightings.add_highlight_css {{{*/
  let add_docFragment = function(docFragment_el)
  {
    let id_or_class
      =(                             docFragment_el.tagName       )
      +(docFragment_el.id        ? "#"+docFragment_el.id        : "")
      +(docFragment_el.className ? "."+docFragment_el.className : "");

    // [DocumentFragment] (document object that has no parent)
    DocFragment_array.push( docFragment_el );
if(log_this) dom_log.log("%c NodeMatcher.add_docFragment %c "+DocFragment_array.length+" %c"+id_or_class
                        , dom_log.lbL+NODEMATCH_LFX
                        ,                                dom_log.lbC+dom_log.lfX[DocFragment_array.length % 10]
                        ,                                                                dom_log.lbR+dom_log.lfX[8]);

    // [ShadowRoot]
    if(docFragment_el.parentNode instanceof ShadowRoot)
    {
      ShadowRoot_array.push( docFragment_el.parentNode );
if(log_this) dom_log.log("%c .........ShadowRoot_array %c "+ShadowRoot_array.length+" %c"+id_or_class
                        , dom_log.lbL+NODEMATCH_LFX
                        ,                              dom_log.lbC+dom_log.lfX[ShadowRoot_array.length % 10]
                        ,                                                             dom_log.lbR+dom_log.lfX[8]);
    }
  };
  /*}}}*/

/* EXPORT ● can_match_query set_Match_pattern {{{*/

/*● name ● logging {{{*/
const  name = "NodeMatcher";
let    NODEMATCH_LFX;

let logging = function(state,onload)
{
  NODEMATCH_LFX = dom_log.lfX[6];
  let changed   = (state != undefined) && (log_this != state);
  if( changed   )  log_this  = state;
  if(!onload    )  dom_log.logging({ name, log_this, changed });
  return           log_this;
};
/*}}}*/
return { name
  ,      logging

  ,      clear                  // called by [new FindMode]
  ,      can_match_query        // called by [    FindMode.updateQuery] and [HUD_msg.updateQuery]
  ,      set_Match_pattern      // called by [    FindMode.updateQuery]

  ,      get_Matched_TEXT_array

  ,      get_docFragment_array
  ,      add_docFragment        // called by Highlightings.add_highlight_css

  ,      isExpandable
  ,      is_node_COLLAPSED      // called by Highlightings.highlight_query
  //DEBUG
  , get_FROM_NODE_Selection
  , get_ADJACENT_NODES_Selection
  , get_NEXT_TEXT_NODE
  , get_CHILD_TEXT_NODE
};
/*}}}*/
}());
globalThis.NodeMatcher  = NodeMatcher;
/*}}}*/

// ┌─────────────┐
// │ FindStorage ●
// └─────────────┘
/*{{{*/
let  FindStorage = (function() {
"use strict";
let log_this=false;
/*{{{*/
const STORAGE_DELAY        = 1000;
const VAL_ARRAY_LENGTH_MAX = 10;

let   storage_timeout;
/*}}}*/
/*● storage_set ● called by storage_add_handler {{{*/
let storage_set = async function(key,val)
{
if(log_this) dom_log.log1("storage_set("+key+", "+val+")");
  try {
    if(val)  await chrome.storage.local.set   ({ [key] : val });
    else           chrome.storage.local.remove(   key         );
  }
  catch(ex) { if(log_this) dom_log.log2(ex.message); }
};
/*}}}*/
/*● storage_get ● called by storage_add_handler {{{*/
let storage_get = async function(key, cb)
{
if(log_this) dom_log.log1("storage_get("+key+")");
  let val;
  try {
    val = await chrome.storage.local.get(   key  , cb   );
  }
  catch(ex) { if(log_this) dom_log.log2(ex.message); }
};
/*}}}*/
/*● storage_del ● called by .. yet never called {{{*/
let storage_del = async function(key    )
{
if(log_this) dom_log.log1("storage_del("+key+")");
  try {
    await       chrome.storage.local.remove( key );
  }
  catch(ex) { if(log_this) dom_log.log2(ex.message); }
};
/*}}}*/
/*● storage_add ● called by .. yet never called {{{*/
let storage_add  = function(key,val)
{
if(log_this) dom_log.log1("storage_add("+key+","+val+"):");

  if( storage_timeout ) clearTimeout( storage_timeout );
  storage_timeout     =   setTimeout(storage_add_handler, STORAGE_DELAY, key, val);
};

let storage_add_handler  = function(key,val)
{
//if(log_this) dom_log.log1("storage_add_handler("+key+","+val+"):");
  storage_get(key, (items) => {
//if(log_this) dom_log.log1("storage_add_handler("+key+" , "+val+"):");
    /* already stored values {{{*/
      let val_array = items[key] || [];

    /*}}}*/
    /* filter-out val-related larger and shorter values {{{*/
    let    val_str = val             .replace(/(\\.)|([\+\{\}]\d*)/g,""); // TODO: better regex cleaup
    for(let i=0; i < val_array.length; ++i)
    {
      let      old_str = val_array[i].replace(/(\\.)|([\+\{\}]\d*)/g,""); // TODO: better regex cleaup

      let stored_large = (old_str.indexOf(val_str) == 0)
      let stored_short = (val_str.indexOf(old_str) == 0)

      /* clear val-related entries */
      if( stored_large || stored_short )
        val_array[i] = "";
    }

    /* remove cleared entries */
    val_array = val_array.filter((v) => (v != ""));

    /*}}}*/
    /* CAP TO VAL_ARRAY_LENGTH_MAX .. remove oldest {{{*/
    if(val_array.length >= VAL_ARRAY_LENGTH_MAX)
    {
//if(log_this) dom_log.log1("REACHED VAL_ARRAY_LENGTH_MAX ["+val_array.length+" / "+VAL_ARRAY_LENGTH_MAX+"]");

      while(      val_array .length >= VAL_ARRAY_LENGTH_MAX) {
        let old = val_array.splice(0, 1);

//if(log_this) dom_log.log1("DROPPING OLDEST QUERY ["+old+"]");
      }
    }
    /*}}}*/
    /* ADD val {{{*/
//  val_array.unshift( val );
    val_array.push   ( val );

    /*}}}*/
    /* STORE {{{*/
    storage_set(key, val_array);

    /*}}}*/
  });
  storage_timeout = null;
};
/*}}}*/
/*● storage_pending ● called by .. yet never called {{{*/
let storage_pending = function() { return !!storage_timeout; }
/*}}}*/
/* EXPORT ● set ● get ● del ● add {{{*/

/*● name ● logging {{{*/
const  name = "FindStorage";
let    FINDSTORE_LFX;

let logging = function(state,onload)
{
  FINDSTORE_LFX = dom_log.lfX[1];
  let changed   = (state != undefined) && (log_this != state);
  if( changed   )  log_this  = state;
  if(!onload    )  dom_log.logging({ name, log_this, changed });
  return           log_this;
};
/*}}}*/
return { name
  ,      logging

  ,      storage_set
  ,      storage_get
  ,      storage_del
  ,      storage_add
};
/*}}}*/
}());
globalThis.FindStorage  = FindStorage;
/*}}}*/

// ┌──────────────┐
// │ FindPageSync ●
// └──────────────┘
/*{{{*/
let  FindPageSync = (function() {
"use strict";
let log_this=false;

// ┌──────┐
// │ SYNC ●
// └──────┘
  /*● updateActiveRegexIndices_ON_USER_SELECTION {{{*/
  let updateActiveRegexIndices_ON_USER_SELECTION = function(selection, backwards, node_array, may_use_hud=true)
  {
//(log_this) dom_log.console_clear("updateActiveRegexIndices_ON_USER_SELECTION");
//if(log_this) dom_log.log3("updateActiveRegexIndices_ON_USER_SELECTION(backwards "+backwards+")");
    /* ● NO CURRENT SELECTION {{{*/
    if(selection.rangeCount <= 0)
      return -1;

    /*}}}*/
    /* ● NOT A QUERY SELECTION {{{*/
    if( node_array.includes( selection.anchorNode ) )
      return -1;

    /*}}}*/
    /* ● PICK FIRST NODE JUST BEYOND USER SELECTION .. f(backwards) .. f(compareBoundaryPoints) {{{*/
    /* [sel_range] [findFunction] {{{*/
    let       sel_range = selection.getRangeAt(0);
/*{{{
if(log_this) {
console.log("comp_range");
console.dir( selection.getComposedRanges()[0] );
}
}}}*/
//if(log_this) dom_log.log3("....selection.anchorNode.parentElement: "+selection.anchorNode.parentElement.tagName);
    let        sel_rect = selection.anchorNode.parentElement.getBoundingClientRect();
//if(log_this) dom_log.log3("....sel_rect.top: "+ sel_rect.top);
//if(log_this) dom_log.log3("....selection.anchorNode.parentElement.offsetTop: "+selection.anchorNode.parentElement.offsetTop);
/*  let sel_docFragment = Highlightings.get_node_docFragment( selection.anchorNode ); */
    let      node_range = document.createRange();

    let                   findFunction = backwards ? Array.prototype.findLastIndex : Array.prototype.findIndex;
//if(log_this) dom_log.log3("findFunction=["+findFunction.name+"]");
//console.log ("node_array");
//console.dir ( node_array );
      /*}}}*/
    let activeNodeIndex = findFunction.apply(node_array,[(node) => {
/*{{{*/
//if(log_this) dom_log.log3("....node[# "+node.parentElement.getAttribute("data-num")+"] [offsetTop "+node.parentElement.offsetTop+"] [top "+node.parentElement.getBoundingClientRect().top+"]");
      let result;
/*}}}*/
      /* DIFFERENT DOCUMENT ● compare selection <=> nodes offsetTop {{{*/
      if( !are_nodes_in_same_document(selection.anchorNode, node) )
      {
//if(log_this) dom_log.logX("⚠ ⚠ ⚠ ⚠ DIFFERENT DOCUMENT ⚠ ⚠ ⚠ ⚠", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
/* comparing parentElement getBoundingClientRect top {{{*/
        if( node.parentElement ) {
        let        node_rect = node.parentElement.getBoundingClientRect();
//if(log_this) dom_log.log3(     "node_rect.top: "+node_rect.top);

        result = backwards
            ?     (node_rect.top < sel_rect.top)
            :     (node_rect.top > sel_rect.top);
        }
/*}}}*/
        /* no parentElement ● result = above selection {{{*/
        else {
          result = true; /* above selection */
        }
        /*}}}*/
      }
      /*}}}*/
      /* .....SAME DOCUMENT ● compare sel_range <=> node_range {{{*/
      else {
//if(log_this) dom_log.logX("....SAME DOCUMENT", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
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
      let numRows = node_array.length;
      let     msg = (backwards ? "▲ " : "▼ ")+ (activeNodeIndex+1)+" of "+numRows;
if(may_use_hud) HUD_msg.show(msg);
if(log_this) dom_log.log9("0 ⚪️⚪️⚪️⚪️ NEAR USER SELECTION: "+ msg);
    }
    /*}}}*/
    return activeNodeIndex;
  };
  /*}}}*/
  /*_ are_nodes_in_same_document {{{*/
  let are_nodes_in_same_document = function(node1,node2)
  {
/*{{{
if(log_this) {
dom_log.log3("are_nodes_in_same_document("+dom_log.get_node_xpath(node1)+", "+dom_log.get_node_xpath(node2)+")");
console.dir(node1);
console.dir(node2);
}
}}}*/

    return (node1.getRootNode() === node2.getRootNode());

  };
  /*}}}*/
  /*● updateActiveRegexIndices_ON_USER_SCROLL {{{*/
  let updateActiveRegexIndices_ON_USER_SCROLL = function(args)
  {
/* ● selection ● backwards ● node_array ● may_use_hud {{{*/
    let { selection, backwards, node_array, may_use_hud } = args;
dom_log.console_clear("updateActiveRegexIndices_ON_USER_SCROLL ● "+ (globalThis.mode_normal_scrolled_to || "(not scrolled)"));
//if(log_this) dom_log.log("%c updateActiveRegexIndices_ON_USER_SCROLL %c backwards "+backwards
//                         ,dom_log.lbL+PAGE_SYNC_LFX                 ,dom_log.lbR);
//dom_log.log("● globalThis.mode_normal_scrolled_to \t["+ globalThis.mode_normal_scrolled_to +"]");//FIXME
//dom_log.log("● backwards  \t["+ backwards  +"]");//FIXME
//dom_log.log("● selection  \t["+ selection  +"]");//FIXME
/*}}}*/
    /* ● SCROLLED TO TOP OR BOTTOM ● VIEWPORT FIRST OR LAST INDEX {{{*/
    if( globalThis.mode_normal_scrolled_to )
    {
      let targetNodeIndex;
      let msg;
      switch( globalThis.mode_normal_scrolled_to )
      {
      case "TOP":
        msg                = backwards ? "👆top" : "▲ TOP";
        /* NOT [backwards] ● VIEWPORT TOP NODE ● FIRST MATCHED NODE {{{*/
        targetNodeIndex = 0;                    // FIXME ... can be out of view!

        /*}}}*/
        /* YES [backwards] ● VIEWPORT BOT NODE {{{*/
        if( backwards ) {
          let viewBot = window.innerHeight;
          for(let row = 0; row <= (node_array.length-1); row += 1)
          {
            if(    is_node_ABOVE_Y(node_array[row], viewBot)
               && (targetNodeIndex < row)
            ) {
              targetNodeIndex = row; // nearest from VIEW BOT BELOW FIRST
//dom_log.log("👇 #"+(row+1));//FIXME
            }
          }
        }
        /*}}}*/
        break;
      case "BOT":
        msg                = backwards ? "▼ BOT" : "👇bot";
        /* YES [backwards] ● VIEWPORT BOT NODE ● LAST MATCHED NODE {{{*/
        targetNodeIndex = node_array.length -1; // FIXME ... can be out of view!

        /*}}}*/
        /* NOT [backwards] ● VIEWPORT TOP NODE {{{*/
        if(!backwards ) {
          let viewTop = 0;
          for(let row = (node_array.length-1); row >= 0; row -= 1)
          {
            if(   !is_node_ABOVE_Y(node_array[row], viewTop)
               && (targetNodeIndex > row)
            ) {
              targetNodeIndex = row; // nearest from VIEW TOP ABOVE LAST
//dom_log.log("👆 #"+(row+1));//FIXME
            }
          }
        }
        /*}}}*/
        break;
      }
      if(targetNodeIndex != undefined)
      {
        msg += (" #"+(targetNodeIndex+1))+" of "+node_array.length;

        if( may_use_hud ) HUD_msg.show( msg );
if(log_this) dom_log.log3("🟣🟣🟣🟣 "+  msg );
        return targetNodeIndex;
      }
    }
    /*}}}*/
    return updateActiveRegexIndices_ON_VISIBLE_NODES(selection, backwards, node_array, may_use_hud);
  }
  /*}}}*/
  /*● updateActiveRegexIndices_ON_VISIBLE_NODES {{{*/
  let updateActiveRegexIndices_ON_VISIBLE_NODES = function(selection, backwards, node_array, may_use_hud=false)
  {
/*{{{*/
//(log_this) dom_log.console_clear("updateActiveRegexIndices_ON_VISIBLE_NODES");
if(log_this) dom_log.log("%c updateActiveRegexIndices_ON_VISIBLE_NODES %c backwards "+backwards
                         ,dom_log.lbL+PAGE_SYNC_LFX                   ,dom_log.lbR);
/*}}}*/
    /* ● [targetNodeIndex]      ➔ f(activeNodeIndex) {{{*/

    let visible_node_rows_before = [];
    let visible_node_rows_after  = [];

    let   matched_nodes          = node_array;
    let         numRows          = node_array.length;
    let activeNodeIndex          = node_array.indexOf( selection.anchorNode );

    let targetNodeIndex;
    if( activeNodeIndex > -1 ) {
        targetNodeIndex          =  activeNodeIndex + (backwards ? -1 : 1);
        targetNodeIndex          = (targetNodeIndex +  numRows) % numRows;
    }
    else {
        targetNodeIndex          = -1;
    }
    /*}}}*/
    /* ● [ACTIVE SELECTION]     ➔ BEFORE OR AFTER SELECTION {{{*/
    if( targetNodeIndex > -1 ) {
      for(let row = targetNodeIndex; row >= (0                     ); row -= 1) {
        if(!is_node_OUTOFVIEW( matched_nodes[ row ]))
          visible_node_rows_before     .push( row );
      }
      for(let row = targetNodeIndex; row <= (matched_nodes.length-1); row += 1) {
        if(!is_node_OUTOFVIEW( matched_nodes[ row ]))
          visible_node_rows_after      .push( row  );
      }
    }
    /*}}}*/
    /* ● [NO ACTIVE SELECTION]  ➔ BELOW OR ABOVE WINDOW MID {{{*/
    else {
      let winMidY = (window.scrollY + window.innerHeight / 2).toFixed(0);
      for(let row = 0; row <= (matched_nodes.length-1); row += 1) {
          if( is_node_ABOVE_Y (matched_nodes[ row ], winMidY))
            visible_node_rows_before   .push( row  );
          else
            visible_node_rows_after    .push( row  );
      }
    }
    /*}}}*/
/*{{{
if(log_this) dom_log.log3("....activeNodeIndex=["+activeNodeIndex+"] ➔ ["+targetNodeIndex+"]");
if(log_this) dom_log.log5("visible_node_rows_before:", visible_node_rows_before);
if(log_this) dom_log.log4("visible_node_rows_after.:", visible_node_rows_after );
}}}*/
    // ┌─────────────────────────────┐
    // │ NONE VISIBLE                ●
    // └─────────────────────────────┘
    /* 1/7 ● return [     -1     ] {{{*/
    if(   (visible_node_rows_before.length < 1)
       && (visible_node_rows_after .length < 1)
    ) {
      let msg
        =    (backwards ?        "▲" : "▼")
        +" "+(backwards ?   "BEFORE" : "AFTER")
      ;
      if(targetNodeIndex > 0) msg += " "+(targetNodeIndex+1)+" of "+numRows;
      else                    msg +=                    "FIRST of "+numRows;

if(log_this) dom_log.log1("1 🟤🟤🟤🟤 NONE VISIBLE "+ msg);
      return -1;
    }
    /*}}}*/
    // ┌─────────────────────────────┐
    // │ SOME VISIBLE + CURRENT NONE ●
    // └─────────────────────────────┘
    /* ... ● [top most] ● [bot most] {{{*/
    let visible_node_rows_top_most
      = visible_node_rows_before.length ? visible_node_rows_before[visible_node_rows_before.length-1] // near TOP or if none before
      : visible_node_rows_after .length ? visible_node_rows_after [0]                                 // .... FIRST DOWN
      :                                   -1;

    let visible_node_rows_bot_most
      = visible_node_rows_after .length ? visible_node_rows_after[visible_node_rows_after.length-1]   // near BOT or if none after
      : visible_node_rows_before.length ? visible_node_rows_before[0]                                 // .... FIRST UP
      :                                   -1;
if(log_this) dom_log.log("%c top..bot %c"+ (visible_node_rows_top_most+1)+".."+ (visible_node_rows_bot_most+1), dom_log.lbL,dom_log.lbR);
    /*}}}*/
    /* 2/7 ● [ backwards] return [⮤LAST  VISIBLE] {{{*/
    if((targetNodeIndex < 0) && backwards)
    {
      targetNodeIndex = visible_node_rows_bot_most;

      let msg =      "⮤ #"+(targetNodeIndex+1)+" / "+numRows+" ● [LAST VISIBLE]";

if(may_use_hud) HUD_msg.show(msg);
if(log_this) dom_log.log2("2 🔴🔴🔴🔴 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 3/7 ● [!backwards] return [⮦FIRST VISIBLE] {{{*/
    if( targetNodeIndex < 0 )
    {
      targetNodeIndex = visible_node_rows_top_most;

      let msg =      "⮦ #"+(targetNodeIndex+1)+" / "+numRows+" ● [FIRST VISIBLE]";

if(may_use_hud) HUD_msg.show(msg);
if(log_this) dom_log.log3("3 🟠🟠🟠🟠 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    // ┌─────────────────────────────┐
    // │ SOME VISIBLE + CURRENT SOME ●
    // └─────────────────────────────┘
    /* 4/7 ● prev or  next ..........return VISIBLE[PREV OR NEXT] {{{*/
    if(   ( backwards && visible_node_rows_before.includes( targetNodeIndex ))
       || (!backwards && visible_node_rows_after .includes( targetNodeIndex ))
    ) {
      let msg = (backwards ? "▲" : "▼")
        +             " ["+(backwards ? "PREVIOUS" : "NEXT")+"]"
        +            "\t#"+(targetNodeIndex+1)+" / "+numRows;
//      +             " #"+(targetNodeIndex+1)+" / "+numRows+" ● ["+(backwards ? "PREVIOUS" : "NEXT")+"]";

if(may_use_hud) HUD_msg.show(msg);
if(log_this) dom_log.log4("4 🟡🟡🟡🟡 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 5/7 ● prev not visible .......return VISIBLE[BOT MOST] {{{*/
    if( backwards &&   (visible_node_rows_bot_most >= 0))
    {
      targetNodeIndex = visible_node_rows_bot_most;

      let msg =       "← [BOT MOST]"
      +              "\t #"+(targetNodeIndex+1)+" / "+numRows;

if(may_use_hud) HUD_msg.show(msg);
if(log_this) dom_log.log5("5 🟢🟢🟢🟢 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 6/7 ● next not visible .......return VISIBLE[TOP MOST] {{{*/
    if(!backwards &&   (visible_node_rows_top_most >= 0))
    {
      targetNodeIndex = visible_node_rows_top_most;

      let msg =      "→ [TOP MOST]"
      +              "\t#"+(targetNodeIndex+1)+" / "+numRows;

if(may_use_hud) HUD_msg.show(msg);
if(log_this) dom_log.log7("7 🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 7/7 ● ........................return VISIBLE[LAST / FIRST] {{{*/
    {
      targetNodeIndex = backwards
        ?               visible_node_rows_bot_most
        :               visible_node_rows_top_most;

      let msg =      "→ "+ (backwards ?            "[LAST VISIBLE]" : "[FIRST VISIBLE]")
      +              "\t#"+(targetNodeIndex+1)+" / "+numRows;

if(may_use_hud) HUD_msg.show(msg);
if(log_this) dom_log.log6("6 🔵🔵🔵🔵 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
  };
  /*}}}*/
  /*● updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV {{{*/
  let updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV = function(selection, backwards, node_array, may_use_hud)
  {
//(log_this) dom_log.console_clear("updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV");
if(log_this) dom_log.log("%c updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV %c backwards "+backwards
                         ,dom_log.lbL+PAGE_SYNC_LFX                   ,dom_log.lbR);
//if(selection.rangeCount <= 0) if(log_this) dom_log.logX("selection.rangeCount <= 0)", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
    let activeNodeIndex
      = (selection.rangeCount <= 0)
      ?  0
      :  node_array.indexOf( selection.anchorNode );
//if(log_this) dom_log.log3("....activeNodeIndex=["+activeNodeIndex+"]");
    /* wrapscan First {{{*/
    let   numRows = node_array.length;
    let  wrapscan = "";
    if(  backwards    && (activeNodeIndex == 0   )) {
      wrapscan    = "▲ "+(activeNodeIndex+1)+" of "+numRows+" 🔴 First";

if(may_use_hud) HUD_msg.show(wrapscan);
if(log_this) dom_log.log3("⚫⚫⚫⚫"+wrapscan );
    }
    /*}}}*/
    /* wrapscan Last {{{*/
    else if(!backwards && (activeNodeIndex       == (numRows-1))) {
      wrapscan    = "▼ "+ (activeNodeIndex+1)+" of "+numRows+" 🔴 Last";

if(may_use_hud) HUD_msg.show(wrapscan);
if(log_this) dom_log.log3("⚪️⚪️⚪️⚪️"+wrapscan );
    }
    /*}}}*/
    /* SEEK NEXT OR PREVIOUS {{{*/
    else {
      activeNodeIndex  += (backwards ? -1 : 1);
      activeNodeIndex   = (activeNodeIndex + numRows) % numRows;

      let           msg = (backwards ? "▲ " : "▼ ")+ (activeNodeIndex+1)+" of "+numRows;
if(may_use_hud) HUD_msg.show(msg);
if(log_this) {
if(backwards) dom_log.log("%c▲ ▲ ▲ ▲ SEEK BEFORE "+ msg, dom_log.lfX[5]);
else          dom_log.log("%c▼ ▼ ▼ ▼ SEEK AFTER " + msg, dom_log.lfX[4]);
}
    }
    /*}}}*/
    return [ activeNodeIndex , wrapscan ];
  };
  /*}}}*/

// ┌─────┐
// │ LOG ●
// └─────┘
/*● log_visible_regexMatchedNodes {{{*/
/*{{{*/
const CHECK_MAX = 5;

/*}}}*/
let log_visible_regexMatchedNodes = function(nodes_array, sel_row)
{
//dom_log.log3("...log_visible_regexMatchedNodes");
  log_visible_matched_nodes( nodes_array );
  /* ● row_min ● row_max {{{*/
  let row_min = Math.max(sel_row - Math.floor(CHECK_MAX/2), 0                 );
  let row_max = Math.min(row_min +            CHECK_MAX   , nodes_array.length);

      row_min = Math.min(row_min ,    row_max-CHECK_MAX  ); /* do not squeeze at end */
      row_min = Math.max(row_min , 0                     ); /* .....but not bellow 0 */
  /*}}}*/
  /* ● FIRST group {{{*/
console.group("🔴🔴 %c VISIBLE NODES", dom_log.lfX[nodes_array.length % 10]);

  /*}}}*/
  /* ● visible ● outOfView ● collapsed {{{*/

  let l_v = 4; /* visible   */
  let l_o = 8; /* outOfView */
  let l_c = 7; /* collapsed */
  dom_log.log("\t\t#__\t| HHH_YYY |\t[text] %c [visible] %c [outOfView] %c [collapsed]"
             ,                              dom_log.lfX[l_v]
             ,                                           dom_log.lfX[l_o]
             ,                                                          dom_log.lfX[l_c]);
  /*}}}*/
  let is_the_first = (row_min == 0);
  let we_have_more = (row_max  < nodes_array.length);
  for(let row = row_min; row < row_max; ++row) {
    /*  node ● num ● Y ● H {{{*/
    let node = nodes_array[row];
    let  num = ""+  row;
    let  p_y = ""+ (node.parentElement ? node.parentElement.offsetTop : 0);
    let  p_h = ""+  get_min_parent_height( node );

    while(num.length < 2) num = "_"+num;
    while(p_y.length < 3) p_y = p_y+"_";
    while(p_h.length < 4) p_h = "_"+p_h;
    /*}}}*/
    /* ● visible ● outOfView ● collapsed {{{*/
    let node_outOfView  = is_node_OUTOFVIEW( node );
    let node_collapsed  = (p_h == 0) || NodeMatcher.is_node_COLLAPSED( node );

    let l_x =  node_collapsed  ? l_c
      :        node_outOfView  ? l_o
      :                          l_v;

    let lfl
      = (row == row_min  ) ?   1 /* first */
      : (row == row_max-1) ?   2 /* last  */
      :                      l_x;

    let dot = dom_log.dot[l_x];
    /*}}}*/
    /* ● textContent {{{*/
    let  node_textContent
      = (node.textContent.length    < 100)
      ?  node.textContent
      :  node.textContent.substring(0,100);

    /*}}}*/
    /*{{{*/
    let prefix
      = (row == row_min  ) ? (!is_the_first ? "↑↑↑" : "■  ")
      : (row == row_max-1) ? ( we_have_more ? "↓↓↓" : "■  ")
      :                                       "...";

    prefix += (row == sel_row) ? " \u25B6":" ";

//  let prefix = (row == sel_row) ? "\u25B6" : "";
//  dom_log.log("%c "+prefix+"\t"+dot+"\t#"+num+"\t"+p_h+"_"+p_y+"\t%c["+ node_textContent.replace(/\n/g,"\u293E") +"]"
    dom_log.log("%c "+prefix         +"\t#"+num+"\t"+p_h+"_"+p_y+"\t%c["+ node_textContent.replace(/\n/g,"\u293E") +"]"
                ,dom_log.lfX[lfl]                                  ,dom_log.lfX[l_x]);

/*{{{
  if(row == sel_row) {
    console.log(node.parentElement.className, node.parentElement);
    for(let el = node.parentElement; el.parentElement; el = el.parentElement) {
      dom_log.log( dom_log.get_node_xpath(el) );
      console.dir( el );
    }
  }
}}}*/

    /*}}}*/
  }
//  /* ● LAST groupEnd {{{*/
//  if(row_max < nodes_array.length) dom_log.log("%c 🠋🠋🠋"      , dom_log.lfX[2]);
//  else                             dom_log.log("%c ─── LAST" , dom_log.lfX[2]);
//console.groupEnd();
//  /*}}}*/
}
/*}}}*/
/*_ log_visible_matched_nodes {{{*/
let log_visible_matched_nodes = function(nodes_array)
{
  /* Highlightings */
  let node_array = NodeMatcher.get_Matched_TEXT_array();

  // ┌──────────────────┐
  // │ Highlightings    ●
  // └──────────────────┘
  let       h_length = node_array.length;
  let l_h = h_length % 10;
//dom_log.log("%c"+ h_length +" MATCHES %c FOR NodeMatcher.set_Match_pattern ", dom_log.lfX[l_h], dom_log.lfX[5]);

  for(let h=0; h<node_array.length; ++h)
  {
    let text_node = node_array[h];
    if(!nodes_array.includes( text_node ) )
      dom_log.log("%c...node_array["+h+"] = "+dom_log.get_node_xpath(text_node),                   dom_log.lfX[5]);
  }

  // ┌──────────────────────┐
  // │ FindMode nodes_array ●
  // └──────────────────────┘
  let       n_length = nodes_array.length;
  let l_n = n_length % 10;
//dom_log.log("%c"+ n_length +" MATCHES %c FOR FindMode.updateQuery"            , dom_log.lfX[l_n], dom_log.lfX[7]);

  for(let n=0; n<nodes_array.length; ++n)
  {
    let text_node = nodes_array[n];
    if( !node_array.includes( text_node ) )
      dom_log.log("%c...nodes_array["+n+"] = "+dom_log.get_node_xpath(text_node),                   dom_log.lfX[7]);
  }

}
/*}}}*/

// ┌──────┐
// │ UTIL ●
// └──────┘
/*● get_min_parent_height {{{*/
let get_min_parent_height = function(el)
{
  if(el instanceof Node) el = el.parentElement;

  let p_h    = Infinity;
  while(el) {
    let rect = el.getBoundingClientRect();
    if((rect.height > 0) && (rect.height < p_h))
      p_h    = rect.height;
    el       = el.parentElement;
  }
  return p_h === Infinity ? 0 : p_h;
}
/*}}}*/
/*● is_node_OUTOFVIEW {{{*/
let is_node_OUTOFVIEW = function(node)
{
  if(!node.parentElement) return true;

  let   rect =  node.parentElement.getBoundingClientRect();
  let result = (rect.top    >  window.innerHeight)
    ||         (rect.bottom <                   0)
    ||         (rect.right  <                   0)
    ||         (rect.left   >  window.innerWidth )
    ||         (rect.top    <= 0                 )
  ;

//if(log_this) {
//    console.dir(node.parentElement);
//    console.log(rect);
//    dom_log.log3("is_node_OUTOFVIEW: ...return "+result);
//}
  return result;
}
/*}}}*/
/*● is_node_ABOVE_Y {{{*/
let is_node_ABOVE_Y = function(node, y)
{
  if(!node.parentElement) return true;

  let   rect =  node.parentElement.getBoundingClientRect();
  let result = (rect.top < y);

  return result;
}
/*}}}*/
  /*● is_el_or_child_of_parent_el {{{*/
  let is_el_or_child_of_parent_el = function(el, parent_el)
  {
      if(!parent_el) return false;

      while(el && (el != parent_el))
          el     = el.parentElement;

      return (el == parent_el);
  };
  /*}}}*/

/* EXPORT {{{*/

/*● name ● logging {{{*/
const  name = "FindPageSync";
let    PAGE_SYNC_LFX;

let logging = function(state,onload)
{
  PAGE_SYNC_LFX = dom_log.lfX[3];
  let changed   = (state != undefined) && (log_this != state);
  if( changed   )  log_this  = state;
  if(!onload    )  dom_log.logging({ name, log_this, changed });
  return           log_this;
};
/*}}}*/
return { name
  ,      logging

  /*     mode_find.js calls */
  ,      updateActiveRegexIndices_ON_USER_SCROLL
  ,      updateActiveRegexIndices_ON_VISIBLE_NODES
  ,      updateActiveRegexIndices_ON_USER_SELECTION
  ,      updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV
  ,      log_visible_regexMatchedNodes

  /*     Highlightings calls */
  ,      get_min_parent_height
  ,      is_el_or_child_of_parent_el
  ,      is_node_OUTOFVIEW
};
/*}}}*/
}());
globalThis.FindPageSync = FindPageSync;
/*}}}*/

// ┌─────────┐
// │ HUD_msg ●
// └─────────┘
 /*{{ {*///FIXME
let  HUD_msg = (function() {
"use strict";
let log_this=false;
/*{{{*/
const CIRCLED_DIGIT_0_9 = "⓪①②③④⑤⑥⑦⑧⑨";

let   Find_UI_el;
let   Find_LOG_el;
let   cached_queries_selected;

/*}}}*/
// ┌───────────┐
// │ QUERIES   ●
// └───────────┘
/*{{{*/
const MAX_HUD_QUERIES =   10;

const PREFIX_DEFAULT   = "⚫";
const PREFIX_SELECTED  = "➔ ";
const PREFIX_CURRENT   = "🟢";

const FIND_LOG_EL_OFF_HTML = "";//"<span>⭙</span>";//FIXME
/*}}}*/
  /*● updateQuery(rawQuery, options)    ● called by [new FindMode] and [FindMode.findInPlace] {{{*/
  let updateQuery = function(rawQuery, options={})
  {
/*{{{*/
//(log_this) dom_log.console_clear("HUD_msg.updateQuery");
if(log_this) dom_log.log(          "HUD_msg.updateQuery(options: "+ Object.keys( options ).toString()+")");

/*}}}*/
    /* Find_LOG     ● search [options.logging] {{{*/
    if( Object.keys(options).includes("logging") )
    {
      Find_LOG_set_logging( options );
      return;
    }
    /*}}}*/
    /* Find_LOG KEY ● search [options.event_key] {{{*/
    if( Object.keys(options).includes("event_key") )
    {
      Find_LOG_handle_key( options );
      return;
    }
    /*}}}*/
    /* Find_UI      ● search [options.clipboard] {{{*/
    if( Object.keys(options).includes("clipboard") )
    {
      if(options.clipboard == "clipboard_show")     hide_popup();
      else                 /* "clipboard_hide" */   show_popup();
      return;
    }
    /*}}}*/
    /* BACKDROP     ● Dimmed highlight {{{*/
    if( NodeMatcher.can_match_query(rawQuery, "HUD_msg.updateQuery") )
      Highlightings .backdrop_show("HUD_msg.updateQuery"); // show match clones over backdrop
    else
      Highlightings .backdrop_hide("HUD_msg.updateQuery"); // remove backdrop

/*}}}*/
    /* HANDLER      ● Give caller FindModeHistory.queryList some time to settle before showing in UI {{{*/
    let delay = HUD.is_showing() ?  0 : 100;
if(log_this) dom_log.log("HUD.is_showing() "+HUD.is_showing()+ " delay=["+delay+"]");

    setTimeout(updateQuery_handler, delay, rawQuery, options);
    /*}}}*/
  };
  /*}}}*/
  /*_ updateQuery_handler {{{*/
  /*{{{*/
  let historyIndex_prev;

  /*}}}*/
  let updateQuery_handler = function(rawQuery, options)
  {
/*{{{*/
  let { historyIndex , queryFilter } = options;
if(log_this)dom_log.log( "%c HUD_msg.updateQuery_handler"
                        +"%c"+ ((typeof rawQuery     != "undefined") ? ("QUERY ["+ rawQuery     +"]") : "NO QUERY" )
                        +"%c"+ ((typeof historyIndex != "undefined") ? ("INDEX " + historyIndex     ) : "NO INDEX" )
                        +"%c"+ ((typeof queryFilter  != "undefined") ? ("FILTER["+ queryFilter  +"]") : "NO FILTER")
                        +"%c options %c"+ Object.keys( options ).toString()
                        , dom_log.lbB+dom_log.lbH+HUD_MSG_LFX
                        , dom_log.lbB+dom_log.lbL+dom_log.lfX[7]                // queryFilter
                        , dom_log.lbB+dom_log.lbC+dom_log.lfX[4]                // rawQuery
                        , dom_log.lbB+dom_log.lbR+dom_log.lfX[7]                // historyIndex
                        , dom_log.lbL+dom_log.lfX[9] , dom_log.lbR+dom_log.lfX[9]
                       );
/*}}}*/
    if(!HUD.is_showing()) return;
    /* [re] (queryList FILTER) (selection / highlight) {{{*/
    let re = null;
    if( queryFilter )
    {
      let some_uppercase;
      for(let i = 0; i < queryFilter.length; ++i)
        if("ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes( queryFilter[i] )) { some_uppercase = true; break; }

      let flags
        = some_uppercase ? "g" : "gi";

      try {
        re = queryFilter
          ?   new RegExp(queryFilter, flags)
          :   null;
      }
      catch(ex) {}
    }
    /*}}}*/
    /*  [queryList] ● [first] ● [last] ● [OFFSET MARGIN] {{{*/
    let queryList = FindModeHistory.getQueryList( queryFilter );

    // BOTTOM OF THE LIST
    let list_height = Math.min(MAX_HUD_QUERIES, queryList.length);
    let first
      =             (historyIndex != undefined      )
      &&            (historyIndex >= 0              ) // -1 == user is editing queryFilter
      ?  Math.max(0, historyIndex +  1 - list_height) //  0 <= current selection (0-queryList.length)
      :  0;

    // TOP OF THE LIST <= list_height ABOVE
    let last
      = Math.min(first + list_height , queryList.length);

    // BOTTOM MOVED UP ● ADDING SOME QUERIES ABOVE [last]
    let q_num   = (historyIndex)  ? (historyIndex+ 1) : 0;
    if( q_num && (first < (q_num  - (list_height / 2)))  ) {
      first     = Math.max(q_num  - (list_height / 2) , 0          ); // FIRST DOWN  FROM SELECTION
      last      = Math.min(first  +  list_height , queryList.length); // LAST  ABOVE FIRST
      first     = Math.min(last   -  list_height , first           ); // FIRST DOWN  FROM queryList.length
      first     = Math.max(                        first , 0       ); // FIRST ABOVE 0
    }

    FindModeHistory.set_historyFirst( first ); // used by pages/hud_page.js onKeyEvent

// ┌──────────────────────────────────────────────────●
// │
// │                           ┌─────┐
// │                🠈 length 🠊 │ ■■  │ ┌─────┐
// │                           │ 15  │ │ 15  │
// │  ┌───────────┐            │ 14  │ │ 14  │ more
// │  │ ↑↑↑ older │            │ 13  │ └─────┘
// │  │ X ...  ✕  │ 🠈 last   🠊 │ 12  │
// │  │ 9 ...  ✕  │            │ 11  │
// │  │ 8 ...  ✕  │            │ 10  │ 🠈 historyIndex
// │  │ 7 ...  ✕  │            │  9  │
// │  │ 6 ...  ✕  │            │  8  │
// │  │ 5 ...  ✕  │            │  7  │
// │  │ 4 ...  ✕  │            │  6  │
// │  │ 3 ...  ✕  │            │  5  │
// │  │ 2 ...  ✕  │            │  4  │
// │  │ 1 ...  ✕  │ 🠈 first  🠊 │  3  │ 🠈 historyFirst
// │  │ ↓↓↓ newer │            │  2  │
// │  └───────────┘            │  1  │
// │                           │  0  │
// │                           └─────┘
// │
// └──────────────────────────────────────────────────●

    /*}}}*/
    /*{{{
    //  // ADD SOME OFFSET TO THE TOP ● (100% => AT THE TOP)
    //  let  ratio = (historyIndex || 0) / queryList.length;              // how close to the old part of the list
    //  let margin = parseInt(ratio * MAX_HUD_QUERIES);                   // ... proportional margin

    //  // ADD MARGIN AT THE TOP OF THE LIST
    //  last  = Math.min(last + margin         , queryList.length);       // TOP below queryList.length
    //  first = Math.max(last - MAX_HUD_QUERIES, 0               );       // BOT above 0
    }}}*/
    /* HTML ● queryList {{{*/
    let rawQueryLC = rawQuery ? rawQuery.toLowerCase() : "";

    let  html = "";
    for(let i = first ; i < last; ++i) {
      /* CSS [DELETABLE CONTAINED MATCHING] {{{*/

      let  query_text = queryList[i].trim();
      let  qt_lowCase = query_text.toLowerCase();

      let starts_with =                       queryFilter
        && qt_lowCase.startsWith(             queryFilter.toLowerCase() );

      let contained   =                       queryFilter
        && query_text.length                > queryFilter.length
        && qt_lowCase.includes( queryFilter.toLowerCase() );

      let matched    =                        queryFilter && re && re.test(query_text);

      let selected   = rawQuery
        && (   qt_lowCase == rawQueryLC)
            ||               rawQueryLC.includes( qt_lowCase );

      let query_class
        = starts_with                       ? FindPageStyle.DELETABLE_CLASS
        : contained                         ? FindPageStyle.CONTAINED_CLASS
        : selected                          ? FindPageStyle.QSELECTED_CLASS
        : matched                           ? FindPageStyle.FILTERING_CLASS
        :                                     FindPageStyle.QUERYTEXT_CLASS
      ;
/*{{{
      let query_innerHTML
        =  matched   ? query_text.replace(re, queryFilter)
        :              query_text;

      let query_html = "<span class='"+query_class+"'>"+ query_innerHTML +"</span>"
}}}*/
      let query_html
        =  matched   ? query_text.replace(re, "<span class='"+query_class+"'>"+ "$&"       +"</span>")
        :                                     "<span class='"+query_class+"'>"+ query_text +"</span>";
      /*}}}*/
      /* DEL_BUTTON {{{*/
      let del_b_class = FindPageStyle.DEL_QUERY_CLASS;
      let del_html   = "<span class='"+del_b_class+"' data-pattern='"+          query_text +"'>✕</span>";

      /*}}}*/
      /* PREFIX ➔ currently selected indicator {{{*/
    //let     idx = (last-i-1) % 10;
      let     idx = (i-first ) % 10;

      let  prefix = (qt_lowCase == rawQueryLC) ? "<span>"+ PREFIX_SELECTED       +"</span>"
        :                                        "<span>"+ PREFIX_DEFAULT        +"</span>" ;

      let n_style = "color: light-dark("+dom_log.ecc[idx]+", "+dom_log.ecc[idx]+"); opacity: 50%;";

      let num     = "<span style='"+n_style+"'>&nbsp;"  + CIRCLED_DIGIT_0_9[idx] +"</span>" ;

      /*}}}*/
      /* HTML = NUM ● PREFIX ● QUERY ● DEL_BUTTON {{{*/
      html
         = "<span>"+num+" "+prefix+" "+query_html+" "+del_html+"</span>"+(html ? "\n": "")
        +   html
      ;

      /*}}}*/
    }
    /*}}}*/
    /* HTML = older ● newer {{{*/
    let older
      =  Math.max(0, queryList.length - list_height - first);

    html
      = (older ? "<span class='"+FindPageStyle.HEAD_FOOT_CLASS+"'> ↑↑↑\t"+older+" older</span>"
         :       "<span class='"+FindPageStyle.FOOT_DIMM_CLASS+"'> ■■■\t"+    "no older</span>")
      +       "\n"+html+"\n"
      + (first ? "<span class='"+FindPageStyle.HEAD_FOOT_CLASS+"'> ↓↓↓\t"+first+" newer</span>"
         :       "<span class='"+FindPageStyle.FOOT_DIMM_CLASS+"'> ■■■\t"+    "no newer</span>")
    ;

    /*}}}*/
    /* HLOG = last ● first ● historyIndex ● filter {{{*/
    let filter = (queryFilter) ? (re || queryFilter) : "no filter";
//  let fclass = (queryFilter) ? FindPageStyle.HEAD_FOOT_CLASS : FindPageStyle.FOOT_DIMM_CLASS;

    let idx
      = (historyIndex == undefined) ? "?" : historyIndex;

    let log_html
        = "<span class='"+ FindPageStyle.DELETABLE_CLASS                           +"'>"+ "deletable"                                     +"</span>\n"
        + "<span class='"+ FindPageStyle.CONTAINED_CLASS                           +"'>"+ "contained"                                     +"</span>\n"
        + "<span class='"+ FindPageStyle.FILTERING_CLASS                           +"'>"+ "selected"                                      +"</span>\n"
        + "<span class='"+ FindPageStyle.QSELECTED_CLASS                           +"'>"+ "qselected"                                     +"</span>\n"
        + "<span class='"+ FindPageStyle.QUERYTEXT_CLASS                           +"'>"+ "matched"                                       +"</span>\n"
        +                                                                                                                                       "<hr>"
        + "<span title='last = "        +(last-1)                                  +"'>"+ "\u25B2 "+(last-1) +"\t["+queryList[last-1]+"]" +"</span>\n"
        + "<span title='first = "       + first                                    +"'>"+ "\u25BC "+(first ) +"\t["+queryList[ first]+"]" +"</span>\n"
        + "<span style='color: light-dark("+dom_log.ecc[idx]+", "+dom_log.ecc[idx]+")'>"+ "\u25B6 "+(idx   ) +"\t" +filter                +"</span>"
      ;
    /*}}}*/
    /* show {{{*/
    update_popup(html, log_html, "updateQuery_handler");

    /*}}}*/
    /* HTML ● TITLE {{{*/
    let el = document.getElementById("Find_UI");
    if( el )
    {
      let title = "";
      Array.from( queryList ).forEach((q,i) => title += i+" "+q+"\n"+(((i+1) % 5) ? "":"\n"));
      el.title  = title;
    }
    /*}}}*/
  };
  /*}}}*/
// ┌───────────┐
// │ SHOW HIDE ●
// └───────────┘
/*_ window_resize_handler {{{*/
/*{{{
let window_resize_handler_timeout;
}}}*/
let window_resize_handler = function(e)
{
/*{{{
console.log("e.eventPhase=["+e.eventPhase+"]");
console.dir(e);
  if(window_resize_handler_timeout) clearTimeout( window_resize_handler_timeout );
     window_resize_handler_timeout = setTimeout(() => { window_resize_handler_timeout = null; Find_LOG_layout(); }, 250);
}}}*/
  Find_LOG_layout();

};
/*}}}*/
  /*● show(text,duration) {{{*/
/*{{{*/
const MSG_SKIPPING               = "🔴 Skipping #";

let   hud_text;
let   hud_timeout;
let   hud_text_postponed_while_skipping;
/*}}}*/
  let show = function(text, duration)
  {
/*{{{
if(log_this) dom_log.log("show("+text+")");
}}}*/
    /* hud_text {{{*/
    if(     !hud_text               ) hud_text = "";
    else if( hud_text.includes(text)) return;

    /*}}}*/
    /* While Skipping .. only accept more skipping messages {{{*/
    if( hud_text.includes(        MSG_SKIPPING ) ) {
      if(text.startsWith(         MSG_SKIPPING ) ) {
        text = ","+text.substring(MSG_SKIPPING.length);
      }
      else {
        hud_text_postponed_while_skipping = text;
        return;
      }
    }
    /*}}}*/
    /* set or append   .. unless more in same direction [ONLY ONE] of [NEXT OR PREVIOUS] {{{*/
    else if(
//          (    text.startsWith("▲") ||     text.startsWith("▼"))
//  &&      (hud_text.startsWith("▲") || hud_text.startsWith("▼"))
            text.match(/^\W/i)
    ) {
      hud_text = "";
    }

    if(hud_text.length > 0          ) hud_text += " " +text;
    else                              hud_text  =      text;

    /*}}}*/
    /* show for duration {{{*/
    HUD.show(hud_text, duration);

    /* then hide after duration */
    if( hud_timeout  ) clearTimeout( hud_timeout );
    if( duration ) {
      hud_timeout =        setTimeout(() => {
        hud_text  = "";
        if( hud_text_postponed_while_skipping)
        {
          show( hud_text_postponed_while_skipping, 1000);
          hud_text_postponed_while_skipping = "";
        }
      }, duration+500);
    }
    /*}}}*/
  };
  /*}}}*/
  /*_ update_popup(html,log_html) {{{*/
  let update_popup = function(html,log_html,_caller)
  {
//if(log_this) dom_log.log9("HUD_msg.update_popup(html "+html+") ● called by "+_caller);
    /* Find_UI_el ● hide_popup_fade_observer {{{*/
    if(!Find_UI_el)
    {
      Highlightings.add_highlight_css( document.body );

      Find_UI_el                 = document.createElement("DIV");
      Find_UI_el.id              = FindPageStyle.FIND_UI_POPUP_ID;
      Find_UI_el.style.position  = "fixed";
      document.body.appendChild( Find_UI_el  );

      Find_LOG_el                = document.createElement("DIV");
      Find_LOG_el.id             = FindPageStyle.FIND_LOGPANEL_ID;
      Find_LOG_el.innerHTML      = FIND_LOG_EL_OFF_HTML;
      Find_LOG_el.style.position = "fixed";
      document.body.appendChild( Find_LOG_el );

      /* display synchronized with [hide_popup] */
      HUD.add_fade_observer( hide_popup_fade_observer );

      /* click */
      Find_UI_el .addEventListener("mousedown", Find_UI_click_listener );
    }
    /*}}}*/
    /* html ● update {{{*/
    if(typeof html          != "undefined")
      Find_UI_el.innerHTML   = html;

    /*}}}*/
    /* log_html ● update .. f(logging) {{{*/
    Find_LOG_el.log_html
      = log_html;

    let logging
      = Find_LOG_el.classList.contains("logging");

    Find_LOG_el.innerHTML
      = logging
      ? Find_LOG_el.log_html
      : FIND_LOG_EL_OFF_HTML;
    /*}}}*/
    /* Find_UI_el ● display ● top left {{{*/
    show_popup();

    Find_LOG_layout();
    /*}}}*/
  };
  /*}}}*/

/*_ Find_UI_click_listener {{{*/
let Find_UI_click_listener = function(e)
{
if(log_this) dom_log.log("%c Find_UI_click_listener %c"+e.target, dom_log.lbL,dom_log.lbR);
  /* [del_el] ● remove a single query from history {{{*/
  let del_el = (e.target && e.target.classList.contains(FindPageStyle.DEL_QUERY_CLASS)) ? e.target : null;
  if( del_el )
  {
    /* handles mousedown and prevents click that would dismiss the HUD */
    dom_log.preventDefault(e);

    /* 1/3 ● UPDATE query history list */
    let pattern = del_el.getAttribute("data-pattern");
if(log_this) dom_log.log2("...data-pattern=["+pattern+"]");

    let queryFilter = FindModeHistory.preserve_queryFilter();
    FindModeHistory.delete_pattern_from_queryList( pattern );

    /* 2/2 ● cancel next HIDING */
//    hide_popup_cooldown_start("Find_UI_click_listener");

    let rawQuery = queryFilter;
    updateQuery_handler(rawQuery, { queryFilter });
  }
  /*}}}*/
};
/*}}}*/

/*_ Find_LOG_set_logging {{{*/
let Find_LOG_set_logging = function(options)
{
  /* current */
  let logging
    = Find_LOG_el.classList.contains("logging");

  /* adjust */
  switch(     options.logging ) {
  case          true: logging =     true; break;
  case         false: logging =    false; break;
  default /*toggle*/: logging = !logging;
  }

  /* new */
  if(logging) Find_LOG_el.classList.add   ("logging");
  else        Find_LOG_el.classList.remove("logging");

  /* html content */
  Find_LOG_el.innerHTML
    = logging
    ? Find_LOG_el.log_html
    : FIND_LOG_EL_OFF_HTML

  /* adjust layout */
  Find_LOG_layout();
};
/*}}}*/
/*_ Find_LOG_layout {{{*/
/*{{{*/
const FIND_LOG_EL_MAX_WIDTH = 300;
const HUD_MARGIN_LEFT       =   6;
const HUD_MARGIN            =  34;

/*}}}*/
let Find_LOG_layout = function()
{
/*{{{*/
  let hud_rect = HUD.getBoundingClientRect();
//console.log("Find_LOG_layout: hud_rect.width=["+ hud_rect.width +"]");//FIXME
  if(!hud_rect || !hud_rect.width ) return;

  let top   = hud_rect.bottom - 58; // SEE content_scripts/vimium.css ● height from 58px to 50%;
  let left  = hud_rect.left;
  let right = hud_rect.right;
  let width = hud_rect.width;
/*}}}*/
  /* Find_UI_el  {{{*/
  if(Find_UI_el && Find_UI_el.style.display != "none")
  {
    let  fui_rect             = Find_UI_el.getBoundingClientRect();
    Find_UI_el.style.top      = (top   -fui_rect.height     )+"px";
    Find_UI_el.style.left     = (left  +HUD_MARGIN_LEFT     )+"px";
    Find_UI_el.style.width    = (width -HUD_MARGIN          )+"px";

    top = fui_rect.top;
  }
  /*}}}*
  /*  Find_LOG_el {{{*/
  if( Find_LOG_el.style.display != "none")
  {
    let  log_rect             = Find_LOG_el.getBoundingClientRect();
    Find_LOG_el.style.top     = (top   -log_rect.height -  2)+"px";
    Find_LOG_el.style.left    = (right -log_rect.width  - 10)+"px";
    /* keep min-width growing with logging content {{{*/
    if( Find_LOG_el.classList.contains("logging") )
    {
      let currentWidth    =             Find_LOG_el.offsetWidth;
      let currentMinWidth = parseFloat( Find_LOG_el.style.minWidth ) || 0;
      if( currentWidth    > currentMinWidth)
        Find_LOG_el.style.minWidth = currentWidth+"px";
    }
    /*}}}*/
  }
  /*}}}*/
};
/*}}}*/
/*_ Find_LOG_handle_key {{{*/
/*{{{*/
let   ctrl_el_array;
/*}}}*/
let Find_LOG_handle_key = function(options)
{
if(log_this) dom_log.log("%c Find_LOG_handle_key %c event_key=["+options.event_key+"%c event_type=["+options.event_type+"]"
                        , dom_log.lbL           ,dom_log.lbC                       ,dom_log.lbR                            );
  if(!options.event_key || !options.event_key.includes("Control") ) {
if(log_this) dom_log.log("...%c event_key "+options.event_key+" not handled", dom_log.lbH+dom_log.lfX[6]);
    return;
  }
  /* [ctrl_el_array] {{{*/
  if(!ctrl_el_array) {
    ctrl_el_array = [];
    let el;
    el = document.getElementById(FindPageStyle.FIND_LOGPANEL_ID); if(el) ctrl_el_array.push( el );
    el = document.getElementById(FindPageStyle.FIND_UI_POPUP_ID); if(el) ctrl_el_array.push( el );
  }
  /*}}}*/
  /* lit .. f(event_type: "keydown") {{{*/
  let keydown = options.event_type == "keydown";
  ctrl_el_array.forEach((el) => {
    if(keydown) el.classList.add   ("lit");
    else        el.classList.remove("lit");
if(log_this) dom_log.log("...%c"+el.id+"."+el.className, dom_log.lfX[keydown ? 2:8]);
  });
  /*}}}*/
};
/*}}}*/

/*_ hide_popup_cooldown_start {{{*/
/*{{{*/
let hide_popup_cooldown_callers = "";
let hud_pop_el_click_cooldown_timeout;

/*}}}*/
let hide_popup_cooldown_start = function(_caller)
{
  hide_popup_cooldown_callers += " "+_caller;

  if(hud_pop_el_click_cooldown_timeout) clearTimeout( hud_pop_el_click_cooldown_timeout );
  hud_pop_el_click_cooldown_timeout     = setTimeout( function() { hud_pop_el_click_cooldown_timeout = null; hide_popup_cooldown_callers =   ""; } , 1000);
};
/*}}}*/
/*_ hide_popup_fade_observer {{{*/
  let hide_popup_fade_observer = function()
  {
if(log_this) dom_log.log9("hide_popup_fade_observer");

    if( !hud_pop_el_click_cooldown_timeout )
      hide_popup();
    else if(log_this)
      dom_log.log7("...hiding prevented by "+ hide_popup_cooldown_callers);
  };
  /*}}}*/
  /*_ hide_popup {{{*/
  let hide_popup = function(names)
  {
    if(!Find_UI_el) return;

if(log_this) dom_log.log("%c HUD_msg.hide_popup %c"+names
                         ,dom_log.lbL+dom_log.lfX[7]
                         ,                      dom_log.lbR+dom_log.lfX[7]);

    /* POPUP */
    if(!names || names.includes( "Find_UI"  )) Find_UI_el .style.display = "none";
    if(!names || names.includes( "Find_LOG" )) Find_LOG_el.style.display = "none";

    /* BACKDROP */
    Highlightings.backdrop_hide( "HUD_msg.hide_popup" ); //FIXME
  };
  /*}}}*/
  /*_ show_popup {{{*/
  let show_popup = function(names)
  {
    if(!Find_UI_el) return;

if(log_this) dom_log.log("%c HUD_msg.show_popup %c"+names
                         ,dom_log.lbL+dom_log.lfX[7]
                         ,                      dom_log.lbR+dom_log.lfX[7]);

    /* POPUP */
    if(!names || names.includes( "Find_UI"  )) Find_UI_el .style.display = "block";
    if(!names || names.includes( "Find_LOG" )) Find_LOG_el.style.display = "block";
  };
  /*}}}*/

// ┌─────────┐
// │ EXPORT  ●
// └─────────┘
/*{{{*/

/*● name ● logging {{{*/
const  name = "HUD_msg";
let    HUD_MSG_LFX;

let logging = function(state,onload)
{
  HUD_MSG_LFX   = dom_log.lfX[9];
  let changed   = (state != undefined) && (log_this != state);
  if( changed   )  log_this  = state;
  if(!onload    )  dom_log.logging({ name, log_this, changed });
  return           log_this;
};
/*}}}*/
return { name
  ,      logging
  ,      MAX_HUD_QUERIES

  ,      show
  ,      updateQuery
  ,      Find_LOG_set_logging
  ,      window_resize_handler
//DEBUG
  , Find_LOG_layout
  , hide_popup
};
/*}}}*/
}());
globalThis.HUD_msg  = HUD_msg;
/*}}}*/

/* dom_util {{{
// $RPROFILES/script/dom_util.js
}}}*/
//{{{ NOTE ● Node [nodeType]
// ┌──────────────────────────────────────┐
// │  1 ● Node.ELEMENT_NODE
// │  2 ● Node.ATTRIBUTE_NODE
// │  3 ● Node.TEXT_NODE
// │  4 ● Node.CDATA_SECTION_NODE
// │  7 ● Node.PROCESSING_INSTRUCTION_NODE
// │  8 ● Node.COMMENT_NODE
// │  9 ● Node.DOCUMENT_NODE
// │ 10 ● Node.DOCUMENT_TYPE_NODE
// │ 11 ● Node.DOCUMENT_FRAGMENT_NODE
// └──────────────────────────────────────┘
//}}}
/* NOTE ● shadow DOM {{{
https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
}}}*/
/*{{{
vim: sw=2
}}}*/

