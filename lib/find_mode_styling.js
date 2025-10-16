/* ┌────────────────────────────────────────────────────────────────────────┐ */
/* │ lib/find_mode_styling.js ........................ _TAG (251016:23h:43) │ */
/* └────────────────────────────────────────────────────────────────────────┘ */
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console         */
/* globals chrome          */
/* globals HUD             */
/* globals dom_log         */
/* globals setTimeout      */
/* globals clearTimeout    */

/* globals FindMode         */
/* globals vimium_mode_find */

/* exported Highlightings  */
/* exported FindPageSync   */
/* exported HUD_msg        */

/*}}}*/

// ┌───────────────┐
// │ Highlightings │
// └───────────────┘
let  Highlightings = (function() {
"use strict"; /*{{{*/
const AUTO_CENTER_VIEW_ON_SELECTION = true;
/* const {{{*/
/* This class manages the highlighting */
/* Logic of this feature is from the extension https://github.com/rogershen/chrome-regex-search */

const CLASS_OUTOFVIEW       = "outofview";
const CLASS_COLLAPSED       = "collapsed";
const CLASS_SELECTION       = "selection";

const SCROLL_MARGIN         = "100";

const HIGHLIGHT_MIN_H       =   10;
const HIGHLIGHT_MIN_W       =   24;
const HIGHLIGHT_MAX_H       =  100;
const HIGHLIGHT_MAX_W       = 1000;
const HIGHLIGHTNODE_ID      = "VimiumSelection";

const HIGHLIGHT_DURATION    = 2000;
const BLINK_TIMEOUT_DELAY   =  250;
const HIGHLIGHT_DELAY       =  300;

const DEFAULT_MAX_RESULTS   = 500;
const HIGHLIGHT_TAG         = "VimiumMatch";
const UNEXPANDABLE          = /(script|style|svg|audio|canvas|figure|video|select|input|textarea)/i;

let   highlightNode_el;
let   highlight_timeout;
let   blink_timeout;

let   Matched_SPAN_array    = [];
let   Matched_TEXT_array    = [];
let   Containers_array      = [];
let   ShadowRoot_array      = [];

let   Containers_CSS;

/*}}}***/
/* const {{{*/
const NODE_COLLAPSED        = "COLLAPSED";
const NODE_OUTOFVIEW        = "OUT OF VIEW ";
const NODE_SELECTION        = "SELECT_NODE";

/*}}}*/
    /*➔ clear {{{*/
    /* Remove all highlights from page */
    let clear = function() {
dom_log.log4("🟡🟡🟡🟡 clear()");

      Matched_SPAN_array .forEach((el) => { if(el.parentNode) el.outerHTML = el.innerHTML; });

      Matched_SPAN_array = [];
      Matched_TEXT_array = [];
    }
    /*}}}*/
    /*➔ set_Match_pattern {{{*/
    let set_Match_pattern = function( pattern )
    {
dom_log.log3("🟠🟠🟠 set_Match_pattern("+pattern+")");
//dom_log.log_caller();
        /* CLEAR {{{*/
        clear();

        /*}}}*/
        /* highlight_regex_from_node .. f(children ●●● TextNode) {{{*/

      /* Collect all element tree for TEXT_NODE */
        let highlight_regex_from_node = function(node) {
//                   dom_log.log8( dom_log.get_node_xpath(node) );
//if(node.className) dom_log.log8( node.className );
          /* Cap max {{{*/
            if(        Matched_SPAN_array.length >= DEFAULT_MAX_RESULTS)
                return Matched_SPAN_array.length;

          /*}}}*/
          /* SKIP collapsed nodes {{{*/
          if( is_node_COLLAPSED( node ) )
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
                    let matched_node = document.createElement( HIGHLIGHT_TAG );

                    matched_node.appendChild( text_node.cloneNode(true) );
                    text_node.parentNode.replaceChild(matched_node, text_node);

                    Matched_SPAN_array.push( matched_node );

                    return 1;
                }
            }
          /*}}}*/
          /* 2/2 or search subtree ...return (0 more selection) {{{*/
          else if( isExpandable(node) )
          {
            let children = node.childNodes;

            /* shadowRoot nodes */
            if((children.length < 1) && node.shadowRoot)
            {
              children   = node.shadowRoot.childNodes;

              /* shadowRoot highlight css */
              if(children.length && isExpandable( node.shadowRoot.firstElementChild ))
                add_highlight_css( node.shadowRoot.firstElementChild );

            }
            for(let i=0; i < children.length; ++i)
                i += highlight_regex_from_node(  children[i] );

          }
          return 0;
          /*}}}*/
        };
        /*}}}*/
        /* start search from body top element {{{*/
        add_highlight_css( document.body );

        highlight_regex_from_node( document.body );
        /*}}}*/
      /* add color into classList .. f(row) {{{*/
      let      nb = Matched_SPAN_array.length;
      for(let row = 0; row < nb; ++row) {
        let   num =    row+1;
        let  node = Matched_SPAN_array[ row ];
        node.classList.add(     "ecc"+(num  %  10));            /* color */
        node.setAttribute ("data-num", num+"/"+nb );            /* superscript content attr(data-num) */
      }
      /*}}}*/
/*{{{*/
let match_count = Matched_SPAN_array.length;
dom_log.log4("🟡🟡🟡🟡 FOUND "+match_count+" MATCHES for "+pattern);
/*}}}*/
      return match_count;
    }
    /*}}}*/
  /*➔ get_Matched_SPAN_array {{{*/
