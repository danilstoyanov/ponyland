import{a as o,e as t,g as r,_ as a,l as s}from"./index-XL97_8D6.js";import{P as l}from"./page-mf6JlZUQ.js";const n=()=>(o.managers.appStateManager.pushToState("authState",{_:"authStateSignedIn"}),t.requestedServerLanguage||t.getCacheLangPack().then(e=>{e.local&&t.getLangPack(e.lang_code)}),i.pageEl.style.display="",r(),Promise.all([a(()=>import("./appDialogsManager-tI7qW2MJ.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13]),import.meta.url),s(),"requestVideoFrameCallback"in HTMLVideoElement.prototype?Promise.resolve():a(()=>import("./requestVideoFrameCallbackPolyfill-GsYXQx88.js"),__vite__mapDeps([]),import.meta.url)]).then(([e])=>{e.default.start(),setTimeout(()=>{document.getElementById("auth-pages").remove()},1e3)})),i=new l("page-chats",!1,n);export{i as default};
//# sourceMappingURL=pageIm-Y-nIY5iS.js.map
function __vite__mapDeps(indexes) {
  if (!__vite__mapDeps.viteFileDeps) {
    __vite__mapDeps.viteFileDeps = ["./appDialogsManager-tI7qW2MJ.js","./avatar-yQ-jXqc_.js","./button-E0HlK_X_.js","./index-XL97_8D6.js","./index-o_qMyoQj.css","./page-mf6JlZUQ.js","./wrapEmojiText-fX4dvujV.js","./scrollable-AyzCz0Om.js","./putPreloader-LIC5m-4N.js","./htmlToSpan-bTftS_Xk.js","./countryInputField-B5ILuBM3.js","./textToSvgURL-Z4O-nL1S.js","./codeInputField--ksRzt2r.js","./appDialogsManager-6QNcK96s.css"]
  }
  return indexes.map((i) => __vite__mapDeps.viteFileDeps[i])
}