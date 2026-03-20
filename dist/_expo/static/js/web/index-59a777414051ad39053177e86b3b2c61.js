__d(function(g,r,i,a,m,e,d){Object.defineProperty(e,"__esModule",{value:!0});var n=r(d[0]);Object.keys(n).forEach(function(t){"default"!==t&&"__esModule"!==t&&(t in e&&e[t]===n[t]||Object.defineProperty(e,t,{enumerable:!0,get:function(){return n[t]}}))})},752,[754]);
__d(function(g,r,_i,a,m,e,d){Object.defineProperty(e,"__esModule",{value:!0}),e.getPerformance=function(n=(0,o.getApp)()){n=(0,t.getModularInstance)(n);const i=(0,o._getProvider)(n,'performance');return i.getImmediate()},e.initializePerformance=function(n,i){n=(0,t.getModularInstance)(n);const s=(0,o._getProvider)(n,'performance');if(s.isInitialized()){const n=s.getImmediate(),o=s.getOptions();if((0,t.deepEqual)(o,null!=i?i:{}))return n;throw S.create("already initialized")}return s.initialize({options:i})},e.trace=function(n,i){return n=(0,t.getModularInstance)(n),new Ct(n,i)};var t=r(d[0]),n=r(d[1]),i=r(d[2]),o=r(d[3]),s=r(d[4]);r(d[5]);const c="@firebase/performance",l="0.7.7",u=l,p='FB-PERF-TRACE-MEASURE',f='_wt_',h='_fcp',v='_fid',b='_lcp',_='_inp',T='_cls',E='@firebase/performance/config',I='@firebase/performance/configexpire',y='Performance',w={"trace started":'Trace {$traceName} was started before.',"trace stopped":'Trace {$traceName} is not running.',"nonpositive trace startTime":'Trace {$traceName} startTime should be positive.',"nonpositive trace duration":'Trace {$traceName} duration should be positive.',"no window":'Window is not available.',"no app id":'App id is not available.',"no project id":'Project id is not available.',"no api key":'Api key is not available.',"invalid cc log":'Attempted to queue invalid cc event',"FB not default":'Performance can only start when Firebase app instance is the default one.',"RC response not ok":'RC response is not ok',"invalid attribute name":'Attribute name {$attributeName} is invalid.',"invalid attribute value":'Attribute value {$attributeValue} is invalid.',"invalid custom metric name":'Custom metric name {$customMetricName} is invalid',"invalid String merger input":'Input for String merger is invalid, contact support team to resolve.',"already initialized":"initializePerformance() has already been called with different options. To avoid this error, call initializePerformance() with the same options as when it was originally called, or call getPerformance() to return the already initialized instance."},S=new t.ErrorFactory('performance',y,w),M=new n.Logger(y);
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
let A,N,k,P;M.logLevel=n.LogLevel.INFO;class C{constructor(t){if(this.window=t,!t)throw S.create("no window");this.performance=t.performance,this.PerformanceObserver=t.PerformanceObserver,this.windowLocation=t.location,this.navigator=t.navigator,this.document=t.document,this.navigator&&this.navigator.cookieEnabled&&(this.localStorage=t.localStorage),t.perfMetrics&&t.perfMetrics.onFirstInputDelay&&(this.onFirstInputDelay=t.perfMetrics.onFirstInputDelay),this.onLCP=i.onLCP,this.onINP=i.onINP,this.onCLS=i.onCLS}getUrl(){return this.windowLocation.href.split('?')[0]}mark(t){this.performance&&this.performance.mark&&this.performance.mark(t)}measure(t,n,i){this.performance&&this.performance.measure&&this.performance.measure(t,n,i)}getEntriesByType(t){return this.performance&&this.performance.getEntriesByType?this.performance.getEntriesByType(t):[]}getEntriesByName(t){return this.performance&&this.performance.getEntriesByName?this.performance.getEntriesByName(t):[]}getTimeOrigin(){return this.performance&&(this.performance.timeOrigin||this.performance.timing.navigationStart)}requiredApisAvailable(){return fetch&&Promise&&(0,t.areCookiesEnabled)()?!!(0,t.isIndexedDBAvailable)()||(M.info('IndexedDB is not supported by current browser'),!1):(M.info('Firebase Performance cannot start if browser does not support fetch and Promise or cookie is disabled.'),!1)}setupObserver(t,n){if(!this.PerformanceObserver)return;new this.PerformanceObserver(t=>{for(const i of t.getEntries())n(i)}).observe({entryTypes:[t]})}static getInstance(){return void 0===A&&(A=new C(N)),A}}function O(t){N=t}
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
   */function R(t){const n=t.getId();return n.then(t=>{k=t}),n}function U(){return k}function B(t){const n=t.getToken();return n.then(t=>{}),n}
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
   */function L(t,n){const i=t.length-n.length;if(i<0||i>1)throw S.create("invalid String merger input");const o=[];for(let i=0;i<t.length;i++)o.push(t.charAt(i)),n.length>i&&o.push(n.charAt(i));return o.join('')}
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
   */class F{constructor(){this.instrumentationEnabled=!0,this.dataCollectionEnabled=!0,this.loggingEnabled=!1,this.tracesSamplingRate=1,this.networkRequestsSamplingRate=1,this.logEndPointUrl='https://firebaselogging.googleapis.com/v0cc/log?format=json_proto',this.flTransportEndpointUrl=L('hts/frbslgigp.ogepscmv/ieo/eaylg','tp:/ieaeogn-agolai.o/1frlglgc/o'),this.transportKey=L('AzSC8r6ReiGqFMyfvgow','Iayx0u-XT3vksVM-pIV'),this.logSource=462,this.logTraceAfterSampling=!1,this.logNetworkAfterSampling=!1,this.configTimeToLive=12}getFlTransportFullUrl(){return this.flTransportEndpointUrl.concat('?key=',this.transportKey)}static getInstance(){return void 0===P&&(P=new F),P}}
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
   */var D;!(function(t){t[t.UNKNOWN=0]="UNKNOWN",t[t.VISIBLE=1]="VISIBLE",t[t.HIDDEN=2]="HIDDEN"})(D||(D={}));const $=['firebase_','google_','ga_'],q=new RegExp('^[a-zA-Z]\\w*$');function j(){const t=C.getInstance().navigator;return(null==t?void 0:t.serviceWorker)?t.serviceWorker.controller?2:3:1}function z(){switch(C.getInstance().document.visibilityState){case'visible':return D.VISIBLE;case'hidden':return D.HIDDEN;default:return D.UNKNOWN}}function V(){const t=C.getInstance().navigator.connection;switch(t&&t.effectiveType){case'slow-2g':return 1;case'2g':return 2;case'3g':return 3;case'4g':return 4;default:return 0}}function W(t){if(0===t.length||t.length>40)return!1;return!$.some(n=>t.startsWith(n))&&!!t.match(q)}function K(t){return 0!==t.length&&t.length<=100}
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
   */function x(t){var n;const i=null===(n=t.options)||void 0===n?void 0:n.appId;if(!i)throw S.create("no app id");return i}function J(t){var n;const i=null===(n=t.options)||void 0===n?void 0:n.projectId;if(!i)throw S.create("no project id");return i}function H(t){var n;const i=null===(n=t.options)||void 0===n?void 0:n.apiKey;if(!i)throw S.create("no api key");return i}
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
   */const G={loggingEnabled:!0};function X(t,n){const i=Z();return i?(et(i),Promise.resolve()):tt(t,n).then(et).then(t=>Q(t),()=>{})}function Z(){const t=C.getInstance().localStorage;if(!t)return;const n=t.getItem(I);if(!(n&&(i=n,Number(i)>Date.now())))return;var i;const o=t.getItem(E);if(o)try{return JSON.parse(o)}catch(t){return}}function Q(t){const n=C.getInstance().localStorage;t&&n&&(n.setItem(E,JSON.stringify(t)),n.setItem(I,String(Date.now()+60*F.getInstance().configTimeToLive*60*1e3)))}const Y='Could not fetch config, will use default configs';function tt(t,n){return B(t.installations).then(i=>{const o=J(t.app),s=H(t.app),c=new Request(`https://firebaseremoteconfig.googleapis.com/v1/projects/${o}/namespaces/fireperf:fetch?key=${s}`,{method:'POST',headers:{Authorization:`FIREBASE_INSTALLATIONS_AUTH ${i}`},body:JSON.stringify({app_instance_id:n,app_instance_id_token:i,app_id:x(t.app),app_version:u,sdk_version:"0.0.1"})});return fetch(c).then(t=>{if(t.ok)return t.json();throw S.create("RC response not ok")})}).catch(()=>{M.info(Y)})}function et(t){if(!t)return t;const n=F.getInstance(),i=t.entries||{};return void 0!==i.fpr_enabled?n.loggingEnabled='true'===String(i.fpr_enabled):n.loggingEnabled=G.loggingEnabled,i.fpr_log_source?n.logSource=Number(i.fpr_log_source):G.logSource&&(n.logSource=G.logSource),i.fpr_log_endpoint_url?n.logEndPointUrl=i.fpr_log_endpoint_url:G.logEndPointUrl&&(n.logEndPointUrl=G.logEndPointUrl),i.fpr_log_transport_key?n.transportKey=i.fpr_log_transport_key:G.transportKey&&(n.transportKey=G.transportKey),void 0!==i.fpr_vc_network_request_sampling_rate?n.networkRequestsSamplingRate=Number(i.fpr_vc_network_request_sampling_rate):void 0!==G.networkRequestsSamplingRate&&(n.networkRequestsSamplingRate=G.networkRequestsSamplingRate),void 0!==i.fpr_vc_trace_sampling_rate?n.tracesSamplingRate=Number(i.fpr_vc_trace_sampling_rate):void 0!==G.tracesSamplingRate&&(n.tracesSamplingRate=G.tracesSamplingRate),n.logTraceAfterSampling=nt(n.tracesSamplingRate),n.logNetworkAfterSampling=nt(n.networkRequestsSamplingRate),t}function nt(t){return Math.random()<=t}
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
   */let it,rt=1;function ot(t){return rt=2,it=it||at(t),it}function at(t){return st().then(()=>R(t.installations)).then(n=>X(t,n)).then(()=>ct(),()=>ct())}function st(){const t=C.getInstance().document;return new Promise(n=>{if(t&&'complete'!==t.readyState){const i=()=>{'complete'===t.readyState&&(t.removeEventListener('readystatechange',i),n())};t.addEventListener('readystatechange',i)}else n()})}function ct(){rt=3}
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
   */let lt,ut=3,pt=[],dt=!1;function mt(t){setTimeout(()=>{ut<=0||(pt.length>0&&gt(),mt(1e4))},t)}function gt(){const t=pt.splice(0,1e3),n=t.map(t=>({source_extension_json_proto3:t.message,event_time_ms:String(t.eventTime)}));ft({request_time_ms:String(Date.now()),client_info:{client_type:1,js_client_info:{}},log_source:F.getInstance().logSource,log_event:n}).then(()=>{ut=3}).catch(()=>{pt=[...t,...pt],ut--,M.info(`Tries left: ${ut}.`),mt(1e4)})}function ft(t){const n=F.getInstance().getFlTransportFullUrl(),i=JSON.stringify(t);return navigator.sendBeacon&&navigator.sendBeacon(n,i)?Promise.resolve():fetch(n,{method:'POST',body:i,keepalive:!0}).then()}function ht(t){if(!t.eventTime||!t.message)throw S.create("invalid cc log");pt=[...pt,t]}function vt(t){return(...n)=>{ht({message:t(...n),eventTime:Date.now()})}}function bt(){for(;pt.length>0;)gt()}
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
   */function _t(t,n){lt||(lt={send:vt(yt),flush:bt}),lt.send(t,n)}function Tt(t){const n=F.getInstance();!n.instrumentationEnabled&&t.isAuto||(n.dataCollectionEnabled||t.isAuto)&&C.getInstance().requiredApisAvailable()&&(3===rt?Et(t):ot(t.performanceController).then(()=>Et(t),()=>Et(t)))}function Et(t){if(!U())return;const n=F.getInstance();n.loggingEnabled&&n.logTraceAfterSampling&&_t(t,1)}function It(t){const n=F.getInstance();if(!n.instrumentationEnabled)return;const i=t.url,o=n.logEndPointUrl.split('?')[0],s=n.flTransportEndpointUrl.split('?')[0];i!==o&&i!==s&&n.loggingEnabled&&n.logNetworkAfterSampling&&_t(t,0)}function yt(t,n){return 0===n?wt(t):St(t)}function wt(t){const n={url:t.url,http_method:t.httpMethod||0,http_response_code:200,response_payload_bytes:t.responsePayloadBytes,client_start_time_us:t.startTimeUs,time_to_response_initiated_us:t.timeToResponseInitiatedUs,time_to_response_completed_us:t.timeToResponseCompletedUs},i={application_info:Mt(t.performanceController.app),network_request_metric:n};return JSON.stringify(i)}function St(t){const n={name:t.name,is_auto:t.isAuto,client_start_time_us:t.startTimeUs,duration_us:t.durationUs};0!==Object.keys(t.counters).length&&(n.counters=t.counters);const i=t.getAttributes();0!==Object.keys(i).length&&(n.custom_attributes=i);const o={application_info:Mt(t.performanceController.app),trace_metric:n};return JSON.stringify(o)}function Mt(t){return{google_app_id:x(t),app_instance_id:U(),web_app_info:{sdk_version:u,page_url:C.getInstance().getUrl(),service_worker_status:j(),visibility_state:z(),effective_connection_type:V()},application_process_state:0}}
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
   */function At(t,n){const i=n;if(!i||void 0===i.responseStart)return;const o=C.getInstance().getTimeOrigin(),s=Math.floor(1e3*(i.startTime+o)),c=i.responseStart?Math.floor(1e3*(i.responseStart-i.startTime)):void 0,l=Math.floor(1e3*(i.responseEnd-i.startTime));It({performanceController:t,url:i.name&&i.name.split('?')[0],responsePayloadBytes:i.transferSize,startTimeUs:s,timeToResponseInitiatedUs:c,timeToResponseCompletedUs:l})}
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
   */const Nt=["_fp",h,v,b,T,_];function kt(t,n){return!(0===t.length||t.length>100)&&(n&&n.startsWith(f)&&Nt.indexOf(t)>-1||!t.startsWith("_"))}function Pt(t){const n=Math.floor(t);return n<t&&M.info(`Metric value should be an Integer, setting the value as : ${n}.`),n}
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
   */class Ct{constructor(t,n,i=!1,o){this.performanceController=t,this.name=n,this.isAuto=i,this.state=1,this.customAttributes={},this.counters={},this.api=C.getInstance(),this.randomId=Math.floor(1e6*Math.random()),this.isAuto||(this.traceStartMark=`FB-PERF-TRACE-START-${this.randomId}-${this.name}`,this.traceStopMark=`FB-PERF-TRACE-STOP-${this.randomId}-${this.name}`,this.traceMeasure=o||`${p}-${this.randomId}-${this.name}`,o&&this.calculateTraceMetrics())}start(){if(1!==this.state)throw S.create("trace started",{traceName:this.name});this.api.mark(this.traceStartMark),this.state=2}stop(){if(2!==this.state)throw S.create("trace stopped",{traceName:this.name});this.state=3,this.api.mark(this.traceStopMark),this.api.measure(this.traceMeasure,this.traceStartMark,this.traceStopMark),this.calculateTraceMetrics(),Tt(this)}record(t,n,i){if(t<=0)throw S.create("nonpositive trace startTime",{traceName:this.name});if(n<=0)throw S.create("nonpositive trace duration",{traceName:this.name});if(this.durationUs=Math.floor(1e3*n),this.startTimeUs=Math.floor(1e3*t),i&&i.attributes&&(this.customAttributes=Object.assign({},i.attributes)),i&&i.metrics)for(const t of Object.keys(i.metrics))isNaN(Number(i.metrics[t]))||(this.counters[t]=Math.floor(Number(i.metrics[t])));Tt(this)}incrementMetric(t,n=1){void 0===this.counters[t]?this.putMetric(t,n):this.putMetric(t,this.counters[t]+n)}putMetric(t,n){if(!kt(t,this.name))throw S.create("invalid custom metric name",{customMetricName:t});this.counters[t]=Pt(null!=n?n:0)}getMetric(t){return this.counters[t]||0}putAttribute(t,n){const i=W(t),o=K(n);if(i&&o)this.customAttributes[t]=n;else{if(!i)throw S.create("invalid attribute name",{attributeName:t});if(!o)throw S.create("invalid attribute value",{attributeValue:n})}}getAttribute(t){return this.customAttributes[t]}removeAttribute(t){void 0!==this.customAttributes[t]&&delete this.customAttributes[t]}getAttributes(){return Object.assign({},this.customAttributes)}setStartTime(t){this.startTimeUs=t}setDuration(t){this.durationUs=t}calculateTraceMetrics(){const t=this.api.getEntriesByName(this.traceMeasure),n=t&&t[0];n&&(this.durationUs=Math.floor(1e3*n.duration),this.startTimeUs=Math.floor(1e3*(n.startTime+this.api.getTimeOrigin())))}static createOobTrace(t,n,i,o,s){const c=C.getInstance().getUrl();if(!c)return;const l=new Ct(t,f+c,!0),u=Math.floor(1e3*C.getInstance().getTimeOrigin());l.setStartTime(u),n&&n[0]&&(l.setDuration(Math.floor(1e3*n[0].duration)),l.putMetric('domInteractive',Math.floor(1e3*n[0].domInteractive)),l.putMetric('domContentLoadedEventEnd',Math.floor(1e3*n[0].domContentLoadedEventEnd)),l.putMetric('loadEventEnd',Math.floor(1e3*n[0].loadEventEnd)));if(i){const t=i.find(t=>"first-paint"===t.name);t&&t.startTime&&l.putMetric("_fp",Math.floor(1e3*t.startTime));const n=i.find(t=>"first-contentful-paint"===t.name);n&&n.startTime&&l.putMetric(h,Math.floor(1e3*n.startTime)),s&&l.putMetric(v,Math.floor(1e3*s))}this.addWebVitalMetric(l,b,"lcp_element",o.lcp),this.addWebVitalMetric(l,T,"cls_largestShiftTarget",o.cls),this.addWebVitalMetric(l,_,"inp_interactionTarget",o.inp),Tt(l),lt&&lt.flush()}static addWebVitalMetric(t,n,i,o){o&&(t.putMetric(n,Math.floor(1e3*o.value)),o.elementAttribution&&t.putAttribute(i,o.elementAttribution))}static createUserTimingTrace(t,n){Tt(new Ct(t,n,!1,n))}}
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
   */let Ot,Rt={},Ut=!1;function Bt(t){U()&&(setTimeout(()=>Ft(t),0),setTimeout(()=>Lt(t),0),setTimeout(()=>Dt(t),0))}function Lt(t){const n=C.getInstance(),i=n.getEntriesByType('resource');for(const n of i)At(t,n);n.setupObserver('resource',n=>At(t,n))}function Ft(t){const n=C.getInstance();'onpagehide'in window?n.document.addEventListener('pagehide',()=>qt(t)):n.document.addEventListener('unload',()=>qt(t)),n.document.addEventListener('visibilitychange',()=>{'hidden'===n.document.visibilityState&&qt(t)}),n.onFirstInputDelay&&n.onFirstInputDelay(t=>{Ot=t}),n.onLCP(t=>{var n;Rt.lcp={value:t.value,elementAttribution:null===(n=t.attribution)||void 0===n?void 0:n.element}}),n.onCLS(t=>{var n;Rt.cls={value:t.value,elementAttribution:null===(n=t.attribution)||void 0===n?void 0:n.largestShiftTarget}}),n.onINP(t=>{var n;Rt.inp={value:t.value,elementAttribution:null===(n=t.attribution)||void 0===n?void 0:n.interactionTarget}})}function Dt(t){const n=C.getInstance(),i=n.getEntriesByType('measure');for(const n of i)$t(t,n);n.setupObserver('measure',n=>$t(t,n))}function $t(t,n){const i=n.name;i.substring(0,21)!==p&&Ct.createUserTimingTrace(t,i)}function qt(t){if(!Ut){Ut=!0;const n=C.getInstance(),i=n.getEntriesByType('navigation'),o=n.getEntriesByType('paint');setTimeout(()=>{Ct.createOobTrace(t,i,o,Rt,Ot)},0)}}
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
   */class jt{constructor(t,n){this.app=t,this.installations=n,this.initialized=!1}_init(n){this.initialized||(void 0!==(null==n?void 0:n.dataCollectionEnabled)&&(this.dataCollectionEnabled=n.dataCollectionEnabled),void 0!==(null==n?void 0:n.instrumentationEnabled)&&(this.instrumentationEnabled=n.instrumentationEnabled),C.getInstance().requiredApisAvailable()?(0,t.validateIndexedDBOpenable)().then(t=>{t&&(dt||(mt(5500),dt=!0),ot(this).then(()=>Bt(this),()=>Bt(this)),this.initialized=!0)}).catch(t=>{M.info(`Environment doesn't support IndexedDB: ${t}`)}):M.info("Firebase Performance cannot start if the browser does not support \"Fetch\" and \"Promise\", or cookies are disabled."))}set instrumentationEnabled(t){F.getInstance().instrumentationEnabled=t}get instrumentationEnabled(){return F.getInstance().instrumentationEnabled}set dataCollectionEnabled(t){F.getInstance().dataCollectionEnabled=t}get dataCollectionEnabled(){return F.getInstance().dataCollectionEnabled}}const zt=(t,{options:n})=>{const i=t.getProvider('app').getImmediate(),o=t.getProvider('installations-internal').getImmediate();if("[DEFAULT]"!==i.name)throw S.create("FB not default");O(window);const s=new jt(i,o);return s._init(n),s};(0,o._registerComponent)(new s.Component('performance',zt,"PUBLIC")),(0,o.registerVersion)(c,l),(0,o.registerVersion)(c,l,'esm2017')},754,[260,262,755,258,259,750]);
