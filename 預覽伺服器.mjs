import { createServer as 建立伺服器 } from 'node:http';
import { readFile as 讀取 } from 'node:fs/promises';
import 路徑 from 'node:path';
import { fileURLToPath as 檔案路徑 } from 'node:url';
const 根=路徑.join(路徑.dirname(檔案路徑(import.meta.url)),'web');
const 埠=Number(process.argv[2]??8080);
const 型別={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8'};
const 伺服器=建立伺服器(async(請求,回應)=>{
 try{
  const 名=decodeURIComponent(new URL(請求.url,'http://localhost').pathname);
  const 檔=路徑.resolve(根,'.'+(名==='/'?'/index.html':名));
  if(!檔.startsWith(根+路徑.sep))throw Error('不允許此路徑');
  回應.setHeader('Content-Type',型別[路徑.extname(檔)]??'application/octet-stream');
  回應.setHeader('Cache-Control','no-store');回應.end(await 讀取(檔));
 }catch{回應.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});回應.end('找不到檔案。');}
});
伺服器.on('error',錯=>{console.error('無法啟動預覽：'+錯.message);process.exitCode=1;});
伺服器.listen(埠,'127.0.0.1',()=>console.log('星泉塗鴉室：http://localhost:'+埠+'　按控制鍵＋中斷鍵停止。'));
