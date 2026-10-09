import {BrowserHost} from './host.mjs';
import {inspect} from './vm.mjs';
const output=document.getElementById('output'),error=document.getElementById('error');
let bundle,host,controller,execution;
function showError(e){error.textContent='塗鴉室無法啟動。請以本機伺服器或安全連線開啟，並使用支援圖形加速的新版瀏覽器。';error.hidden=false;console.error('星泉啟動錯誤：',e);}
async function stop(){const previous=host;if(previous){previous.processing.exiting=true;controller.abort();await execution?.catch(()=>{});await previous.dispose();if(host===previous){host=null;window.aquarius.host=null;}}window.aquarius.state='stopped';}
async function run(entry=bundle.entry,frames=0){
  await stop();document.getElementById('surfaces').replaceChildren();output.textContent='';error.hidden=true;
  controller=new AbortController();const current=new BrowserHost(bundle,{signal:controller.signal,frameLimit:frames,print:s=>{output.textContent+=s+'\n';console.log(s);}});
  host=current;window.aquarius.host=host;啟用保護(host);window.aquarius.state='running';execution=current.execute(entry);
  try{const result=await execution;if(host===current){window.aquarius.state='finished';if(result!==undefined)output.textContent+=inspect(result)+'\n';}return {result:inspect(result),output:output.textContent};}
  catch(e){if(host===current&&!current.signal.aborted){window.aquarius.state='error';output.textContent+=e.message+'\n';showError(e);}throw e;}
}
try{
  const response=await fetch('./program.json');if(!response.ok)throw new Error(`Could not load program (${response.status})`);
  bundle=await response.json();window.aquarius={bundle,run,stop,host:null,state:'ready'};
  // Developer/test hooks remain available without adding controls to the game.
  const params=new URLSearchParams(location.search);
  if(params.get('autorun')!=='0')run(bundle.entry,Number(params.get('frames')??0)).catch(e=>{if(!controller?.signal.aborted){showError(e);console.error(e);}});
}catch(e){showError(e);console.error(e);}

// 此層只處理瀏覽器生命週期；所有繪圖、工具與文件邏輯來自星泉位元碼。
function 啟用保護(主機){
 const 原開始=主機.processing.beginFrame.bind(主機.processing);主機.processing.處理事件=false;
 主機.processing.beginFrame=async()=>{主機.processing.處理事件=true;try{return await 原開始();}finally{主機.processing.處理事件=false;}};
 const 原呼叫=主機.vm.invoke.bind(主機.vm);主機.vm.作業數=0;
 主機.vm.invoke=async(...參數)=>{主機.vm.作業數++;try{return await 原呼叫(...參數);}finally{主機.vm.作業數--;}};
 document.addEventListener('contextmenu',事件=>事件.preventDefault(),{signal:主機.signal});
 document.addEventListener('keydown',事件=>{if((事件.ctrlKey||事件.metaKey)&&['s','o','p','n','a','z','y'].includes(事件.key.toLowerCase()))事件.preventDefault();},{signal:主機.signal});
 const 畫布=()=>主機.processing.dom;
 document.addEventListener('pointerdown',事件=>{if(事件.target===畫布()){畫布().style.touchAction='none';畫布().setPointerCapture?.(事件.pointerId);}},{signal:主機.signal});
 document.addEventListener('pointerup',事件=>{if(事件.target===畫布()&&畫布().hasPointerCapture?.(事件.pointerId))畫布().releasePointerCapture(事件.pointerId);},{signal:主機.signal});
 document.addEventListener('pointercancel',()=>{主機.processing.eventQueue.push({name:'mouseReleased',fields:{isMousePressed:false}});},{signal:主機.signal});
 const 原影格=主機.processing.endFrame.bind(主機.processing);
 主機.processing.endFrame=async()=>{await 原影格();收回資源(主機);};
}
function 收回資源(主機){
 if(主機.vm.作業數>0)return;
 const 已看=new Set(),存活=new Set();
 function 追蹤(值){
  if(!值||typeof 值!=='object'||已看.has(值))return;已看.add(值);
  if(主機.objects.has(值)||主機.application.objects.has(值))存活.add(值);
  if(值.type==='module')追蹤(值.scope);
  if(值.type==='closure')追蹤(值.env);
  if(值.store instanceof Map){for(const 項 of 值.store.values())追蹤(項);追蹤(值.outer);}
  if(Array.isArray(值))for(const 項 of 值)追蹤(項);
  if(值 instanceof Map)for(const 項 of 值.values())追蹤(項);
 }
 for(const 值 of 主機.modules.values())追蹤(值);
 for(const 值 of 主機.cache.values())追蹤(值);
 for(const 值 of 主機.processing.events.values())追蹤(值);
 for(const 圖 of 主機.processing.images){if(!存活.has(圖.module)){圖.texture?.destroy();if(圖.texture)主機.processing.device?.resources.delete(圖.texture);主機.objects.delete(圖.module);主機.processing.images.delete(圖);}}
 for(const 圖 of 主機.processing.canvases){if(!存活.has(圖.module)){圖.dispose();主機.objects.delete(圖.module);主機.processing.canvases.delete(圖);}}
 for(const [鍵,圖] of 主機.application.objects){if(圖.pixels instanceof Uint8Array&&!存活.has(鍵))主機.application.objects.delete(鍵);}
}
