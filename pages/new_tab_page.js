document.addEventListener("DOMContentLoaded", async () => {
  await Settings.onLoaded();
  await Utils.populateBrowserInfo();
  DomUtils.injectUserCss();
  Vomnibar.activate(0, {});
});
