import fs from 'node:fs';
import path from 'node:path';

// Instruments an isolated generated Android project. Never include this harness
// in the delivered APK. Run with a project directory and a descriptive variant.
const project = path.resolve(process.argv[2]);
const variant = process.argv[3] ?? 'baseline';
const assets = path.join(project, 'app/src/main/assets/aquarius');
// Keep the host's import indices in sync when replacing program.wasm in a
// previously generated profiling project after source functions change.
const wasm = new WebAssembly.Module(fs.readFileSync(path.join(assets, 'program.wasm')));
const metadata = JSON.parse(new TextDecoder().decode(WebAssembly.Module.customSections(wasm, 'aquarius.application')[0]));
const bundleFile = path.join(assets, 'program.json'), bundle = JSON.parse(fs.readFileSync(bundleFile, 'utf8'));
bundle.modules = metadata.modules;
fs.writeFileSync(bundleFile, JSON.stringify(bundle));
const file = path.join(assets, 'android-host.mjs');
let source = fs.readFileSync(file, 'utf8');
if (source.includes('profileEmulator')) throw new Error('Project already instrumented');
source = source.replace("globalThis.aquarius=host;try{", "globalThis.aquarius=host;installProfile(host);try{");
if (!source.includes('installProfile(host);')) throw new Error('Android run hook changed');
source += '\n' + installProfile.toString() + '\n' + profileEmulator.toString();
source += `\nglobalThis.profileVariant=${JSON.stringify(variant)};\n`;
fs.writeFileSync(file, source);
console.log(`Instrumented ${project}: ${variant}`);

function installProfile(host) {
  const next = host.nextFrame.bind(host);
  let done = false;
  host.nextFrame = async (...args) => {
    if (!done && host.processing.frameCount > 0) {
      done = true;
      try { await profileEmulator(host); }
      catch (error) { native.log('PAINTER_PROFILE_ERROR ' + String(error.stack ?? error)); }
    }
    return next(...args);
  };
}

async function profileEmulator(h) {
  const p = h.processing, env = p.events.get('mousePressed').env;
  const engine = env.get('引擎').scope, session = (await h.runtime.ready()).session;
  native.keyboard(false);
  const invoke = (scope, name, args = []) => h.runtime.invoke(scope.get(name), args.map(v => typeof v === 'number' ? num(v, Number.isInteger(v) && v >= -2147483648 && v <= 2147483647 ? 'int' : 'double') : v));
  const stats = {collections: 0, collectionMs: 0, gpuReadMs: 0, arrayWriteMs: 0, arrayReadMs: 0, snapshotMs: 0, loadPixelsMs: 0, updatePixelsMs: 0};
  const readGpu = native.gpuRead;
  native.gpuRead = (...args) => { const start = performance.now(); const result = readGpu(...args); stats.gpuReadMs += performance.now() - start; return result; };
  for (const [method, key] of [['writeArray', 'arrayWriteMs'], ['readArray', 'arrayReadMs']]) {
    if (typeof session[method] !== 'function') continue;
    const original = session[method].bind(session);
    session[method] = (...args) => { const start = performance.now(); const result = original(...args); stats[key] += performance.now() - start; return result; };
  }
  const bind = h.bind.bind(h);
  h.bind = (module, library, name, fn, raw = false) => {
    const key = library === 'PImage' && name === 'loadPixels' ? 'loadPixelsMs' : library === 'PImage' && name === 'updatePixels' ? 'updatePixelsMs' : library === 'Processing.Canvas' && name === 'get' ? 'snapshotMs' : null;
    if (!key) return bind(module, library, name, fn, raw);
    return bind(module, library, name, (...args) => {
      const start = performance.now(), result = fn(...args);
      if (result?.then) return result.then(value => { stats[key] += performance.now() - start; return value; });
      stats[key] += performance.now() - start; return result;
    }, raw);
  };
  const collect = session.collect.bind(session);
  session.collect = (...args) => { const start = performance.now(); const result = collect(...args); stats.collections++; stats.collectionMs += performance.now() - start; return result; };
  const report = (name, values) => native.log('PAINTER_PROFILE ' + JSON.stringify({variant: globalThis.profileVariant, name, ...values}));
  const measure = async (name, action) => {
    for (const key of Object.keys(stats)) stats[key] = 0;
    const start = performance.now(); await action();
    report(name, {ms: performance.now() - start, ...stats});
  };
  const frame = async () => { await p.beginFrame(); await invoke(env, '繪製'); await p.endFrame(); };
  await frame();
  for (let i = 0; i < 5; i++) await measure('portrait redraw 960x600 ' + i, frame);
  await invoke(env, '選擇工具', ['筆刷']);
  const point = (name, x, y, pressed) => p.eventQueue.push({name, fields: {mouseX: x, mouseY: y, mouseButton: num(0, 'int'), isMousePressed: pressed}});
  const left = unwrap(env.get('畫布左')), top = unwrap(env.get('畫布上')), scale = unwrap(env.get('畫布比例'));
  const points = [], dispatch = p.dispatchEvent.bind(p);
  p.dispatchEvent = async name => { await dispatch(name); if (name === 'mouseDragged') points.push([unwrap(env.get('前橫')), unwrap(env.get('前縱'))]); };
  const start = performance.now(); let frames = 0;
  point('mousePressed', left + 40 * scale, top + 40 * scale, true);
  for (let i = 1; i <= 60; i++) point('mouseDragged', left + (40 + i * 13) * scale, top + (40 + i * 8) * scale, true);
  point('mouseReleased', left + 820 * scale, top + 520 * scale, false);
  while (p.eventQueue.length) { await frame(); frames++; if (frames === 1) report('drag first presentation', {ms: performance.now() - start, pendingEvents: p.eventQueue.length}); }
  report('drag 60 points', {ms: performance.now() - start, frames});
  const stroke = await h.objects.get(engine.get('圖層')[0][0]).target.readPixels();
  if (points.length !== 60) throw new Error('Dropped drag events: ' + points.length);
  for (const [x, y] of points) {
    let painted = false;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const offset = ((Math.round(y) + dy) * 960 + Math.round(x) + dx) * 4;
      if (stroke[offset] < 200 || stroke[offset + 1] < 200 || stroke[offset + 2] < 200) painted = true;
    }
    if (!painted) throw new Error('Missing painted drag endpoint ' + JSON.stringify([x, y]));
  }
  report('drag pixels', {passed: true, points: 60});
  for (const [width, height] of [[960, 600], [1920, 1200]]) {
    await invoke(engine, '新作品', [width, height]);
    await invoke(env, '配合畫面');
    env.set('重整合成', true);
    await frame();
    for (let i = 0; i < 2; i++) {
      const color = i === 0 ? 0xff123456 : 0xff345678;
      await invoke(engine, '設定參數', ['前景', color]);
      await measure(`fill ${width}x${height} ${i}`, () => invoke(engine, '填色區域', [2, 2]));
      const canvas = h.objects.get(engine.get('圖層')[0][0]);
      const bytes = await canvas.target.readPixels();
      const check = offset => bytes[offset] === (color >>> 16 & 255) && bytes[offset + 1] === (color >>> 8 & 255) && bytes[offset + 2] === (color & 255) && bytes[offset + 3] === 255;
      if (!check(0) || !check(bytes.length - 4)) throw new Error('Fill did not reach both canvas corners');
      report(`fill pixels ${width}x${height} ${i}`, {passed: true});
    }
  }
  await invoke(engine, '新作品', [960, 600]); await invoke(env, '配合畫面'); env.set('重整合成', true);
  await frame();
  report('complete', {passed: true});
}
