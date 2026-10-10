import {readFile,writeFile} from 'node:fs/promises';

// Keep project-specific browser runtime tuning reproducible after aqua build.
const patch=async(file,before,after)=>{
  const source=await readFile(file,'utf8');
  if(source.includes(after))return;
  if(!source.includes(before))throw new Error(`Realtime host patch needs review: ${file}`);
  await writeFile(file,source.replace(before,after));
};
await patch('web/wasm-host.mjs',
  'const state={pointer,session:this,pending:null};',
  'const state={pointer,session:this,pending:null};let sliceStart=performance.now();');
await patch('web/wasm-host.mjs',
  "if(status===1){this.collect();if(typeof window!=='undefined')await new Promise(r=>setTimeout(r,0));continue;}",
  `if(status===1){
        // A quantum is an instruction limit, not a reason to sleep. Small UI
        // callbacks finish in one task; expensive operations yield every 8 ms.
        if(performance.now()-sliceStart>=8){this.collect();if(typeof window!=='undefined')await this.yieldTask();sliceStart=performance.now();}
        continue;
      }`);
await patch('web/wasm-host.mjs',
  '  async run(pointer){',
  `  yieldTask(){
    // MessageChannel avoids the nested setTimeout minimum delay (usually 4 ms).
    if(!this.taskChannel){this.taskChannel=new MessageChannel();this.taskWaiters=[];this.taskChannel.port1.onmessage=()=>this.taskWaiters.shift()?.();}
    return new Promise(resolve=>{this.taskWaiters.push(resolve);this.taskChannel.port2.postMessage(null);});
  }
  async run(pointer){`);
await patch('web/host.mjs',
  'async dispose(){this.runtime.cancelled=true;',
  'async dispose(){this.runtime.cancelled=true;const session=this.runtime.program?.session;for(const resolve of session?.taskWaiters??[])resolve();session?.taskChannel?.port1.close();session?.taskChannel?.port2.close();');
await patch('web/host.mjs',
  "async nextFrame(fps=60){const start=performance.now();await new Promise(r=>requestAnimationFrame(r));const remaining=1000/fps-(performance.now()-start);if(remaining>1)await new Promise(r=>setTimeout(r,remaining));}",
  `async nextFrame(fps=60){
    // Limit start-to-start cadence, including work already done by the frame.
    let now=await new Promise(r=>requestAnimationFrame(r));
    while(this.lastFrameTime!==undefined&&now-this.lastFrameTime+0.5<1000/fps)now=await new Promise(r=>requestAnimationFrame(r));
    this.lastFrameTime=now;
  }`);
await patch('web/processing.mjs',
  'this.is3D=is3D;this.style=style();',
  'this.is3D=is3D;this.premultiplied=true;this.style=style();');
await patch('web/processing.mjs',
  "for(const e of this.eventQueue.splice(0)){for(const [n,v] of Object.entries(e.fields))this.host.set(this.module,n,v);this.redraw=true;await this.dispatchEvent(e.name);}",
  `const eventStart=performance.now(),available=this.eventQueue.length;
      // Preserve every stroke sample and press/release boundary, but present
      // between batches instead of draining a slow gesture before drawing it.
      for(let i=0;i<available;i++){const e=this.eventQueue.shift();for(const [n,v] of Object.entries(e.fields))this.host.set(this.module,n,v);this.redraw=true;await this.dispatchEvent(e.name);if(performance.now()-eventStart>=8)break;}`);
await patch('web/wgpu.mjs',
  'this.owner.gpu.queue.submit([encoder.finish()]);await this.owner.poll();',
  `this.owner.gpu.queue.submit([encoder.finish()]);
    // Submission is sufficient for presentation. Allow up to two frames in
    // flight so input need not wait for a GPU fence after every frame.
    this.presentations??=new Set();
    const done=this.owner.gpu.queue.onSubmittedWorkDone();this.presentations.add(done);
    done.then(()=>this.presentations.delete(done),()=>this.presentations.delete(done));
    if(this.presentations.size>=2)await this.presentations.values().next().value;`);