/*{{{
  let get_Matched_SPAN_array = function()
  {
    dom_log.log("get_Matched_SPAN_array: ...return "+Matched_SPAN_array.length+" highlighted nodes");

    return Matched_SPAN_array;
  }
}}}*/
  /*}}}*/
  /*➔ get_Matched_TEXT_array {{{*/
  let get_Matched_TEXT_array = function()
  {
    if(Matched_TEXT_array.length == 0)
    {
      for(let n = 0; n < Matched_SPAN_array.length; ++n)
        Matched_TEXT_array.push( Matched_SPAN_array[n].firstChild );
    }
//dom_log.log("get_Matched_TEXT_array: ...return "+Matched_TEXT_array.length+" highlighted nodes");
    return   Matched_TEXT_array;
  }
  /*}}}*/
  /*➔ get_node_container {{{*/
  let get_node_container = function(node)
  {
    let container = null;
    for(let i= 0; i < Containers_array.length; ++i)
    {
      let parent = Containers_array[i];
      if( FindPageSync.is_el_or_child_of_parent_el(node, parent) )
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

// ┌──────┐
// │ UTIL │
// └──────┘
/*● is_node_COLLAPSED {{{*/
/*{{{*/
const MIN_VISIBLE_PARENT_HEIGHT  = 5;

/*}}}*/
let is_node_COLLAPSED = function(node,verbose)
{
  /* MIN_VISIBLE_PARENT_HEIGHT */
  let    p_h =  FindPageSync.get_min_parent_height( node );
  let result = (p_h < MIN_VISIBLE_PARENT_HEIGHT);

  if(verbose && result) {
    console.dir(node.parentElement);
    console.log ("Parent Min Height = "+p_h);
    dom_log.log8("is_node_COLLAPSED: ...return "+result);
  }
  return  result;
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

// ┌───────┐
// │ STYLE │
// └───────┘
  /*● highlight_query ● CALLED BY execute {{{*/
  let highlight_query = function(backwards,row,nodes_array)
  {
    /* 1/3 ● NODE_COLLAPSED {{{*/
    let       node = nodes_array[ row ];
    let highlight_why;
    if(!highlight_why && is_node_COLLAPSED( node ))
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
        highlight_node(node, highlight_why, row);

    FindStorage.storage_add(vimium_mode_find.VIMIUM_QUERY_KEY, FindMode.query.rawQuery);
  };
  /*}}}*/
  /*_ highlight_node {{{*/
  let highlight_node = function(node, why, row)
  {
/*{{{*/
let l_x = (why == NODE_COLLAPSED) ? 1
  :       (why == NODE_OUTOFVIEW) ? 9
  :       (why == NODE_SELECTION) ? 5 : 2;
let dot = dom_log.dot[l_x];
dom_log.log(dot+ dot + dot + dot + dot+"%c highlight_node("+why+")", dom_log.lfX[l_x]);
/*}}}*/
    /* ● INIT highlightNode_el {{{*/
    if( !highlightNode_el )
    {
      highlightNode_el    = document.createElement("DIV");
      highlightNode_el.id = HIGHLIGHTNODE_ID;

      document.body.appendChild( highlightNode_el );
    }
    /*}}}*/
    /*  highlight_timeout  {{{*/
    if( highlight_timeout ) {
      clearTimeout(highlight_timeout);

      highlight_timeout = null;
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
        : (blink_timeout) ? "BLINKING"
        :                        undefined;

      /* ALSO BLINK IF: ● BIG MOVE */
      if(!blink_required )
      {
        rect    = highlightNode_el.getBoundingClientRect();
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
/* TODO ● highlightNode_el has to cope with smooth scrolling (piggybacked on selection to scroll along with it) */
    let e_h  = Math.max(HIGHLIGHT_MIN_H , Math.min( HIGHLIGHT_MAX_H     , n_h ));
    let e_w  = Math.max(HIGHLIGHT_MIN_W , Math.min( HIGHLIGHT_MAX_W     , n_w ));
    let e_y  = Math.max(0                    , Math.min( window.innerHeight - e_h , n_y ));
    let e_x  = Math.max(0                    , Math.min( window.innerWidth  - e_w , n_x ));

    let hel  = highlightNode_el;
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
    hel.className             = (why == NODE_OUTOFVIEW) ? CLASS_OUTOFVIEW
      :                        (why == NODE_COLLAPSED) ? CLASS_COLLAPSED
      :                      /*(why == NODE_SELECTION)*/ CLASS_SELECTION;

    hel.className            += "  bg"+row%10;
    /*}}}*/
    /* ● BLINK ANIMATION .. f(scrolled or postponed blink) {{{*/
    if( blink_required )
    {
dom_log.log(dot+ dot + dot + dot + dot+"%c blink_required: "+blink_required, dom_log.lfX[l_x]+dom_log.lbF);
      if(blink_timeout) clearTimeout(      blink_timeout );

      blink_timeout   =   setTimeout(() => {
        blink_timeout = null;
        highlightNode_el.classList.add("blink");
      },BLINK_TIMEOUT_DELAY);
    }
    /*}}}*/
    /* ● TRAIL ANIMATION {{{*/
    let al = highlightNode_el.active_el;
    if( al ) {
      al.classList.add("vimium_active");
      setTimeout(() => al.classList.remove("vimium_active"), 2000);
    }
    highlightNode_el.active_el = node.parentElement;

/*{{{
    setTimeout(() => highlightNode_el.style.display = "none",         HIGHLIGHT_DELAY     );
    setTimeout(() => highlightNode_el.style.display = "inline-block", HIGHLIGHT_DELAY+  50);
    setTimeout(() => highlightNode_el.style.display = "none",         HIGHLIGHT_DELAY+  80);
}}}*/
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
    highlightNode_el  .classList.remove("hidden");

    highlight_timeout = setTimeout(() => {
      highlightNode_el.classList.remove("blink" );
      highlightNode_el.classList.add   ("hidden");
    },HIGHLIGHT_DURATION);
    /*}}}*/
  }
  /*}}}*/
    /*● outline_activeNode {{{*/
    let outline_activeNode = function()
    {
      highlightNode_el.style.outlineColor   = "red";
      highlightNode_el.style.outlineWidth   = "4px";
      highlightNode_el.style.transform      = "scale(1.5)";

      setTimeout(() => {
        highlightNode_el.style.outlineColor = "";
        highlightNode_el.style.outlineWidth = "";
        highlightNode_el.style.transform    = "";
      }, 500);
    }
    /*}}}*/
    /*. add_highlight_css {{{*/
    let add_highlight_css = function(container_el)
    {
      if(!Containers_array.includes( container_el ) )
      {
dom_log.log7("add_highlight_css("+container_el.tagName+"."+container_el.className.replace(/\n/g,"\u21B2")+")");

//console.log("container_el");
//console.dir( container_el );
        Containers_array.push( container_el            );

//console.log("container_el.parentNode");
//console.dir( container_el.parentNode );

        if(container_el.parentNode instanceof ShadowRoot)
          ShadowRoot_array.push( container_el.parentNode );

        container_el.appendChild( get_highlight_css().cloneNode( true ) );
      }
    }
    /*}}}*/
    /*. get_highlight_css {{{*/
    let get_highlight_css = function()
    {
      if(       Containers_CSS )
        return( Containers_CSS );

      let el       = document.createElement("STYLE");
      el.id        = "Containers_CSS";
      el.type      = "text/css";

      el.innerHTML =`
#${HIGHLIGHTNODE_ID}                    { z-index         : 2147483647; }
#${HIGHLIGHTNODE_ID}                    { position        :   absolute; }
#${HIGHLIGHTNODE_ID}                    { border-radius   :      0.4em; }
#${HIGHLIGHTNODE_ID}                    { outline-style   :      solid; }
#${HIGHLIGHTNODE_ID}                    { outline-offset  :        0px; }
#${HIGHLIGHTNODE_ID}                    { outline-width   :        1px; }
#${HIGHLIGHTNODE_ID}                    { white-space     :   pre-line; }

#${HIGHLIGHTNODE_ID}                    { background-color:       #FFF; }
#${HIGHLIGHTNODE_ID}                    {            color:       #000; }

#${HIGHLIGHTNODE_ID}.${CLASS_OUTOFVIEW} { outline-style   :     dashed; }
#${HIGHLIGHTNODE_ID}.${CLASS_COLLAPSED} { outline-style   :     dotted; }
#${HIGHLIGHTNODE_ID}.${CLASS_SELECTION} { outline-style   :      solid; }

#${HIGHLIGHTNODE_ID}.hidden {
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

 ${HIGHLIGHT_TAG}                  { border-radius   :      0.4em; }
 ${HIGHLIGHT_TAG}                  { outline-style   :      solid; }
 ${HIGHLIGHT_TAG}                  { outline-offset  :        0px; }
 ${HIGHLIGHT_TAG}                  { outline-width   :        2px; }

#hud_pop_el {
 background-color: #222E;
}
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

 ${HIGHLIGHT_TAG}::after { position: absolute; transform: translate(10%,-50%); }
 ${HIGHLIGHT_TAG}::after { font-size: 80%; font-weight: 100; color: #FFF; text-shadow: 1px 1px black; letter-spacing: 0.2em; }

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

      Containers_CSS = el;
      return( Containers_CSS );
    }
    /*}}}*/

// ┌────────┐
// │ SCROLL │
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
  dom_log.log9("scroll_listener");

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
  else {
    globalThis.removeEventListener("scroll",   scroll_listener);

    scrolledTo        = { x: globalThis.scrollX , y: globalThis.scrollY };
    scrolledTo_top    = (                      window.scrollY  == 0);
    scrolledTo_bottom = ((window.innerHeight + window.scrollY) >= document.body.offsetHeight);
dom_log.log9("scroll_listener_DONE: "+(scrolledTo_top ? " TOP" : (scrolledTo_bottom ? " BOTTOM" : window.scrollY)));
  }
};
/*}}}*/
/*_ get_scrolled_by_user {{{*/
let get_scrolled_by_user = function()
{
  let first_since_load = (scrolledTo          == undefined);
  let while_scrolling  = (scroll_DONE_timeout != null     );

  /*..........................................*/ let scrolled_by_user;     let details;
  if     (first_since_load                           ) { scrolled_by_user =  true; details = "first_since_load" ; }
  else if(while_scrolling                            ) { scrolled_by_user = false; details = "while_scrolling"  ; }
  else if(globalThis.mode_normal_scrolled_to == "TOP") { scrolled_by_user =  true; details = "scrolled to TOP"  ; }
  else if(globalThis.mode_normal_scrolled_to == "BOT") { scrolled_by_user =  true; details = "scrolled to BOT"  ; }
  else if(scrolledTo.y      != globalThis.scrollY    ) { scrolled_by_user =  true; details = "scrollY"          ; }
  else if(scrolledTo.x      != globalThis.scrollX    ) { scrolled_by_user =  true; details = "scrollX"          ; }
  else                                                 { scrolled_by_user = false; details = "not scrolled"     ; }

//delete globalThis.mode_normal_scrolled_to; // set by content_scripts/mode_normal.js

/*if( first_since_load )*/
    scrolledTo   = { x: globalThis.scrollX , y: globalThis.scrollY };

if( scrolled_by_user ) dom_log.logX("🟣🟣🟣🟣SCROLLED BY USER     ● "+details, dom_log.lbB+dom_log.lfX[7]);
else                   dom_log.logX("⚫⚫⚫⚫SCROLLED BY FindMode ● "+details, dom_log.lbB+dom_log.lfX[8]);

  return scrolled_by_user;
};
/*}}}*/

// ┌────────┐
// │ EXPORT │
// └────────┘
/*{{{*/
return { name: "Highlightings"

  /*     mode_find.js calls */
  ,      AUTO_CENTER_VIEW_ON_SELECTION  /* TODO ● make it an option */
  ,      clear
  ,      get_Matched_TEXT_array
  ,      highlight_query
  ,      isExpandable
  ,      outline_activeNode
  ,      set_Match_pattern

  /*     FindPageSync calls */
  ,      get_node_container
  ,      get_scrolled_by_user

  /*     mode_find.js + FindPageSync calls */
  ,      is_node_COLLAPSED
  ,      scroll_listener

  /* DEBUG */
  , get_highlight_css
};
/*}}}*/
/*}}}*/
}());
globalThis.vmh = Highlightings;  /* DevTools shortcut */
//@    sourceURL=Highlightings.js

// ┌─────────────┐
// │ FindStorage │
// └─────────────┘
let  FindStorage = (function() {
"use strict"; /*{{{*/
/*{{{*/
const STORAGE_DELAY        = 1000;
const VAL_ARRAY_LENGTH_MAX = 10;

let   storage_timeout;
let   storage_cache       = {};
/*}}}*/
/*● storage_set {{{*/
let storage_set = async function(key,val) {          try { if(val)  await chrome.storage.local.set({ [key] : val }); else chrome.storage.local.remove(key); } catch(ex) { dom_log.log2(ex.message); } /*dom_log.log7("storage_set("+key+", "+val+")");*/ };
/*}}}*/
/*● storage_get {{{*/
let storage_get = async function(key, cb) { let val; try {    val = await chrome.storage.local.get(   key  , cb   );                                        } catch(ex) { dom_log.log2(ex.message); } /*dom_log.log7("storage_get("+key         +")");*/ };
/*}}}*/
/*● storage_del {{{*/
let storage_del = async function(key    ) {          try {          await                                                 chrome.storage.local.remove(key); } catch(ex) { dom_log.log2(ex.message); } /*dom_log.log7("storage_del("+key         +")");*/ };
/*}}}*/
/*● storage_add {{{*/
let storage_add  = function(key,val)
{
//dom_log.log7("storage_add("+key+","+val+"):");

  if( storage_timeout ) clearTimeout( storage_timeout );
  storage_timeout     =   setTimeout(storage_add_handler, STORAGE_DELAY, key, val);
};
/*}}}*/
/*_ storage_add_handler {{{*/
let storage_add_handler  = function(key,val)
{
//dom_log.log7("storage_add_handler("+key+","+val+"):");
  storage_timeout = null;
  storage_get(key, (items) => {
dom_log.log7("storage_add_handler("+key+" , "+val+"):");

      let val_array = items[key] || [];

    /* filter stored larger and shorter values {{{*/
    let    val_str = val             .replace(/(\\.)|([\+\{\}]\d*)/g,""); // TODO: better regex cleaup
    for(let i=0; i < val_array.length; ++i)
    {
      let      old_str = val_array[i].replace(/(\\.)|([\+\{\}]\d*)/g,""); // TODO: better regex cleaup

      let stored_large = (old_str.indexOf(val_str) == 0)
      let stored_short = (val_str.indexOf(old_str) == 0)

      if( stored_large || stored_short)
        val_array[i] = "";
    }

    val_array = val_array.filter((v) => (v != ""));
    /*}}}*/
    /* ADD {{{*/
    /* CAP TO VAL_ARRAY_LENGTH_MAX .. remove oldest {{{*/
    if(val_array.length >= VAL_ARRAY_LENGTH_MAX)
    {
//dom_log.log7("REACHED VAL_ARRAY_LENGTH_MAX ["+val_array.length+" / "+VAL_ARRAY_LENGTH_MAX+"]");

      while(      val_array .length >= VAL_ARRAY_LENGTH_MAX) {
        let old = val_array.splice(0, 1);

//dom_log.log7("DROPPING OLDEST QUERY ["+old+"]");
      }
    }
    /*}}}*/
    val_array.push( val );
    /*}}}*/
    /* STORE {{{*/
    storage_set(key,val_array);

    /*}}}*/
    storage_cache[key] = val_array;
  });
};
/*}}}*/
/*● storage_pending {{{*/
let storage_pending = function() { return !!storage_timeout; }
/*}}}*/
// ┌────────┐
// │ EXPORT │
// └────────┘
/*{{{*/
return { name: "FindStorage"
  ,      storage_set
  ,      storage_get
  ,      storage_del
  ,      storage_add

  /* DEBUG */
  , storage_cache
};
/*}}}*/
/*}}}*/
}());
globalThis.vms = FindStorage;  /* DevTools shortcut */
//@    sourceURL=FindStorage.js

// ┌──────────────┐
// │ FindPageSync │
// └──────────────┘
let  FindPageSync = (function() {
"use strict"; /*{{{*/

// ┌──────┐
// │ SYNC │
// └──────┘
  /*● updateActiveRegexIndices_ON_USER_SELECTION {{{*/
  let updateActiveRegexIndices_ON_USER_SELECTION = function(selection, backwards, node_array)
  {
//dom_log.log("updateActiveRegexIndices_ON_USER_SELECTION(backwards "+backwards+")");
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
    let      comp_range = selection.getComposedRanges()[0];
console.log("comp_range");
console.dir( comp_range );
}}}*/
//dom_log.log8("....selection.anchorNode.parentElement: "+selection.anchorNode.parentElement.tagName);
    let        sel_rect = selection.anchorNode.parentElement.getBoundingClientRect();
//dom_log.log9("....sel_rect.top: "+ sel_rect.top);
//dom_log.log9("....selection.anchorNode.parentElement.offsetTop: "+selection.anchorNode.parentElement.offsetTop);
/*  let   sel_container = Highlightings.get_node_container( selection.anchorNode ); */
    let      node_range = document.createRange();

    let                   findFunction = backwards ? Array.prototype.findLastIndex : Array.prototype.findIndex;
//dom_log.log8("findFunction=["+findFunction.name+"]");
//console.log ("node_array");
//console.dir ( node_array );
      /*}}}*/
    let activeNodeIndex = findFunction.apply(node_array,[(node) => {
/*{{{*/
//dom_log.log9("....node[# "+node.parentElement.getAttribute("data-num")+"] [offsetTop "+node.parentElement.offsetTop+"] [top "+node.parentElement.getBoundingClientRect().top+"]");
      let result;
/*}}}*/
      /* DIFFERENT DOCUMENT ● compare selection <=> nodes offsetTop {{{*/
      if( !are_nodes_in_same_document(selection.anchorNode, node) )
      {
//dom_log.logX("⚠ ⚠ ⚠ ⚠ DIFFERENT DOCUMENT ⚠ ⚠ ⚠ ⚠", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
/* comparing getBoundingClientRect top {{{*/
        let        node_rect = node.parentElement.getBoundingClientRect();
//dom_log.log9(     "node_rect.top: "+node_rect.top);

        result = backwards
            ?     (node_rect.top < sel_rect.top)
            :     (node_rect.top > sel_rect.top);
/*}}}*/
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
      let numRows = node_array.length;
      let     msg = (backwards ? "▲ " : "▼ ")+ (activeNodeIndex+1)+" of "+numRows;
HUD_msg.show(msg, 500);
dom_log.log4("🟠🟠🟠🟠 NEAR USER SELECTION: "+ msg);
    }
    /*}}}*/
    return activeNodeIndex;
  };
  /*}}}*/
  /*_ are_nodes_in_same_document {{{*/
  let are_nodes_in_same_document = function(node1,node2)
  {
/*{{{
dom_log.log8("are_nodes_in_same_document("+dom_log.get_node_xpath(node1)+", "+dom_log.get_node_xpath(node2)+")");
console.dir(node1);
console.dir(node2);
}}}*/

    return (node1.getRootNode() === node2.getRootNode());

  };
  /*}}}*/
  /*● updateActiveRegexIndices_ON_USER_SCROLL {{{*/
  let updateActiveRegexIndices_ON_USER_SCROLL = function(selection, backwards, node_array)
  {
//dom_log.log("updateActiveRegexIndices_ON_USER_SCROLL(backwards "+backwards+")");
    /* ● ONLY AFTER A USER SCROLL {{{*/
    if( !Highlightings.get_scrolled_by_user() ) {
dom_log.log8("⚫⚫⚫⚫ NOT SCROOLED BY USER");

      return -1;
    }
    /*}}}*/
    if( globalThis.mode_normal_scrolled_to )
    {
      let targetNodeIndex;
      let msg;
      switch( globalThis.mode_normal_scrolled_to )
      {
      case "TOP": msg = "▲ FIRST"; targetNodeIndex =                    0; break;
      case "BOT": msg = "▼ LAST" ; targetNodeIndex = node_array.length -1; break;
      }
      msg += (" #"+(targetNodeIndex+1))+" of "+node_array.length;

HUD_msg.show(msg, 2000);
dom_log.log7("🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /* ● VISIBLE ● (backwards ? BEFORE : AFTER) {{{*/
    let matched_nodes     = node_array;
    let         numRows   = node_array.length;
    let activeNodeIndex   = node_array.indexOf( selection.anchorNode );

    let targetNodeIndex   =  activeNodeIndex + (backwards ? -1 : 1);
        targetNodeIndex   = (targetNodeIndex +  numRows) % numRows;
//dom_log.log7("....activeNodeIndex=["+activeNodeIndex+"] ➔ ["+targetNodeIndex+"]");

    let visible_node_rows_before = [];
    for(let row = targetNodeIndex; row >= (0                     ); row -= 1) {
      if(!is_node_OUTOFVIEW( matched_nodes[row] ))
        visible_node_rows_before.push(          row  );
    }
//dom_log.log("visible_node_rows_before:", visible_node_rows_before);

    let visible_node_rows_after  = [];
    for(let row = targetNodeIndex; row <= (matched_nodes.length-1); row += 1) {
      if(!is_node_OUTOFVIEW( matched_nodes[row] ))
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
/*{{{
    let targetNode = node_array[ targetNodeIndex ];
}}}*/

    if(   (backwards && visible_node_rows_before.includes( targetNodeIndex ))
       || (             visible_node_rows_after .includes( targetNodeIndex ))
    ) {
      let msg = (backwards ? "▲" : "▼")+" "+("#"+(targetNodeIndex+1))+" from "+numRows+" "+(backwards ? "PREVIOUS" : "NEXT")+" VISIBLE NODE";

HUD_msg.show(msg, 2000);
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

HUD_msg.show(msg, 2000);
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

HUD_msg.show(msg, 2000);
dom_log.log7("🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 5/6 ● NONE BEFORE BUT SOME  AFTER ...return    TOP-MOST {{{*/
    if(backwards && visible_node_rows_after .length)
    {
      let  rows_array  = visible_node_rows_after;
      let    top_most  = 0;
      targetNodeIndex  = rows_array[ top_most ];
      let msg = "▲ "+("#"+(targetNodeIndex+1))+" from "+numRows+" visible top node";

HUD_msg.show(msg, 2000);
dom_log.log7("🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    /* 6/6 ● NONE  AFTER BUT SOME BEFORE ...return BOTTOM-MOST {{{*/
    else if(        visible_node_rows_before.length)
    {
      let  rows_array  = visible_node_rows_before; // ...as there are none after
      let    bot_most  = rows_array.length-1;
      targetNodeIndex  = rows_array[ bot_most ];
      let msg = "▼ "+("#"+(targetNodeIndex+1))+" from "+numRows+" visible bottom node";

HUD_msg.show(msg, 2000);
dom_log.log7("🟣🟣🟣🟣 "+ msg);
      return targetNodeIndex;
    }
    /*}}}*/
    return -1; /* lint: consistent-return */
  }
  /*}}}*/
  /*● updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV {{{*/
  let updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV = function(selection, backwards, node_array)
  {
// dom_log.log("updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV(backwards "+backwards+")");
//if(selection.rangeCount <= 0) dom_log.logX("selection.rangeCount <= 0)", dom_log.lbF+dom_log.lbB+dom_log.lfX[2]);
    let activeNodeIndex
      = (selection.rangeCount <= 0)
      ?  0
      :  node_array.indexOf( selection.anchorNode );
//dom_log.log4("....activeNodeIndex=["+activeNodeIndex+"]");
    /* wrapscan First {{{*/
    let   numRows = node_array.length;
    let  wrapscan = "";
    if(  backwards    && (activeNodeIndex == 0   )) {
      wrapscan    = "▲ "+(activeNodeIndex+1)+" of "+numRows+" 🔴 First";

HUD_msg.show(wrapscan, 1000);
dom_log.log8("⚫⚫⚫⚫"+wrapscan );
    }
    /*}}}*/
    /* wrapscan Last {{{*/
    else if(!backwards && (activeNodeIndex == (numRows-1))) {
      wrapscan    = "▼ "+(activeNodeIndex+1)+" of "+numRows+" 🔴 Last";

HUD_msg.show(wrapscan, 1000);
dom_log.log8("⚪️⚪️⚪️⚪️"+wrapscan );
    }
    /*}}}*/
    /* SEEK NEXT OR PREVIOUS {{{*/
    else {
      activeNodeIndex  += (backwards ? -1 : 1);
      activeNodeIndex   = (activeNodeIndex + numRows) % numRows;

      let           msg = (backwards ? "▲ " : "▼ ")+ (activeNodeIndex+1)+" of "+numRows;
HUD_msg.show(msg, 1000);
if(backwards) dom_log.log5(" ▲ ▲ ▲ ▲ SEEK BEFORE "+ msg);
else          dom_log.log4(" ▼ ▼ ▼ ▼ SEEK AFTER "+ msg);
    }
    /*}}}*/
    return [ activeNodeIndex , wrapscan ];
  };
  /*}}}*/

// ┌─────┐
// │ LOG │
// └─────┘
/*● log_visible_regexMatchedNodes {{{*/
/*{{{*/
const CHECK_MAX = 5;

/*}}}*/
let log_visible_regexMatchedNodes = function(nodes_array, sel_row)
{
//dom_log.log3("...log_visible_regexMatchedNodes");
  log_visible_regexMatchedNodes_diff( nodes_array );
  /* ● row_min ● row_max {{{*/
  let row_min = Math.max(sel_row - Math.floor(CHECK_MAX/2), 0                 );
  let row_max = Math.min(row_min +            CHECK_MAX   , nodes_array.length);

      row_min = Math.min(row_min ,    row_max-CHECK_MAX  ); /* do not squeeze at end */
      row_min = Math.max(row_min , 0                     ); /* .....but not bellow 0 */
  /*}}}*/
  /* ● FIRST group {{{*/
console.group("🔴🔴 %c VISIBLE NODES", dom_log.lfX[nodes_array.length%10]);

  if(row_min > 0                 ) dom_log.log("%c 🠉🠉🠉"      , dom_log.lfX[2]);
  else                             dom_log.log("%c ─── FIRST", dom_log.lfX[2]);
  /*}}}*/
  /* ● visible ● outOfView ● collapsed {{{*/

  let l_v = 4; /* visible   */
  let l_o = 8; /* outOfView */
  let l_c = 7; /* collapsed */
  dom_log.log("\t\t#__\t| HHH_YYY |\t[text] %c [visible] %c [outOfView] %c [collapsed]"
              ,                               dom_log.lfX[l_v]
              ,                                            dom_log.lfX[l_o]
              ,                                                           dom_log.lfX[l_c]);
  /*}}}*/
  for(let row = row_min; row < row_max; ++row) {
    /* ● visible ● outOfView ● collapsed {{{*/
    let node = nodes_array[row];

    let node_outOfView = is_node_OUTOFVIEW( node );
    let node_collapsed = Highlightings.is_node_COLLAPSED( node );

    let l_x =  node_collapsed  ? l_c
      :        node_outOfView  ? l_o
      :                          l_v;

    let dot = dom_log.dot[l_x];
    /*}}}*/
    /* ● num ● Y ● H {{{*/
    let p_h = ""+ get_min_parent_height( node ); while(p_h.length < 4) p_h = "_"+p_h;
    let p_y = ""+ node.parentElement.offsetTop      ; while(p_y.length < 3) p_y = p_y+"_";
    let num = ""+row;                                 while(num.length < 2) num = "_"+num;

    /*}}}*/
    /* ● textContent {{{*/
    let  node_textContent
      = (node.textContent.length    < 100)
      ?  node.textContent
      :  node.textContent.substring(0,100);

    /*}}}*/
    /*{{{*/
    let prefix = (row == sel_row) ? "\u25B6" : "";
dom_log.log("%c "+prefix+"\t"+dot+"\t#"+num+"\t"+p_h+"_"+p_y+"\t%c["+ node_textContent.replace(/\n/g,"\u293E") +"]"
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
  /* ● LAST groupEnd {{{*/
  if(row_max < nodes_array.length) dom_log.log("%c 🠋🠋🠋"      , dom_log.lfX[2]);
  else                             dom_log.log("%c ─── LAST" , dom_log.lfX[2]);
  console.groupEnd();
  /*}}}*/
}
/*}}}*/
/*_ log_visible_regexMatchedNodes_diff {{{*/
let log_visible_regexMatchedNodes_diff = function(nodes_array)
{
  /* Highlightings */
  let hnode_array = Highlightings.get_Matched_TEXT_array();

  // ┌──────────────────┐
  // │ Highlightings    │
  // └──────────────────┘
  let       h_length = hnode_array.length;
  let l_h = h_length % 10;
//dom_log.log("%c"+ h_length +" MATCHES %c FOR Highlightings.set_Match_pattern ", dom_log.lfX[l_h], dom_log.lfX[5]);

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
//dom_log.log("%c"+ n_length +" MATCHES %c FOR FindMode.updateQuery"            , dom_log.lfX[l_n], dom_log.lfX[7]);

  for(let n=0; n<nodes_array.length; ++n)
  {
    let text_node = nodes_array[n];
    if( !hnode_array.includes( text_node ) )
      dom_log.log("%c...nodes_array["+n+"] = "+dom_log.get_node_xpath(text_node),                   dom_log.lfX[7]);
  }

}
/*}}}*/

// ┌──────┐
// │ UTIL │
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
  return p_h === Infinity ? null : p_h;
}
/*}}}*/
/*● is_node_OUTOFVIEW {{{*/
let is_node_OUTOFVIEW = function(node,verbose)
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
return { name: "FindPageSync"

  /*     mode_find.js calls */
  ,      updateActiveRegexIndices_ON_USER_SCROLL
  ,      updateActiveRegexIndices_ON_USER_SELECTION
  ,      updateActiveRegexIndices_SCROLLTO_NEXT_OR_PREV
  ,      log_visible_regexMatchedNodes

  /*     Highlightings calls */
  ,      get_min_parent_height
  ,      is_el_or_child_of_parent_el
  ,      is_node_OUTOFVIEW
};
/*}}}*/
/*}}}*/
}());
globalThis.vmp = FindPageSync;   /* DevTools shortcut */
//@    sourceURL=FindPageSync.js

// ┌─────────┐
// │ HUD_msg │
// └─────────┘
let  HUD_msg = (function() {
"use strict"; /*{{ {*/
/*{{{*/
let   hud_pop_el;

/*}}}*/
  /*● show ● text duration {{{*/
/*{{{*/
const MSG_SKIPPING               = "🔴 Skipping #";

let   hud_text;
let   hud_timeout;
let   hud_text_postponed_while_skipping;
/*}}}*/
  let show = function(text, duration)
  {
/*{{{
dom_log.log("show("+text+")");
}}}*/
    /* hud_text {{{*/
    if(     !hud_text               ) hud_text = "";
    else if( hud_text.includes(text)) return;

    /*}}}*/
    /* While Skipping .. only accept more skipping messages {{{*/
    if( hud_text.includes(   MSG_SKIPPING ) ) {
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
    else if( (    text.startsWith("▲") ||     text.startsWith("▼"))
    &&       (hud_text.startsWith("▲") || hud_text.startsWith("▼")))
    {
      hud_text = "";
    }

    if(hud_text.length > 0          ) hud_text += " " +text;
    else                              hud_text  =      text;

    /*}}}*/
    /* show for duration {{{*/
    HUD.show(hud_text, duration);

    /* then hide after duration */
    if( hud_timeout  ) clearTimeout( hud_timeout );
    hud_timeout =        setTimeout(() => {
      hud_text  = "";
      if( hud_text_postponed_while_skipping)
      {
        show( hud_text_postponed_while_skipping, 1000);
        hud_text_postponed_while_skipping = "";
      }
    }, 1000);

    /*}}}*/
  };
  /*}}}*/
  /*● show_popup text {{{*/
  let show_popup = function(text)
  {
console.log("show_popup:");
    /* hud_pop_el {{{*/
    if(!hud_pop_el)
    {
      hud_pop_el                = document.createElement("DIV");
      hud_pop_el.id             = "hud_pop_el";
      hud_pop_el.style.position = "fixed";

      document.body.appendChild( hud_pop_el );
    }
    /*}}}*/
    /* text ● update {{{*/
    if(typeof text != "undefined")
      hud_pop_el.innerText   = text;

    /*}}}*/
    /* hud_pop_el ● display ● top left {{{*/
    hud_pop_el.style.display = "block";

    /* hud_rect */
    let hud_rect = HUD.getBoundingClientRect();
console.log("hud_rect", hud_rect);
    if( hud_rect && hud_rect.width )
    {
      /* pop_rect */
      let pop_rect = hud_pop_el.getBoundingClientRect();
console.log("pop_rect", pop_rect);

      hud_pop_el.style.top     = (hud_rect.top -pop_rect.height)+"px";
      hud_pop_el.style.left    = (hud_rect.left                )+"px";

pop_rect = hud_pop_el.getBoundingClientRect();
console.log("pop_rect", pop_rect);
    }
    /*}}}*/
  };
  /*}}}*/
  /*● hide_popup {{{*/
  let hide_popup = function()
  {
    if(!hud_pop_el) return;
    hud_pop_el.style.display = "none";
  };
  /*}}}*/
/*_ show_query_val_array_cached {{{*/
  let show_query_val_array_cached = function()
  {
console.clear();
    let val_array = FindStorage.storage_cache[vimium_mode_find.VIMIUM_QUERY_KEY];
console.log("show_query_val_array_cached", val_array);
    if(!val_array) return;
    let text = "";
    for(let i=0; i < val_array.length; ++i)
    {
      text += dom_log.dot[(i+1)%10]+" "+val_array[i]+"\n";
    }
console.log("text", text);

    let duration = 2000;
    show("show_query_val_array_cached", duration);

    setTimeout(() => {
    show_popup(     text);
    setTimeout(hide_popup, duration+500);
    }, 0);
  };
  /*}}}*/
/* EXPORT {{{*/
return { name: "HUD_msg"
  ,      show
  ,      show_popup
  ,      hide_popup
  /* DEBUG */
  , show_query_val_array_cached
};
/*}}}*/
/*}}}*/
}());
globalThis.vmu = HUD_msg;        /* DevTools shortcut */
//@    sourceURL=HUD_msg.js

/*{{{
vim: sw=2
}}}*/

