import { readFile as 讀取 } from 'node:fs/promises';
import 斷言 from 'node:assert/strict';
const 檔案=['星泉塗鴉室.aqua','函式庫/作品引擎.aqua','函式庫/星泉介面.aqua'];
let 宣告數=0,呼叫數=0;
for(const 檔 of 檔案){
 const 內容=(await 讀取(檔,'utf8')).replace(/"(?:\\.|[^"\\])*"/g,'""').replace(/#[^\n]*/g,'');
 for(const 命中 of 內容.matchAll(/變數\s+([\p{L}\p{N}_]+)/gu)){斷言.match(命中[1],/^[\p{Script=Han}\d_]+$/u,檔+' 的變數含非中文識別字');宣告數++;}
 for(const 命中 of 內容.matchAll(/([\p{L}_][\p{L}\p{N}_]*)\s*\(/gu)){斷言.match(命中[1],/^[\p{Script=Han}\d_]+$/u,檔+' 的函式呼叫含非中文名稱');呼叫數++;}
}
console.log('繁體中文識別字檢查通過：'+宣告數+' 個變數宣告、'+呼叫數+' 個呼叫或語法節點。');
