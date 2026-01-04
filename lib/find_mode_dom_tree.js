// ┌───────────────────────────────────────────────────────────────────────────┐
// │ lib/find_mode_dom_tree.js........................... _TAG (251205:19h:53) ●
// └───────────────────────────────────────────────────────────────────────────┘
/* jshint esversion: 9, laxbreak:true, laxcomma:true, boss:true {{{*/

/* globals console         */
/* globals dom_log         */

/* globals NodeMatcher     */
/*}}}*/

// ┌────────────────┐
// │ FindTreeWalker ●
// └────────────────┘
/*{{{*/
let  FindTreeWalker = (function() {
"use strict";
/*{{{*/
let log_this=false;

/*}}}*/
/* const {{{*/
const MAX_MATCH_LEN   = 512;

/*}}}*/
/*➔ walk_clear {{{*/
let walk_clear = function()
{
  let count = 0;
  let attribute_name = "data-innerHTML";
  Array.from(document.querySelectorAll("["+attribute_name+"]"))
    .forEach((el) => {
      el.innerHTML
        = el.getAttribute   ( attribute_name );
      el    .removeAttribute( attribute_name );
      count += 1;
    });
  if(count) dom_log.log("%c CLEARED "+(count)+" FOUND ELEMENTS", dom_log.lbH+dom_log.lfX[count % 10]+dom_log.lbB);
};
/*}}}*/
/*➔ walk_the_DOM_with_regex {{{*/
let walk_the_DOM_with_regex = function(top_node, re)
{
  // ┌────────────┬───────────────────────────────────────────┐
  // │ GET BUNDLE ● START{ node offset } ● END{ node offset } ●
  // └────────────┴───────────────────────────────────────────┘
  /* clear previous selection {{{*/
  walk_clear();
  /*}}}*/
  /*{{{*/
  let bundle_array = [];
  if(!re.global)
  {
    dom_log.log("%c"+re+"%c should have a global flag", dom_log.lbH+dom_log.lfX[3], dom_log.lbH+dom_log.lfX[2]);
    return;
  }
  let generator    = walkTextSegments(top_node,re);
  let   result;
  do {  result = generator.next();
    if( result.value ) {
      bundle_array.push( result.value );
console.log("\t ● bundle #"+bundle_array.length, result.value);
    }
  }
  while( !result.done )
  /*}}}*/

  // ┌────────────┐
  // │ LOG BUNDLE ●
  // └────────────┘
  /*{{{*/
  dom_log.log("%c"
             +"┌────────────────────────────────────────────────────────┐\n"
             +"│ LOG BUNDLE ● START{ node offset } ● END{ node offset } ●\n"
             +"│ "+re                                                  +"\n"
             +"└────────────────────────────────────────────────────────┘"
             , dom_log.CS+"font-size:200%; min-height:100px;");

  dom_log.log7("bundle_array.length = "+ bundle_array.length);

  let common_ancestor_array = [];
  let sT,  eT;
  let so,  eo;
  /*}}}*/
  bundle_array.forEach((bundle,idx) => {
    let num = idx+1;

    // ┌─────┐
    // │ CSS ●
    // └─────┘
    /* CSS {{{*/
    let sbL = dom_log.lbL + dom_log.lfX[4]; let ebL = dom_log.lbH + dom_log.lfX[5];
    let sbC = dom_log.lbC + dom_log.lfX[4]; let ebC = dom_log.lbC + dom_log.lfX[5];
    let sbR = dom_log.lbR + dom_log.lfX[4]; let ebR = dom_log.lbR + dom_log.lfX[5];

    let bbF = dom_log.lbF + dom_log.lfX[7];

    let buffer_txt = bundle.buffer || "[]";

    sT = bundle.beg.node.textContent;
    eT = bundle.end.node.textContent;
    so = bundle.beg.offset
    eo = bundle.end.offset

    let lbS = dom_log.lbF+"color:black; background-color:yellow;"
    let lbE = dom_log.lbF+"color:black; background-color:green;"

    let beg_text, beg_css = [];
    let mid_text, mid_css = [];
    let end_text, end_css = [];
    /*}}}*/

    // ┌──────┬─────────────────────────────────────────────────┐
    // │ TEXT ● SINGLE_NODE [beg_offset....end_offset]          ●
    // └──────┴─────────────────────────────────────────────────┘
    /*{{{*/
    if(bundle.beg.node == bundle.end.node)
    {
      beg_text = "%c"+sT.slice(0 ,so)+"%c"+sT.slice(so,eo)+"%c"+sT.slice(eo);
      beg_css  = [dom_log.lbF         ,lbS                 ,dom_log.lbF    ];

      end_text = beg_text;
      end_css  = beg_css;
    }
    /*}}}*/

    // ┌──────┬────────────────────┬────────────────────────────┐
    // │ TEXT ● START_NODE [beg_offset.....end_offset] END_NODE ●
    // └──────┴────────────────────┴────────────────────────────┘
    /*{{{*/
    else {

    // ┌─────┐
    // │ BEG ●
    // └─────┘
      beg_text = "%c"+sT.slice(0 ,so)+"%c"+sT.slice(so   );
      beg_css  = [dom_log.lbF         ,lbS               ];

    // ┌─────┐
    // │ MID ●
    // └─────┘
      if(bundle.beg.node.nextSibling == bundle.end.node)
      {
        let   mo =  buffer_txt.length
                  -   end_text.length
                  + eo;
        mid_text = "%c"+buffer_txt.slice(so, mo);
      }
      else {
        mid_text = "[]";
      }
      mid_css    = dom_log.CS;

    // ┌─────┐
    // │ END ●
    // └─────┘
      end_text   = "%c"+eT.slice(0 ,eo) + "%c"+eT.slice(   eo);
      end_css    = [lbE                   ,dom_log.CS        ];
    }
    /*}}}*/

    // ┌─────┬──────────────────────────────────────────────────┐
    // │ LOG ●  BUFFER [beg|...|end]                            ●
    // └─────┴──────────────────────────────────────────────────┘
    /*{{{*/
    buffer_txt = dom_log.show_CR_LF( buffer_txt );
    beg_text   = dom_log.show_CR_LF( beg_text   );
    end_text   = dom_log.show_CR_LF( end_text   );

    dom_log.log("%c"+num                                                        +"%c"+buffer_txt
                ,dom_log.lbH+dom_log.lfX[num%10]                                 ,bbF           );

    dom_log.log("\t%cSTART." + "%c│←"+bundle.beg.offset  +"%c"+bundle.beg.xpath +    beg_text
                ,   sbL ,       sbC                      ,sbR                    , ...beg_css   );

    dom_log.log("\t%cEND..." + "%c"  +bundle.end.offset+"→│%c"+bundle.end.xpath +    end_text
                ,  ebL ,        ebC                       ,ebR                   , ...end_css   );
    /*}}}*/

    // ┌─────────────────────┐
    // │ REPLACE PARENT HTML ●
    // └─────────────────────┘
/*{{{*/
    let   common_ancestor = get_common_ancestor(bundle.beg.node, bundle.end.node);
    if(   common_ancestor ) {
      if(!common_ancestor_array.includes( common_ancestor ))
      {
        common_ancestor_array.push    ( common_ancestor );
        common_ancestor.setAttribute("data-innerHTML", common_ancestor.innerHTML);
        common_ancestor.innerHTML = common_ancestor.innerText.replace(re, "<span style='font-size:200%; color: yellow; text-decoration: overline;'>\$&</span>");
      }
    }
/*}}}*/
    /* highlight selection {{{*/
//  get_FROM_NODE_Selection(bundle.beg.node, re);
    /*}}}*/
  });

  dom_log.log4("walk_the_DOM_with_regex DONE");
};
/*}}}*/
//_ walkTextSegments {{{
let walkTextSegments = function *(root,re)
{
  /* TreeWalker, buffer node offset {{{*/
  let walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);

  /*}}}*/
  // ┌──────────────────────────────┐
  // │ WALK THE DOM ● YIELD  BUNDLE ●
  // └──────────────────────────────┘
  /*{{{*/
  /*{{{*/
  let buffer = "";

  let node;
  let match;
  /*}}}*/
  while(node = walker.nextNode()) {
    // ┌───────────────────┐
    // │ COLLECT NODE      ●
    // └───────────────────┘
    //{{{
    while(node && !NodeMatcher.isExpandable( node.parentElement ))
      node = walker.nextNode();

    if(!node)
      break;

    buffer =  buffer + node.textContent;
    //}}}

    // ┌───────────────────┐
    // │ MATCH UP TO NODE  ●
    // └───────────────────┘
    match = re.exec( buffer );
    if(!match )
      continue;

    // ┌───────────────────────────────────────────────────┐
    // │ WALK FROM MATCHED [END_NODE] BACK TO [START_NODE] ●
    // └───────────────────────────────────────────────────┘
    // MATCH {{{
    // ┌────────────────────────────────────────────────────────────┐
    // │                ┌─ match.index              ┌─ re.lastIndex
    // │                ▼                           │
    // │ buffer=[.......START_NODE_TEXT             ▼
    // │                               END_NODE_TEXT..............]
    // │         <─ buffer.length ───────────────────────────────>
    // │
    // │                <─ beg_len ───><─ end_len ─><─ post_len ─>
    // │
    // │                               <──── node_len ───────────>
    // │
    // └────────────────────────────────────────────────────────────┘
    //}}}
    /*{{{*/
    let node_end              = node;
    let node_beg              = node;

    let node_len              = node.textContent.length;
    let post_len              = buffer.length - re.lastIndex;
    let in_buffer_len         = node_len      -     post_len;
    let match_len             = re.lastIndex  -  match.index;

    /*}}}*/
    // NARROWING {{{
    // ┌────────────────────────────────────────────────────────────┐
    // │                ┌─ match.index
    // │                ▼
    // │ buffer=[.......START_NODE_TEXT
    // │        [node_beg]...(nodes)....[END_NODE_TEXT.........]
    // │                                 ▲
    // │   node_end_buffer_index─────────┘
    // └────────────────────────────────────────────────────────────┘
    //}}}
    /*{{{*/
    let node_end_buffer_index = 0;
    buffer = node.textContent;

    let buffer_to_match_len
      = match_len - in_buffer_len     // match head missing in buffer
      + node_len;                     // match tail already in buffer

    buffer_to_match_len
      = Math.min(buffer_to_match_len, MAX_MATCH_LEN);
    /*}}}*/
    // previousSibling... {{{
    while(   ( buffer.length < buffer_to_match_len                                ) // max not reached
          && ( node_beg.previousSibling || node_beg.parentElement.previousSibling ) // can get more
         ) {
      node_beg               = node_beg.previousSibling || node_beg.parentElement.previousSibling;
      buffer                 = node_beg  .textContent + buffer;
      node_end_buffer_index += node_beg  .textContent.length;
    }
    //}}}
/*{{{*/
dom_log.log("%c buffer (idx "+node_end_buffer_index+") / (len "+buffer.length+")%c"+dom_log.show_CR_LF(buffer)
         , dom_log.lbL                                                       ,dom_log.lbR                   );
/*}}}*/

    // ┌─────────────────────────────────────────────────────────────────────┐
    // │ MATCH [narrowed buffer] (just enough before big buffer first match) ●
    // └─────────────────────────────────────────────────────────────────────┘
    /* vars {{{*/
    let beg_offset;
    let end_offset;
    let match_count;
    /*}}}*/
    re.lastIndex = 0;
    for(match_count=1; match = re.exec(buffer); ++match_count)
    {
      beg_offset = match.index;
      end_offset = re.lastIndex - node_end_buffer_index;
/*{{{*/
dom_log.log("\t"
         +  "%c"              + ((node_beg != node_end) ? "NODE START":"SAME NODE")
         +  "%c x"            + match_count
         +  "%c match.index=" + match.index
         +  "%c lastIndex="   + re.lastIndex
         +  "%c beg_offset="  + beg_offset
         +  "%c end_offset="  + end_offset +" = ("+re.lastIndex+" - "+ node_end_buffer_index +")"
         +  "%c["+              match[0] +"]"
         , dom_log.lbH                                    // NODE
         , dom_log.lbL + dom_log.lfX[match_count % 10]    // match_count
         , dom_log.lbC + dom_log.lfX[match.index % 10]    // match.index
         , dom_log.lbR + dom_log.lfX[match_count % 10]    // lastIndex
         , dom_log.lbL                                    // beg_offset
         , dom_log.lbR                                    // end_offset
         , dom_log.lbH + dom_log.lfX[4]                   // match[0]
         );
/*}}}*/

    // ┌──────────────┐
    // │ YIELD BUNDLE ●
    // └──────────────┘
      yield { buffer
        ,     beg: { node: node_beg  , offset: beg_offset, xpath: dom_log.get_node_xpath( node_beg ) }
        ,     end: { node: node_end  , offset: end_offset, xpath: dom_log.get_node_xpath( node_end ) }
      };

    // ┌────────────────────────────────┐
    // │ NEXT MATCH (from re.lastIndex) ●
    // └────────────────────────────────┘
      node_beg              = node_end;
      node_end_buffer_index = 0;
    }
    //}}}
    buffer = node.textContent;
    buffer = "";
  }
};
//}}}
/*_ get_common_ancestor {{{*/
let get_common_ancestor = function(node1, node2)
{
  if(node1 === node2) return node1.parentNode;
  let current = node1;
  while (current) {
    if (current.contains(node2)) return current;
    current = current.parentElement;
  }
  return null;
};
/*}}}*/
/* EXPORT ● can_match_query set_Match_pattern {{{*/

/*● name ● logging {{{*/
const  name = "FindTreeWalker";
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

  ,      walk_the_DOM_with_regex
  ,      walk_clear
  //DEBUG
  , get_common_ancestor
};
/*}}}*/
}());
globalThis.FindTreeWalker      = FindTreeWalker;
/*}}}*/

//{{{ Node.node Type
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
/*{{{
vim: sw=2
}}}*/
