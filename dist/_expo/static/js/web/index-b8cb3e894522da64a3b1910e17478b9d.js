__d(function(g,r,i,a,m,e,d){"use strict";Object.defineProperty(e,'__esModule',{value:!0});var t=r(d[0]);Object.keys(t).forEach(function(n){'default'===n||Object.prototype.hasOwnProperty.call(e,n)||Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[n]}})})},643,[645]);
__d(function(g,r,i,a,m,_e,d){"use strict";Object.defineProperty(_e,'__esModule',{value:!0}),Object.defineProperty(_e,"getAnalytics",{enumerable:!0,get:function(){return ie}}),Object.defineProperty(_e,"getGoogleAnalyticsClientId",{enumerable:!0,get:function(){return se}}),Object.defineProperty(_e,"initializeAnalytics",{enumerable:!0,get:function(){return ae}}),Object.defineProperty(_e,"isSupported",{enumerable:!0,get:function(){return re}}),Object.defineProperty(_e,"logEvent",{enumerable:!0,get:function(){return pe}}),Object.defineProperty(_e,"setAnalyticsCollectionEnabled",{enumerable:!0,get:function(){return de}}),Object.defineProperty(_e,"setConsent",{enumerable:!0,get:function(){return fe}}),Object.defineProperty(_e,"setCurrentScreen",{enumerable:!0,get:function(){return oe}}),Object.defineProperty(_e,"setDefaultEventParameters",{enumerable:!0,get:function(){return ue}}),Object.defineProperty(_e,"setUserId",{enumerable:!0,get:function(){return ce}}),Object.defineProperty(_e,"setUserProperties",{enumerable:!0,get:function(){return le}}),Object.defineProperty(_e,"settings",{enumerable:!0,get:function(){return ee}});var e=r(d[0]),t=r(d[1]),n=r(d[2]),o=r(d[3]);r(d[4]);
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
const s='analytics',c='https://www.googletagmanager.com/gtag/js',l=new t.Logger('@firebase/analytics'),u={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":'Firebase Analytics Interop Component failed to instantiate: {$reason}',"invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":'Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}',"no-api-key":"The \"apiKey\" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.","no-app-id":"The \"appId\" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.","no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":'Trusted Types detected an invalid gtag resource: {$gtagURL}.'},p=new n.ErrorFactory('analytics','Analytics',u);
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
function f(e){if(!e.startsWith(c)){const t=p.create("invalid-gtag-resource",{gtagURL:e});return l.warn(t.message),''}return e}function h(e){return Promise.all(e.map(e=>e.catch(e=>e)))}function y(e,t){let n;return window.trustedTypes&&(n=window.trustedTypes.createPolicy(e,t)),n}function b(e,t){const n=y('firebase-js-sdk-policy',{createScriptURL:f}),o=document.createElement('script'),s=`${c}?l=${e}&id=${t}`;o.src=n?null==n?void 0:n.createScriptURL(s):s,o.async=!0,document.head.appendChild(o)}function w(e){let t=[];return Array.isArray(window[e])?t=window[e]:window[e]=t,t}async function I(e,t,n,o,s,c){const u=o[s];try{if(u)await t[u];else{const e=(await h(n)).find(e=>e.measurementId===s);e&&await t[e.appId]}}catch(e){l.error(e)}e("config",s,c)}async function v(e,t,n,o,s){try{let c=[];if(s&&s.send_to){let e=s.send_to;Array.isArray(e)||(e=[e]);const o=await h(n);for(const n of e){const e=o.find(e=>e.measurementId===n),s=e&&t[e.appId];if(!s){c=[];break}c.push(s)}}0===c.length&&(c=Object.values(t)),await Promise.all(c),e("event",o,s||{})}catch(e){l.error(e)}}function P(e,t,n,o){return async function(s,...c){try{if("event"===s){const[o,s]=c;await v(e,t,n,o,s)}else if("config"===s){const[s,l]=c;await I(e,t,n,o,s,l)}else if("consent"===s){const[t,n]=c;e("consent",t,n)}else if("get"===s){const[t,n,o]=c;e("get",t,n,o)}else if("set"===s){const[t]=c;e("set",t)}else e(s,...c)}catch(e){l.error(e)}}}function M(e,t,n,o,s){let c=function(...e){window[o].push(arguments)};return window[s]&&'function'==typeof window[s]&&(c=window[s]),window[s]=P(c,e,t,n),{gtagCore:c,wrappedGtag:window[s]}}function T(e){const t=window.document.getElementsByTagName('script');for(const n of Object.values(t))if(n.src&&n.src.includes(c)&&n.src.includes(e))return n;return null}
/**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */const A=new class{constructor(e={},t=1e3){this.throttleMetadata=e,this.intervalMillis=t}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,t){this.throttleMetadata[e]=t}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}};function D(e){return new Headers({Accept:'application/json','x-goog-api-key':e})}async function j(e){var t;const{appId:n,apiKey:o}=e,s={method:'GET',headers:D(o)},c="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig".replace('{app-id}',n),l=await fetch(c,s);if(200!==l.status&&304!==l.status){let e='';try{const n=await l.json();(null===(t=n.error)||void 0===t?void 0:t.message)&&(e=n.error.message)}catch(e){}throw p.create("config-fetch-failed",{httpStatus:l.status,responseMessage:e})}return l.json()}async function F(e,t=A,n){const{appId:o,apiKey:s,measurementId:c}=e.options;if(!o)throw p.create("no-app-id");if(!s){if(c)return{measurementId:c,appId:o};throw p.create("no-api-key")}const l=t.getThrottleMetadata(o)||{backoffCount:0,throttleEndTimeMillis:Date.now()},u=new O;return setTimeout(async()=>{u.abort()},void 0!==n?n:6e4),E({appId:o,apiKey:s,measurementId:c},l,u,t)}async function E(e,{throttleEndTimeMillis:t,backoffCount:o},s,c=A){var u;const{appId:p,measurementId:f}=e;try{await $(s,t)}catch(e){if(f)return l.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${f} provided in the "measurementId" field in the local Firebase config. [${null==e?void 0:e.message}]`),{appId:p,measurementId:f};throw e}try{const t=await j(e);return c.deleteThrottleMetadata(p),t}catch(t){const h=t;if(!x(h)){if(c.deleteThrottleMetadata(p),f)return l.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${f} provided in the "measurementId" field in the local Firebase config. [${null==h?void 0:h.message}]`),{appId:p,measurementId:f};throw t}const y=503===Number(null===(u=null==h?void 0:h.customData)||void 0===u?void 0:u.httpStatus)?(0,n.calculateBackoffMillis)(o,c.intervalMillis,30):(0,n.calculateBackoffMillis)(o,c.intervalMillis),b={throttleEndTimeMillis:Date.now()+y,backoffCount:o+1};return c.setThrottleMetadata(p,b),l.debug(`Calling attemptFetch again in ${y} millis`),E(e,b,s,c)}}function $(e,t){return new Promise((n,o)=>{const s=Math.max(t-Date.now(),0),c=setTimeout(n,s);e.addEventListener(()=>{clearTimeout(c),o(p.create("fetch-throttle",{throttleEndTimeMillis:t}))})})}function x(e){if(!(e instanceof n.FirebaseError&&e.customData))return!1;const t=Number(e.customData.httpStatus);return 429===t||500===t||503===t||504===t}class O{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */let C,_;async function k(e,t,n,o,s){if(s&&s.global)e("event",n,o);else{const s=await t;e("event",n,Object.assign(Object.assign({},o),{send_to:s}))}}async function z(e,t,n,o){if(o&&o.global)return e("set",{screen_name:n}),Promise.resolve();e("config",await t,{update:!0,screen_name:n})}async function B(e,t,n,o){if(o&&o.global)return e("set",{user_id:n}),Promise.resolve();e("config",await t,{update:!0,user_id:n})}async function L(e,t,n,o){if(o&&o.global){const t={};for(const e of Object.keys(n))t[`user_properties.${e}`]=n[e];return e("set",t),Promise.resolve()}e("config",await t,{update:!0,user_properties:n})}async function S(e,t){const n=await t;return new Promise((t,o)=>{e("get",n,'client_id',e=>{e||o(p.create("no-client-id")),t(e)})})}async function U(e,t){const n=await e;window[`ga-disable-${n}`]=!t}function N(e){_=e}function K(e){C=e}
/**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */async function q(){if(!(0,n.isIndexedDBAvailable)())return l.warn(p.create("indexeddb-unavailable",{errorInfo:'IndexedDB is not available in this environment.'}).message),!1;try{await(0,n.validateIndexedDBOpenable)()}catch(e){return l.warn(p.create("indexeddb-unavailable",{errorInfo:null==e?void 0:e.toString()}).message),!1}return!0}async function R(e,t,n,o,s,c,u){var p;const f=F(e);f.then(t=>{n[t.measurementId]=t.appId,e.options.measurementId&&t.measurementId!==e.options.measurementId&&l.warn(`The measurement ID in the local Firebase config (${e.options.measurementId}) does not match the measurement ID fetched from the server (${t.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(e=>l.error(e)),t.push(f);const h=q().then(e=>e?o.getId():void 0),[y,w]=await Promise.all([f,h]);T(c)||b(c,y.measurementId),_&&(s("consent",'default',_),N(void 0)),s('js',new Date);const I=null!==(p=null==u?void 0:u.config)&&void 0!==p?p:{};return I.origin='firebase',I.update=!0,null!=w&&(I.firebase_id=w),s("config",y.measurementId,I),C&&(s("set",C),K(void 0)),y.measurementId}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */class G{constructor(e){this.app=e}_delete(){return delete V[this.app.options.appId],Promise.resolve()}}let V={},W=[];const H={};let J,Q,X='dataLayer',Y='gtag',Z=!1;function ee(e){if(Z)throw p.create("already-initialized");e.dataLayerName&&(X=e.dataLayerName),e.gtagName&&(Y=e.gtagName)}function te(){const e=[];if((0,n.isBrowserExtension)()&&e.push('This is a browser extension environment.'),(0,n.areCookiesEnabled)()||e.push('Cookies are not available.'),e.length>0){const t=e.map((e,t)=>`(${t+1}) ${e}`).join(' '),n=p.create("invalid-analytics-context",{errorInfo:t});l.warn(n.message)}}function ne(e,t,n){te();const o=e.options.appId;if(!o)throw p.create("no-app-id");if(!e.options.apiKey){if(!e.options.measurementId)throw p.create("no-api-key");l.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${e.options.measurementId} provided in the "measurementId" field in the local Firebase config.`)}if(null!=V[o])throw p.create("already-exists",{id:o});if(!Z){w(X);const{wrappedGtag:e,gtagCore:t}=M(V,W,H,X,Y);Q=e,J=t,Z=!0}V[o]=R(e,W,H,t,J,X,n);return new G(e)}function ie(t=(0,e.getApp)()){t=(0,n.getModularInstance)(t);const o=(0,e._getProvider)(t,s);return o.isInitialized()?o.getImmediate():ae(t)}function ae(t,o={}){const c=(0,e._getProvider)(t,s);if(c.isInitialized()){const e=c.getImmediate();if((0,n.deepEqual)(o,c.getOptions()))return e;throw p.create("already-initialized")}return c.initialize({options:o})}async function re(){if((0,n.isBrowserExtension)())return!1;if(!(0,n.areCookiesEnabled)())return!1;if(!(0,n.isIndexedDBAvailable)())return!1;try{return await(0,n.validateIndexedDBOpenable)()}catch(e){return!1}}function oe(e,t,o){e=(0,n.getModularInstance)(e),z(Q,V[e.app.options.appId],t,o).catch(e=>l.error(e))}async function se(e){return e=(0,n.getModularInstance)(e),S(Q,V[e.app.options.appId])}function ce(e,t,o){e=(0,n.getModularInstance)(e),B(Q,V[e.app.options.appId],t,o).catch(e=>l.error(e))}function le(e,t,o){e=(0,n.getModularInstance)(e),L(Q,V[e.app.options.appId],t,o).catch(e=>l.error(e))}function de(e,t){e=(0,n.getModularInstance)(e),U(V[e.app.options.appId],t).catch(e=>l.error(e))}function ue(e){Q?Q("set",e):K(e)}function pe(e,t,o,s){e=(0,n.getModularInstance)(e),k(Q,V[e.app.options.appId],t,o,s).catch(e=>l.error(e))}function fe(e){Q?Q("consent",'update',e):N(e)}const me="@firebase/analytics",he="0.10.8";(0,e._registerComponent)(new o.Component(s,(e,{options:t})=>ne(e.getProvider('app').getImmediate(),e.getProvider('installations-internal').getImmediate(),t),"PUBLIC")),(0,e._registerComponent)(new o.Component('analytics-internal',function(e){try{const t=e.getProvider(s).getImmediate();return{logEvent:(e,n,o)=>pe(t,e,n,o)}}catch(e){throw p.create("interop-component-reg-failed",{reason:e})}},"PRIVATE")),(0,e.registerVersion)(me,he),(0,e.registerVersion)(me,he,'esm2017')},645,[271,274,273,272,646]);