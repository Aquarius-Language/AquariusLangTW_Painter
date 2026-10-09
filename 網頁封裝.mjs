import { readFile as 讀取, writeFile as 寫入 } from 'node:fs/promises';
const 修改=async(檔名,處理)=>寫入(檔名,處理(await 讀取(檔名,'utf8')));
await 修改('web/index.html',內容=>內容.replace('lang="en"','lang="zh-Hant"').replace('Aquarius Web VM','星泉塗鴉室').replace('background:#0c1624','background:#081012').replace('outline:none','outline:none;touch-action:none').replace('<pre id="output"','<pre hidden id="output"').replace('href="data:,"','href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23a9e7d8\' d=\'M12 0L15 9L24 12L15 15L12 24L9 15L0 12L9 9Z\'/%3E%3C/svg%3E"'));
await 修改('web/processing.mjs',內容=>內容.replace("if(this.events.has(e.name))await this.host.vm.invoke(this.events.get(e.name));",`if(this.events.has(e.name)){try{await this.host.vm.invoke(this.events.get(e.name));}catch(錯誤){if(this.host.signal.aborted)throw 錯誤;console.warn('星泉操作未完成：',錯誤);for(const 畫布 of this.canvases){if(畫布.drawing){畫布.target?.flush();畫布.drawing=false;}}const 處理=this.events.get(e.name).env.get('處理錯誤');await this.host.vm.invoke(處理);}}`).replaceAll('Aquarius text input','星泉文字輸入'));
await 修改('web/application-window.mjs',內容=>內容.replaceAll('Aquarius text input','星泉文字輸入'));
await 修改('web/application-services.mjs',內容=>內容.replaceAll('Aquarius application','星泉塗鴉室').replaceAll('Aquarius print preview','星泉列印預覽').replaceAll('Aquarius print document','星泉列印文件').replaceAll('Aquarius document','星泉作品').replaceAll('alt="Document"','alt="星泉作品"').replace('<!doctype html><title>','<!doctype html><html lang="zh-Hant"><title>'));
await 修改('web/app.mjs',內容=>內容.replace('error.textContent=e.message;error.hidden=false;',"error.textContent='塗鴉室無法啟動。請以本機伺服器或安全連線開啟，並使用支援圖形加速的新版瀏覽器。';error.hidden=false;console.error('星泉啟動錯誤：',e);").replace('host=current;window.aquarius.host=host;', 'host=current;window.aquarius.host=host;啟用保護(host);')+`
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
`);
console.log('已完成繁體中文網頁封裝、操作錯誤恢復、指標擷取及離屏資源回收。');
