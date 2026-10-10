import { chromium } from 'file:///C:/OfficialProjects/AquariusLangTW/AquariusWebCompiler/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const server=createServer(async(req,res)=>{
  try {
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.join(path.resolve(process.env.AQUARIUS_WEB_ROOT??'web'),name==='/'?'index.html':name);
    res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.json':'application/json','.wasm':'application/wasm'})[path.extname(file)]??'application/octet-stream');
    res.end(await readFile(file));
  } catch {res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:process.env.AQUARIUS_BROWSER??'msedge',headless:true,args:['--enable-unsafe-webgpu']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.aquarius?.host?.processing?.frameCount>0);
  await page.waitForFunction(()=>window.aquarius.host.runtime.executions.size===1);
  const result=await page.evaluate(async()=>{
    const host=window.aquarius.host,p=host.processing,session=host.runtime.program.session;
    const timings={draw:[],events:[],release:[],collection:[],presentation:[],slices:0,yields:0,wasmMs:0};
    const present=p.presentation.present.bind(p.presentation);
    p.presentation.present=async(...args)=>{const start=performance.now();await present(...args);timings.presentation.push(performance.now()-start);};
    const invoke=host.runtime.invoke.bind(host.runtime);
    host.runtime.invoke=async(fn,args)=>{const start=performance.now();const value=await invoke(fn,args);const name=fn===p.events.get('mouseReleased')?'release':fn===p.events.get('mouseDragged')?'events':fn===p.events.get('mouseMoved')?'events':null;if(name)timings[name].push(performance.now()-start);return value;};
    const collect=session.collect.bind(session);
    session.collect=()=>{const start=performance.now();const result=collect();timings.collection.push(performance.now()-start);return result;};
    const call=session.call.bind(session);
    session.call=(name,...args)=>{const start=performance.now();const result=call(name,...args);if(name==='aqua_run'){timings.wasmMs+=performance.now()-start;timings.slices++;if(result===1)timings.yields++;}return result;};
    const end=p.endFrame.bind(p);
    let completed=0,start=0,strokeStart=0,firstStrokeFrameMs=null;
    const begin=p.beginFrame.bind(p);
    p.beginFrame=async()=>{start=performance.now();return begin();};
    p.endFrame=async()=>{await end();timings.draw.push(performance.now()-start);if(strokeStart&&firstStrokeFrameMs===null)firstStrokeFrameMs=performance.now()-strokeStart;completed++;};
    const wait=async(test)=>{const deadline=performance.now()+60000;while(!test()){if(performance.now()>deadline)throw Error('Performance scenario timed out');await new Promise(r=>setTimeout(r,10));}};
    for(let i=0;i<8;i++){const n=completed;p.redraw=true;await wait(()=>completed>n);}
    const idle=timings.draw.splice(0);
    const canvas=p.dom;
    const event=(type,x,y,buttons)=>canvas.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'mouse',clientX:x,clientY:y,buttons,button:0,bubbles:true}));
    strokeStart=performance.now();
    event('pointerdown',450,450,1);
    for(let i=1;i<=60;i++)event('pointermove',450+i*3,450+Math.sin(i/6)*25,1);
    event('pointerup',630,450,0);
    await wait(()=>!p.processingEvents&&p.eventQueue.length===0&&host.runtime.executions.size===1&&firstStrokeFrameMs!==null);
    const strokeMs=performance.now()-strokeStart;
    const env=p.events.get('mousePressed').env,engine=env.get('引擎').scope;
    const layer=host.objects.get(engine.get('圖層')[0][0]);
    const bytes=await layer.target.readPixels();
    let ink=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i]<100)ink++;
    const summary=values=>({count:values.length,meanMs:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),maxMs:Math.max(0,...values)});
    return {idleFrames:summary(idle),interactionFrames:summary(timings.draw),pointerCallbacks:summary(timings.events),releaseCallbacks:summary(timings.release),collection:summary(timings.collection),presentation:summary(timings.presentation),wasmMs:timings.wasmMs,slices:timings.slices,yields:timings.yields,firstStrokeFrameMs,strokeMs,ink,history:engine.get('歷程位置').value};
  });
  assert.deepEqual(errors,[]);assert.ok(result.ink>100);assert.ok(result.history>0);assert.equal(result.pointerCallbacks.count,60);assert.equal(result.releaseCallbacks.count,1);
  console.log(JSON.stringify(result,null,2));
  if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2));
} finally {await browser.close();server.close();}
