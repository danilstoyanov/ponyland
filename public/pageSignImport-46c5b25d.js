import{a as o,A as s,_ as r,S as m}from"./index-372b49f4.js";import{p as h}from"./putPreloader-756f5659.js";import{P as d}from"./page-37e1a82c.js";let i;const g=async()=>{const{dcId:e,token:u,tgAddr:n}=i;let a;try{o.managers.apiManager.setBaseDcId(e);const t=await o.managers.apiManager.invokeApi("auth.importWebTokenAuthorization",{api_id:s.id,api_hash:s.hash,web_auth_token:u},{dcId:e,ignoreErrors:!0});t._==="auth.authorization"&&(o.managers.apiManager.setUser(t.user),a=r(()=>import("./pageIm-2c730388.js"),["./pageIm-2c730388.js","./index-372b49f4.js","./index-a50ba400.css","./page-37e1a82c.js"],import.meta.url))}catch(t){switch(t.type){case"SESSION_PASSWORD_NEEDED":{t.handled=!0,a=r(()=>import("./pagePassword-2b99e175.js"),["./pagePassword-2b99e175.js","./index-372b49f4.js","./index-a50ba400.css","./putPreloader-756f5659.js","./page-37e1a82c.js","./button-5c081d80.js","./htmlToSpan-c713f494.js","./wrapEmojiText-b4029aec.js","./loginPage-55522b48.js"],import.meta.url);break}default:{console.error("authorization import error:",t);const p=m.authState._;p==="authStateSignIn"?a=r(()=>import("./pageSignIn-2f3225e5.js"),["./pageSignIn-2f3225e5.js","./index-372b49f4.js","./index-a50ba400.css","./putPreloader-756f5659.js","./page-37e1a82c.js","./countryInputField-ccd57dbf.js","./button-5c081d80.js","./wrapEmojiText-b4029aec.js","./scrollable-276e228b.js","./pageSignQR-6c09471b.js","./textToSvgURL-c6ebb454.js"],import.meta.url):p==="authStateSignQr"&&(a=r(()=>import("./pageSignQR-6c09471b.js").then(_=>_.a),["./pageSignQR-6c09471b.js","./index-372b49f4.js","./index-a50ba400.css","./page-37e1a82c.js","./button-5c081d80.js","./putPreloader-756f5659.js","./textToSvgURL-c6ebb454.js"],import.meta.url));break}}}location.hash=n?.trim()?"#?tgaddr="+encodeURIComponent(n):"",a&&a.then(t=>t.default.mount())},l=new d("page-signImport",!0,()=>{h(l.pageEl.firstElementChild,!0),g()},e=>{i=e,o.managers.appStateManager.pushToState("authState",{_:"authStateSignImport",data:i})});export{l as default};
//# sourceMappingURL=pageSignImport-46c5b25d.js.map