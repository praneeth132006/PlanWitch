__d(function(g,r,i,a,m,e,d){Object.defineProperty(e,"__esModule",{value:!0});var n=r(d[0]);Object.keys(n).forEach(function(t){"default"!==t&&"__esModule"!==t&&(t in e&&e[t]===n[t]||Object.defineProperty(e,t,{enumerable:!0,get:function(){return n[t]}}))})},717,[719]);
__d(function(g,r,_i,a,m,e,d){Object.defineProperty(e,"__esModule",{value:!0}),e.getPerformance=function(n=(0,i.getApp)()){n=(0,t.getModularInstance)(n);const o=(0,i._getProvider)(n,'performance');return o.getImmediate()},e.initializePerformance=function(n,o){n=(0,t.getModularInstance)(n);const s=(0,i._getProvider)(n,'performance');if(s.isInitialized()){const n=s.getImmediate(),i=s.getOptions();if((0,t.deepEqual)(i,null!=o?o:{}))return n;throw E.create("already initialized")}return s.initialize({options:o})},e.trace=function(n,i){return n=(0,t.getModularInstance)(n),new At(n,i)};var t=r(d[0]),n=r(d[1]),i=r(d[2]),o=r(d[3]);r(d[4]);const s="@firebase/performance",c="0.6.9",l=c,u='FB-PERF-TRACE-MEASURE',p='_wt_',f='_fcp',h='_fid',v='@firebase/performance/config',_='@firebase/performance/configexpire',b='Performance',T={"trace started":'Trace {$traceName} was started before.',"trace stopped":'Trace {$traceName} is not running.',"nonpositive trace startTime":'Trace {$traceName} startTime should be positive.',"nonpositive trace duration":'Trace {$traceName} duration should be positive.',"no window":'Window is not available.',"no app id":'App id is not available.',"no project id":'Project id is not available.',"no api key":'Api key is not available.',"invalid cc log":'Attempted to queue invalid cc event',"FB not default":'Performance can only start when Firebase app instance is the default one.',"RC response not ok":'RC response is not ok',"invalid attribute name":'Attribute name {$attributeName} is invalid.',"invalid attribute value":'Attribute value {$attributeValue} is invalid.',"invalid custom metric name":'Custom metric name {$customMetricName} is invalid',"invalid String merger input":'Input for String merger is invalid, contact support team to resolve.',"already initialized":"initializePerformance() has already been called with different options. To avoid this error, call initializePerformance() with the same options as when it was originally called, or call getPerformance() to return the already initialized instance."},E=new t.ErrorFactory('performance',b,T),I=new n.Logger(b);
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
   */
let y,w,S,M;I.logLevel=n.LogLevel.INFO;class A{constructor(t){if(this.window=t,!t)throw E.create("no window");this.performance=t.performance,this.PerformanceObserver=t.PerformanceObserver,this.windowLocation=t.location,this.navigator=t.navigator,this.document=t.document,this.navigator&&this.navigator.cookieEnabled&&(this.localStorage=t.localStorage),t.perfMetrics&&t.perfMetrics.onFirstInputDelay&&(this.onFirstInputDelay=t.perfMetrics.onFirstInputDelay)}getUrl(){return this.windowLocation.href.split('?')[0]}mark(t){this.performance&&this.performance.mark&&this.performance.mark(t)}measure(t,n,i){this.performance&&this.performance.measure&&this.performance.measure(t,n,i)}getEntriesByType(t){return this.performance&&this.performance.getEntriesByType?this.performance.getEntriesByType(t):[]}getEntriesByName(t){return this.performance&&this.performance.getEntriesByName?this.performance.getEntriesByName(t):[]}getTimeOrigin(){return this.performance&&(this.performance.timeOrigin||this.performance.timing.navigationStart)}requiredApisAvailable(){return fetch&&Promise&&(0,t.areCookiesEnabled)()?!!(0,t.isIndexedDBAvailable)()||(I.info('IndexedDB is not supported by current browser'),!1):(I.info('Firebase Performance cannot start if browser does not support fetch and Promise or cookie is disabled.'),!1)}setupObserver(t,n){if(!this.PerformanceObserver)return;new this.PerformanceObserver(t=>{for(const i of t.getEntries())n(i)}).observe({entryTypes:[t]})}static getInstance(){return void 0===y&&(y=new A(w)),y}}function k(t){w=t}
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
   */function N(t){const n=t.getId();return n.then(t=>{S=t}),n}function R(){return S}function O(t){const n=t.getToken();return n.then(t=>{}),n}
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
   */function P(t,n){const i=t.length-n.length;if(i<0||i>1)throw E.create("invalid String merger input");const o=[];for(let i=0;i<t.length;i++)o.push(t.charAt(i)),n.length>i&&o.push(n.charAt(i));return o.join('')}
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
   */class U{constructor(){this.instrumentationEnabled=!0,this.dataCollectionEnabled=!0,this.loggingEnabled=!1,this.tracesSamplingRate=1,this.networkRequestsSamplingRate=1,this.logEndPointUrl='https://firebaselogging.googleapis.com/v0cc/log?format=json_proto',this.flTransportEndpointUrl=P('hts/frbslgigp.ogepscmv/ieo/eaylg','tp:/ieaeogn-agolai.o/1frlglgc/o'),this.transportKey=P('AzSC8r6ReiGqFMyfvgow','Iayx0u-XT3vksVM-pIV'),this.logSource=462,this.logTraceAfterSampling=!1,this.logNetworkAfterSampling=!1,this.configTimeToLive=12}getFlTransportFullUrl(){return this.flTransportEndpointUrl.concat('?key=',this.transportKey)}static getInstance(){return void 0===M&&(M=new U),M}}
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
   */var C;!(function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.VISIBLE=1]="VISIBLE",t[t.HIDDEN=2]="HIDDEN"})(C||(C={}));const B=['firebase_','google_','ga_'],F=new RegExp('^[a-zA-Z]\\w*$');function D(){const t=A.getInstance().navigator;return(null==t?void 0:t.serviceWorker)?t.serviceWorker.controller?2:3:1}function L(){switch(A.getInstance().document.visibilityState){case'visible':return C.VISIBLE;case'hidden':return C.HIDDEN;default:return C.UNKNOWN}}function $(){const t=A.getInstance().navigator.connection;switch(t&&t.effectiveType){case'slow-2g':return 1;case'2g':return 2;case'3g':return 3;case'4g':return 4;default:return 0}}function q(t){if(0===t.length||t.length>40)return!1;return!B.some(n=>t.startsWith(n))&&!!t.match(F)}function j(t){return 0!==t.length&&t.length<=100}
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
   */function z(t){var n;const i=null===(n=t.options)||void 0===n?void 0:n.appId;if(!i)throw E.create("no app id");return i}function x(t){var n;const i=null===(n=t.options)||void 0===n?void 0:n.projectId;if(!i)throw E.create("no project id");return i}function K(t){var n;const i=null===(n=t.options)||void 0===n?void 0:n.apiKey;if(!i)throw E.create("no api key");return i}
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
   */const V={loggingEnabled:!0};function W(t,n){const i=J();return i?(X(i),Promise.resolve()):Q(t,n).then(X).then(t=>H(t),()=>{})}function J(){const t=A.getInstance().localStorage;if(!t)return;const n=t.getItem(_);if(!(n&&(i=n,Number(i)>Date.now())))return;var i;const o=t.getItem(v);if(o)try{return JSON.parse(o)}catch(t){return}}function H(t){const n=A.getInstance().localStorage;t&&n&&(n.setItem(v,JSON.stringify(t)),n.setItem(_,String(Date.now()+60*U.getInstance().configTimeToLive*60*1e3)))}const G='Could not fetch config, will use default configs';function Q(t,n){return O(t.installations).then(i=>{const o=x(t.app),s=K(t.app),c=new Request(`https://firebaseremoteconfig.googleapis.com/v1/projects/${o}/namespaces/fireperf:fetch?key=${s}`,{method:'POST',headers:{Authorization:`FIREBASE_INSTALLATIONS_AUTH ${i}`},body:JSON.stringify({app_instance_id:n,app_instance_id_token:i,app_id:z(t.app),app_version:l,sdk_version:"0.0.1"})});return fetch(c).then(t=>{if(t.ok)return t.json();throw E.create("RC response not ok")})}).catch(()=>{I.info(G)})}function X(t){if(!t)return t;const n=U.getInstance(),i=t.entries||{};return void 0!==i.fpr_enabled?n.loggingEnabled='true'===String(i.fpr_enabled):n.loggingEnabled=V.loggingEnabled,i.fpr_log_source?n.logSource=Number(i.fpr_log_source):V.logSource&&(n.logSource=V.logSource),i.fpr_log_endpoint_url?n.logEndPointUrl=i.fpr_log_endpoint_url:V.logEndPointUrl&&(n.logEndPointUrl=V.logEndPointUrl),i.fpr_log_transport_key?n.transportKey=i.fpr_log_transport_key:V.transportKey&&(n.transportKey=V.transportKey),void 0!==i.fpr_vc_network_request_sampling_rate?n.networkRequestsSamplingRate=Number(i.fpr_vc_network_request_sampling_rate):void 0!==V.networkRequestsSamplingRate&&(n.networkRequestsSamplingRate=V.networkRequestsSamplingRate),void 0!==i.fpr_vc_trace_sampling_rate?n.tracesSamplingRate=Number(i.fpr_vc_trace_sampling_rate):void 0!==V.tracesSamplingRate&&(n.tracesSamplingRate=V.tracesSamplingRate),n.logTraceAfterSampling=Y(n.tracesSamplingRate),n.logNetworkAfterSampling=Y(n.networkRequestsSamplingRate),t}function Y(t){return Math.random()<=t}
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
   */let Z,tt=1;function et(t){return tt=2,Z=Z||nt(t),Z}function nt(t){return rt().then(()=>N(t.installations)).then(n=>W(t,n)).then(()=>it(),()=>it())}function rt(){const t=A.getInstance().document;return new Promise(n=>{if(t&&'complete'!==t.readyState){const i=()=>{'complete'===t.readyState&&(t.removeEventListener('readystatechange',i),n())};t.addEventListener('readystatechange',i)}else n()})}function it(){tt=3}
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
   */const ot=1e4;let at,st=3,ct=[],lt=!1;function ut(t){setTimeout(()=>{if(0!==st)return ct.length?void pt():ut(ot)},t)}function pt(){const t=ct.splice(0,1e3),n=t.map(t=>({source_extension_json_proto3:t.message,event_time_ms:String(t.eventTime)}));mt({request_time_ms:String(Date.now()),client_info:{client_type:1,js_client_info:{}},log_source:U.getInstance().logSource,log_event:n},t).catch(()=>{ct=[...t,...ct],st--,I.info(`Tries left: ${st}.`),ut(ot)})}function mt(t,n){return dt(t).then(t=>(t.ok||I.info('Call to Firebase backend failed.'),t.json())).then(t=>{const i=Number(t.nextRequestWaitMillis);let o=ot;isNaN(i)||(o=Math.max(i,o));const s=t.logResponseDetails;Array.isArray(s)&&s.length>0&&'RETRY_REQUEST_LATER'===s[0].responseAction&&(ct=[...n,...ct],I.info("Retry transport request later.")),st=3,ut(o)})}function dt(t){const n=U.getInstance().getFlTransportFullUrl();return fetch(n,{method:'POST',body:JSON.stringify(t)})}function ft(t){if(!t.eventTime||!t.message)throw E.create("invalid cc log");ct=[...ct,t]}function gt(t){return(...n)=>{ft({message:t(...n),eventTime:Date.now()})}}
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
   */function ht(t,n){at||(at=gt(Tt)),at(t,n)}function vt(t){const n=U.getInstance();!n.instrumentationEnabled&&t.isAuto||(n.dataCollectionEnabled||t.isAuto)&&A.getInstance().requiredApisAvailable()&&(t.isAuto&&L()!==C.VISIBLE||(3===tt?_t(t):et(t.performanceController).then(()=>_t(t),()=>_t(t))))}function _t(t){if(!R())return;const n=U.getInstance();n.loggingEnabled&&n.logTraceAfterSampling&&setTimeout(()=>ht(t,1),0)}function bt(t){const n=U.getInstance();if(!n.instrumentationEnabled)return;const i=t.url,o=n.logEndPointUrl.split('?')[0],s=n.flTransportEndpointUrl.split('?')[0];i!==o&&i!==s&&n.loggingEnabled&&n.logNetworkAfterSampling&&setTimeout(()=>ht(t,0),0)}function Tt(t,n){return 0===n?Et(t):It(t)}function Et(t){const n={url:t.url,http_method:t.httpMethod||0,http_response_code:200,response_payload_bytes:t.responsePayloadBytes,client_start_time_us:t.startTimeUs,time_to_response_initiated_us:t.timeToResponseInitiatedUs,time_to_response_completed_us:t.timeToResponseCompletedUs},i={application_info:yt(t.performanceController.app),network_request_metric:n};return JSON.stringify(i)}function It(t){const n={name:t.name,is_auto:t.isAuto,client_start_time_us:t.startTimeUs,duration_us:t.durationUs};0!==Object.keys(t.counters).length&&(n.counters=t.counters);const i=t.getAttributes();0!==Object.keys(i).length&&(n.custom_attributes=i);const o={application_info:yt(t.performanceController.app),trace_metric:n};return JSON.stringify(o)}function yt(t){return{google_app_id:z(t),app_instance_id:R(),web_app_info:{sdk_version:l,page_url:A.getInstance().getUrl(),service_worker_status:D(),visibility_state:L(),effective_connection_type:$()},application_process_state:0}}
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
   */const wt=["_fp",f,h];function St(t,n){return!(0===t.length||t.length>100)&&(n&&n.startsWith(p)&&wt.indexOf(t)>-1||!t.startsWith("_"))}function Mt(t){const n=Math.floor(t);return n<t&&I.info(`Metric value should be an Integer, setting the value as : ${n}.`),n}
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
   */class At{constructor(t,n,i=!1,o){this.performanceController=t,this.name=n,this.isAuto=i,this.state=1,this.customAttributes={},this.counters={},this.api=A.getInstance(),this.randomId=Math.floor(1e6*Math.random()),this.isAuto||(this.traceStartMark=`FB-PERF-TRACE-START-${this.randomId}-${this.name}`,this.traceStopMark=`FB-PERF-TRACE-STOP-${this.randomId}-${this.name}`,this.traceMeasure=o||`${u}-${this.randomId}-${this.name}`,o&&this.calculateTraceMetrics())}start(){if(1!==this.state)throw E.create("trace started",{traceName:this.name});this.api.mark(this.traceStartMark),this.state=2}stop(){if(2!==this.state)throw E.create("trace stopped",{traceName:this.name});this.state=3,this.api.mark(this.traceStopMark),this.api.measure(this.traceMeasure,this.traceStartMark,this.traceStopMark),this.calculateTraceMetrics(),vt(this)}record(t,n,i){if(t<=0)throw E.create("nonpositive trace startTime",{traceName:this.name});if(n<=0)throw E.create("nonpositive trace duration",{traceName:this.name});if(this.durationUs=Math.floor(1e3*n),this.startTimeUs=Math.floor(1e3*t),i&&i.attributes&&(this.customAttributes=Object.assign({},i.attributes)),i&&i.metrics)for(const t of Object.keys(i.metrics))isNaN(Number(i.metrics[t]))||(this.counters[t]=Math.floor(Number(i.metrics[t])));vt(this)}incrementMetric(t,n=1){void 0===this.counters[t]?this.putMetric(t,n):this.putMetric(t,this.counters[t]+n)}putMetric(t,n){if(!St(t,this.name))throw E.create("invalid custom metric name",{customMetricName:t});this.counters[t]=Mt(null!=n?n:0)}getMetric(t){return this.counters[t]||0}putAttribute(t,n){const i=q(t),o=j(n);if(i&&o)this.customAttributes[t]=n;else{if(!i)throw E.create("invalid attribute name",{attributeName:t});if(!o)throw E.create("invalid attribute value",{attributeValue:n})}}getAttribute(t){return this.customAttributes[t]}removeAttribute(t){void 0!==this.customAttributes[t]&&delete this.customAttributes[t]}getAttributes(){return Object.assign({},this.customAttributes)}setStartTime(t){this.startTimeUs=t}setDuration(t){this.durationUs=t}calculateTraceMetrics(){const t=this.api.getEntriesByName(this.traceMeasure),n=t&&t[0];n&&(this.durationUs=Math.floor(1e3*n.duration),this.startTimeUs=Math.floor(1e3*(n.startTime+this.api.getTimeOrigin())))}static createOobTrace(t,n,i,o){const s=A.getInstance().getUrl();if(!s)return;const c=new At(t,p+s,!0),l=Math.floor(1e3*A.getInstance().getTimeOrigin());c.setStartTime(l),n&&n[0]&&(c.setDuration(Math.floor(1e3*n[0].duration)),c.putMetric('domInteractive',Math.floor(1e3*n[0].domInteractive)),c.putMetric('domContentLoadedEventEnd',Math.floor(1e3*n[0].domContentLoadedEventEnd)),c.putMetric('loadEventEnd',Math.floor(1e3*n[0].loadEventEnd)));if(i){const t=i.find(t=>"first-paint"===t.name);t&&t.startTime&&c.putMetric("_fp",Math.floor(1e3*t.startTime));const n=i.find(t=>"first-contentful-paint"===t.name);n&&n.startTime&&c.putMetric(f,Math.floor(1e3*n.startTime)),o&&c.putMetric(h,Math.floor(1e3*o))}vt(c)}static createUserTimingTrace(t,n){vt(new At(t,n,!1,n))}}
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
   */function kt(t,n){const i=n;if(!i||void 0===i.responseStart)return;const o=A.getInstance().getTimeOrigin(),s=Math.floor(1e3*(i.startTime+o)),c=i.responseStart?Math.floor(1e3*(i.responseStart-i.startTime)):void 0,l=Math.floor(1e3*(i.responseEnd-i.startTime));bt({performanceController:t,url:i.name&&i.name.split('?')[0],responsePayloadBytes:i.transferSize,startTimeUs:s,timeToResponseInitiatedUs:c,timeToResponseCompletedUs:l})}
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
   */function Nt(t){R()&&(setTimeout(()=>Ot(t),0),setTimeout(()=>Rt(t),0),setTimeout(()=>Pt(t),0))}function Rt(t){const n=A.getInstance(),i=n.getEntriesByType('resource');for(const n of i)kt(t,n);n.setupObserver('resource',n=>kt(t,n))}function Ot(t){const n=A.getInstance(),i=n.getEntriesByType('navigation'),o=n.getEntriesByType('paint');if(n.onFirstInputDelay){let s=setTimeout(()=>{At.createOobTrace(t,i,o),s=void 0},5e3);n.onFirstInputDelay(n=>{s&&(clearTimeout(s),At.createOobTrace(t,i,o,n))})}else At.createOobTrace(t,i,o)}function Pt(t){const n=A.getInstance(),i=n.getEntriesByType('measure');for(const n of i)Ut(t,n);n.setupObserver('measure',n=>Ut(t,n))}function Ut(t,n){const i=n.name;i.substring(0,21)!==u&&At.createUserTimingTrace(t,i)}
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
   */class Ct{constructor(t,n){this.app=t,this.installations=n,this.initialized=!1}_init(n){this.initialized||(void 0!==(null==n?void 0:n.dataCollectionEnabled)&&(this.dataCollectionEnabled=n.dataCollectionEnabled),void 0!==(null==n?void 0:n.instrumentationEnabled)&&(this.instrumentationEnabled=n.instrumentationEnabled),A.getInstance().requiredApisAvailable()?(0,t.validateIndexedDBOpenable)().then(t=>{t&&(lt||(ut(5500),lt=!0),et(this).then(()=>Nt(this),()=>Nt(this)),this.initialized=!0)}).catch(t=>{I.info(`Environment doesn't support IndexedDB: ${t}`)}):I.info("Firebase Performance cannot start if the browser does not support \"Fetch\" and \"Promise\", or cookies are disabled."))}set instrumentationEnabled(t){U.getInstance().instrumentationEnabled=t}get instrumentationEnabled(){return U.getInstance().instrumentationEnabled}set dataCollectionEnabled(t){U.getInstance().dataCollectionEnabled=t}get dataCollectionEnabled(){return U.getInstance().dataCollectionEnabled}}const Bt=(t,{options:n})=>{const i=t.getProvider('app').getImmediate(),o=t.getProvider('installations-internal').getImmediate();if("[DEFAULT]"!==i.name)throw E.create("FB not default");k(window);const s=new Ct(i,o);return s._init(n),s};(0,i._registerComponent)(new o.Component('performance',Bt,"PUBLIC")),(0,i.registerVersion)(s,c),(0,i.registerVersion)(s,c,'esm2017')},719,[260,261,258,259,715]);