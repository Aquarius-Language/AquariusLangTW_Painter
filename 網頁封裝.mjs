import { readFile as 讀取, writeFile as 寫入 } from 'node:fs/promises';
const 修改=async(檔名,處理)=>寫入(檔名,處理(await 讀取(檔名,'utf8')));
await 修改('web/index.html',內容=>內容.replace('lang="en"','lang="zh-Hant"').replace('Aquarius WebAssembly','星泉塗鴉室').replace('background:#0c1624','background:#081012').replace('outline:none','outline:none;touch-action:none').replace('<pre id="output"','<pre hidden id="output"').replace('href="data:,"','href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23a9e7d8\' d=\'M12 0L15 9L24 12L15 15L12 24L9 15L0 12L9 9Z\'/%3E%3C/svg%3E"'));
await 修改('web/processing.mjs',內容=>內容.replaceAll('Aquarius text input','星泉文字輸入'));
await 修改('web/application-window.mjs',內容=>內容.replaceAll('Aquarius text input','星泉文字輸入'));
await 修改('web/application-services.mjs',內容=>內容.replaceAll('Aquarius application','星泉塗鴉室')
 .replace(/^  checkPixels,\r?\n/m,'')
 .replace(/^      printing: capability\([\s\S]*?^      \),\r?\n/m,'')
 .replace(/^  async printImage\([\s\S]*?(?=^  updateAccessibility\()/m,''));
await 修改('web/application.mjs',內容=>內容.replace(/^    b\(app, "Application", "Print",[\s\S]*?^    \);\r?\n/m,''));
await 修改('web/program.json',內容=>{const 程式=JSON.parse(內容);程式.catalog=程式.catalog.filter(項=>!(項.library==='Application'&&項.english==='Print'));return JSON.stringify(程式);});
await 修改('web/app.mjs',內容=>內容.replace('error.textContent=e.message;error.hidden=false;',"error.textContent='塗鴉室無法啟動。請以本機伺服器或安全連線開啟，並使用支援圖形加速的新版瀏覽器。';error.hidden=false;console.error('星泉啟動錯誤：',e);"));
console.log('已完成繁體中文外殼；事件恢復與資源管理由 AquariusLang 主機提供。');