__d(function(g,r,i,a,m,e,d){Object.defineProperty(e,"__esModule",{value:!0});var n=r(d[0]);Object.keys(n).forEach(function(t){"default"!==t&&"__esModule"!==t&&(t in e&&e[t]===n[t]||Object.defineProperty(e,t,{enumerable:!0,get:function(){return n[t]}}))})},755,[756]);
__d(function(_g,_r,_i,_a,_m,_e,_d){Object.defineProperty(_e,"__esModule",{value:!0}),_e.onTTFB=_e.onLCP=_e.onINP=_e.onFID=_e.onFCP=_e.onCLS=_e.TTFBThresholds=_e.LCPThresholds=_e.INPThresholds=_e.FIDThresholds=_e.FCPThresholds=_e.CLSThresholds=void 0;var t,e,n=function(){var t=self.performance&&performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(t&&t.responseStart>0&&t.responseStart<performance.now())return t},r=function(t){if("loading"===document.readyState)return"loading";var e=n();if(e){if(t<e.domInteractive)return"loading";if(0===e.domContentLoadedEventStart||t<e.domContentLoadedEventStart)return"dom-interactive";if(0===e.domComplete||t<e.domComplete)return"dom-content-loaded"}return"complete"},i=function(t){var e=t.nodeName;return 1===t.nodeType?e.toLowerCase():e.toUpperCase().replace(/^#/,"")},a=function(t,e){var n="";try{for(;t&&9!==t.nodeType;){var r=t,a=r.id?"#"+r.id:i(r)+(r.classList&&r.classList.value&&r.classList.value.trim()&&r.classList.value.trim().length?"."+r.classList.value.trim().replace(/\s+/g,"."):"");if(n.length+a.length>(e||100)-1)return n||a;if(n=n?a+">"+n:a,r.id)break;t=r.parentNode}}catch(t){}return n},o=-1,s=function(){return o},c=function(t){addEventListener("pageshow",function(e){e.persisted&&(o=e.timeStamp,t(e))},!0)},u=function(){var t=n();return t&&t.activationStart||0},f=function(t,e){var r=n(),i="navigate";return s()>=0?i="back-forward-cache":r&&(document.prerendering||u()>0?i="prerender":document.wasDiscarded?i="restore":r.type&&(i=r.type.replace(/_/g,"-"))),{name:t,value:void 0===e?-1:e,rating:"good",delta:0,entries:[],id:"v4-".concat(Date.now(),"-").concat(Math.floor(8999999999999*Math.random())+1e12),navigationType:i}},d=function(t,e,n){try{if(PerformanceObserver.supportedEntryTypes.includes(t)){var r=new PerformanceObserver(function(t){Promise.resolve().then(function(){e(t.getEntries())})});return r.observe(Object.assign({type:t,buffered:!0},n||{})),r}}catch(t){}},l=function(t,e,n,r){var i,a;return function(o){e.value>=0&&(o||r)&&((a=e.value-(i||0))||void 0===i)&&(i=e.value,e.delta=a,e.rating=(function(t,e){return t>e[1]?"poor":t>e[0]?"needs-improvement":"good"})(e.value,n),t(e))}},m=function(t){requestAnimationFrame(function(){return requestAnimationFrame(function(){return t()})})},v=function(t){document.addEventListener("visibilitychange",function(){"hidden"===document.visibilityState&&t()})},p=function(t){var e=!1;return function(){e||(t(),e=!0)}},h=-1,g=function(){return"hidden"!==document.visibilityState||document.prerendering?1/0:0},T=function(t){"hidden"===document.visibilityState&&h>-1&&(h="visibilitychange"===t.type?t.timeStamp:0,E())},y=function(){addEventListener("visibilitychange",T,!0),addEventListener("prerenderingchange",T,!0)},E=function(){removeEventListener("visibilitychange",T,!0),removeEventListener("prerenderingchange",T,!0)},S=function(){return h<0&&(h=g(),y(),c(function(){setTimeout(function(){h=g(),y()},0)})),{get firstHiddenTime(){return h}}},C=function(t){document.prerendering?addEventListener("prerenderingchange",function(){return t()},!0):t()},L=_e.FCPThresholds=[1800,3e3],b=function(t,e){e=e||{},C(function(){var n,r=S(),i=f("FCP"),a=d("paint",function(t){t.forEach(function(t){"first-contentful-paint"===t.name&&(a.disconnect(),t.startTime<r.firstHiddenTime&&(i.value=Math.max(t.startTime-u(),0),i.entries.push(t),n(!0)))})});a&&(n=l(t,i,L,e.reportAllChanges),c(function(r){i=f("FCP"),n=l(t,i,L,e.reportAllChanges),m(function(){i.value=performance.now()-r.timeStamp,n(!0)})}))})},D=_e.CLSThresholds=[.1,.25],M=0,F=1/0,I=0,P=function(t){t.forEach(function(t){t.interactionId&&(F=Math.min(F,t.interactionId),I=Math.max(I,t.interactionId),M=I?(I-F)/7+1:0)})},w=function(){return t?M:performance.interactionCount||0},x=function(){"interactionCount"in performance||t||(t=d("event",P,{type:"event",buffered:!0,durationThreshold:0}))},k=[],A=new Map,B=0,O=function(){var t=Math.min(k.length-1,Math.floor((w()-B)/50));return k[t]},j=[],N=function(t){if(j.forEach(function(e){return e(t)}),t.interactionId||"first-input"===t.entryType){var e=k[k.length-1],n=A.get(t.interactionId);if(n||k.length<10||t.duration>e.latency){if(n)t.duration>n.latency?(n.entries=[t],n.latency=t.duration):t.duration===n.latency&&t.startTime===n.entries[0].startTime&&n.entries.push(t);else{var r={id:t.interactionId,latency:t.duration,entries:[t]};A.set(r.id,r),k.push(r)}k.sort(function(t,e){return e.latency-t.latency}),k.length>10&&k.splice(10).forEach(function(t){return A.delete(t.id)})}}},R=function(t){var e=self.requestIdleCallback||self.setTimeout,n=-1;return t=p(t),"hidden"===document.visibilityState?t():(n=e(t),v(t)),n},q=_e.INPThresholds=[200,500],_=function(t,e){"PerformanceEventTiming"in self&&"interactionId"in PerformanceEventTiming.prototype&&(e=e||{},C(function(){var n;x();var r,i=f("INP"),a=function(t){R(function(){t.forEach(N);var e=O();e&&e.latency!==i.value&&(i.value=e.latency,i.entries=e.entries,r())})},o=d("event",a,{durationThreshold:null!==(n=e.durationThreshold)&&void 0!==n?n:40});r=l(t,i,q,e.reportAllChanges),o&&(o.observe({type:"first-input",buffered:!0}),v(function(){a(o.takeRecords()),r(!0)}),c(function(){B=w(),k.length=0,A.clear(),i=f("INP"),r=l(t,i,q,e.reportAllChanges)}))}))},H=[],W=[],z=0,U=new WeakMap,V=new Map,G=-1,J=function(t){H=H.concat(t),K()},K=function(){G<0&&(G=R(Q))},Q=function(){V.size>10&&V.forEach(function(t,e){A.has(e)||V.delete(e)});var t=k.map(function(t){return U.get(t.entries[0])}),e=W.length-50;W=W.filter(function(n,r){return r>=e||t.includes(n)});for(var n=new Set,r=0;r<W.length;r++){var i=W[r];tt(i.startTime,i.processingEnd).forEach(function(t){n.add(t)})}var a=H.length-1-50;H=H.filter(function(t,e){return t.startTime>z&&e>a||n.has(t)}),G=-1};_e.onFCP=function(t,e){b(function(e){var i=(function(t){var e={timeToFirstByte:0,firstByteToFCP:t.value,loadState:r(s())};if(t.entries.length){var i=n(),a=t.entries[t.entries.length-1];if(i){var o=i.activationStart||0,c=Math.max(0,i.responseStart-o);e={timeToFirstByte:c,firstByteToFCP:t.value-c,loadState:r(t.entries[0].startTime),navigationEntry:i,fcpEntry:a}}}return Object.assign(t,{attribution:e})})(e);t(i)},e)},_e.onCLS=function(t,e){!(function(t,e){e=e||{},b(p(function(){var n,r=f("CLS",0),i=0,a=[],o=function(t){t.forEach(function(t){if(!t.hadRecentInput){var e=a[0],n=a[a.length-1];i&&t.startTime-n.startTime<1e3&&t.startTime-e.startTime<5e3?(i+=t.value,a.push(t)):(i=t.value,a=[t])}}),i>r.value&&(r.value=i,r.entries=a,n())},s=d("layout-shift",o);s&&(n=l(t,r,D,e.reportAllChanges),v(function(){o(s.takeRecords()),n(!0)}),c(function(){i=0,r=f("CLS",0),n=l(t,r,D,e.reportAllChanges),m(function(){return n()})}),setTimeout(n,0))}))})(function(e){var n=(function(t){var e,n={};if(t.entries.length){var i=t.entries.reduce(function(t,e){return t&&t.value>e.value?t:e});if(i&&i.sources&&i.sources.length){var o=(e=i.sources).find(function(t){return t.node&&1===t.node.nodeType})||e[0];o&&(n={largestShiftTarget:a(o.node),largestShiftTime:i.startTime,largestShiftValue:i.value,largestShiftSource:o,largestShiftEntry:i,loadState:r(i.startTime)})}}return Object.assign(t,{attribution:n})})(e);t(n)},e)},j.push(function(t){t.interactionId&&t.target&&!V.has(t.interactionId)&&V.set(t.interactionId,t.target)},function(t){var e,n=t.startTime+t.duration;z=Math.max(z,t.processingEnd);for(var r=W.length-1;r>=0;r--){var i=W[r];if(Math.abs(n-i.renderTime)<=8){(e=i).startTime=Math.min(t.startTime,e.startTime),e.processingStart=Math.min(t.processingStart,e.processingStart),e.processingEnd=Math.max(t.processingEnd,e.processingEnd),e.entries.push(t);break}}e||(e={startTime:t.startTime,processingStart:t.processingStart,processingEnd:t.processingEnd,renderTime:n,entries:[t]},W.push(e)),(t.interactionId||"first-input"===t.entryType)&&U.set(t,e),K()});var X,Y,Z,$,tt=function(t,e){for(var n,r=[],i=0;n=H[i];i++)if(!(n.startTime+n.duration<t)){if(n.startTime>e)break;r.push(n)}return r},et=_e.LCPThresholds=[2500,4e3],nt={},rt=_e.TTFBThresholds=[800,1800],it=function t(e){document.prerendering?C(function(){return t(e)}):"complete"!==document.readyState?addEventListener("load",function(){return t(e)},!0):setTimeout(e,0)},at=function(t,e){e=e||{};var r=f("TTFB"),i=l(t,r,rt,e.reportAllChanges);it(function(){var a=n();a&&(r.value=Math.max(a.responseStart-u(),0),r.entries=[a],i(!0),c(function(){r=f("TTFB",0),(i=l(t,r,rt,e.reportAllChanges))(!0)}))})},ot={passive:!0,capture:!0},st=new Date,ct=function(t,e){X||(X=e,Y=t,Z=new Date,dt(removeEventListener),ut())},ut=function(){if(Y>=0&&Y<Z-st){var t={entryType:"first-input",name:X.type,target:X.target,cancelable:X.cancelable,startTime:X.timeStamp,processingStart:X.timeStamp+Y};$.forEach(function(e){e(t)}),$=[]}},ft=function(t){if(t.cancelable){var e=(t.timeStamp>1e12?new Date:performance.now())-t.timeStamp;"pointerdown"==t.type?(function(t,e){var n=function(){ct(t,e),i()},r=function(){i()},i=function(){removeEventListener("pointerup",n,ot),removeEventListener("pointercancel",r,ot)};addEventListener("pointerup",n,ot),addEventListener("pointercancel",r,ot)})(e,t):ct(e,t)}},dt=function(t){["mousedown","keydown","touchstart","pointerdown"].forEach(function(e){return t(e,ft,ot)})},lt=_e.FIDThresholds=[100,300],mt=function(t,e){e=e||{},C(function(){var n,r=S(),i=f("FID"),a=function(t){t.startTime<r.firstHiddenTime&&(i.value=t.processingStart-t.startTime,i.entries.push(t),n(!0))},o=function(t){t.forEach(a)},s=d("first-input",o);n=l(t,i,lt,e.reportAllChanges),s&&(v(p(function(){o(s.takeRecords()),s.disconnect()})),c(function(){var r;i=f("FID"),n=l(t,i,lt,e.reportAllChanges),$=[],Y=-1,X=null,dt(addEventListener),r=a,$.push(r),ut()}))})};_e.onFID=function(t,e){mt(function(e){var n=(function(t){var e=t.entries[0],n={eventTarget:a(e.target),eventType:e.name,eventTime:e.startTime,eventEntry:e,loadState:r(e.startTime)};return Object.assign(t,{attribution:n})})(e);t(n)},e)},_e.onTTFB=function(t,e){at(function(e){var n=(function(t){var e={waitingDuration:0,cacheDuration:0,dnsDuration:0,connectionDuration:0,requestDuration:0};if(t.entries.length){var n=t.entries[0],r=n.activationStart||0,i=Math.max((n.workerStart||n.fetchStart)-r,0),a=Math.max(n.domainLookupStart-r,0),o=Math.max(n.connectStart-r,0),s=Math.max(n.connectEnd-r,0);e={waitingDuration:i,cacheDuration:a-i,dnsDuration:o-a,connectionDuration:s-o,requestDuration:t.value-s,navigationEntry:n}}return Object.assign(t,{attribution:e})})(e);t(n)},e)},_e.onLCP=function(t,e){!(function(t,e){e=e||{},C(function(){var n,r=S(),i=f("LCP"),a=function(t){e.reportAllChanges||(t=t.slice(-1)),t.forEach(function(t){t.startTime<r.firstHiddenTime&&(i.value=Math.max(t.startTime-u(),0),i.entries=[t],n())})},o=d("largest-contentful-paint",a);if(o){n=l(t,i,et,e.reportAllChanges);var s=p(function(){nt[i.id]||(a(o.takeRecords()),o.disconnect(),nt[i.id]=!0,n(!0))});["keydown","click"].forEach(function(t){addEventListener(t,function(){return R(s)},{once:!0,capture:!0})}),v(s),c(function(r){i=f("LCP"),n=l(t,i,et,e.reportAllChanges),m(function(){i.value=performance.now()-r.timeStamp,nt[i.id]=!0,n(!0)})})}})})(function(e){var r=(function(t){var e={timeToFirstByte:0,resourceLoadDelay:0,resourceLoadDuration:0,elementRenderDelay:t.value};if(t.entries.length){var r=n();if(r){var i=r.activationStart||0,o=t.entries[t.entries.length-1],s=o.url&&performance.getEntriesByType("resource").filter(function(t){return t.name===o.url})[0],c=Math.max(0,r.responseStart-i),u=Math.max(c,s?(s.requestStart||s.startTime)-i:0),f=Math.max(u,s?s.responseEnd-i:0),d=Math.max(f,o.startTime-i);e={element:a(o.element),timeToFirstByte:c,resourceLoadDelay:u-c,resourceLoadDuration:f-u,elementRenderDelay:d-f,navigationEntry:r,lcpEntry:o},o.url&&(e.url=o.url),s&&(e.lcpResourceEntry=s)}}return Object.assign(t,{attribution:e})})(e);t(r)},e)},_e.onINP=function(t,n){e||(e=d("long-animation-frame",J)),_(function(e){var n=(function(t){var e=t.entries[0],n=U.get(e),i=e.processingStart,o=n.processingEnd,s=n.entries.sort(function(t,e){return t.processingStart-e.processingStart}),c=tt(e.startTime,o),u=t.entries.find(function(t){return t.target}),f=u&&u.target||V.get(e.interactionId),d=[e.startTime+e.duration,o].concat(c.map(function(t){return t.startTime+t.duration})),l=Math.max.apply(Math,d),m={interactionTarget:a(f),interactionTargetElement:f,interactionType:e.name.startsWith("key")?"keyboard":"pointer",interactionTime:e.startTime,nextPaintTime:l,processedEventEntries:s,longAnimationFrameEntries:c,inputDelay:i-e.startTime,processingDuration:o-i,presentationDelay:Math.max(l-o,0),loadState:r(e.startTime)};return Object.assign(t,{attribution:m})})(e);t(n)},n)}},756,[]);