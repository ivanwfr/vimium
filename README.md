# Vimium - The Hacker's Browser

Feature branch **Real-time [IWE]**

This is only a draft for a Pull Request on the original vimium repository [philc / vimium](https://github.com/philc/vimium)

An attempt at a working version of [yousfiSaad](https://github.com/yousfiSaad) Pull Request:
* Real-time highlighting of the search results [#4010](https://github.com/philc/vimium)

Note:
All these files are in "my own working stage" while working on a Draft Pull Request.

When I get to a point where it looks like I could make a Pull Request,
I will remove all my custom formatting to get manageable diffs to submit.

Current commits contain:
* add a setTimeout to delay mode_find update after a cooldown period during Hud input
* push [* selection] to local storage and history
* load last query saved into local storage
* try to add to find pattern history without involving the DOM (to avoid excessive updates during fast typing)
* added lib/dom_log.js to help debugging in DevTools console
* added eslint annotations comments to modified js files
* added vim fold markers to help at analyzing modified js files
* some syntax changes to make eslint happy

> ![Screenshot](/DOC/anim.gif)
