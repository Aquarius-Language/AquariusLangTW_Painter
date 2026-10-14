import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const folder = path.resolve('測試/結果');
const read = name => fs.readFileSync(path.join(folder, name), 'utf8').split(/\r?\n/).filter(line => line.includes('PAINTER_PROFILE {')).map(line => JSON.parse(line.slice(line.indexOf('PAINTER_PROFILE ') + 16)));
const baseline = read('Android改善前.log'), candidate = read('Android改善後.log');
if (!candidate.some(row => row.name === 'complete' && row.passed)) throw new Error('Candidate emulator validation did not complete');
const median = numbers => { const sorted = [...numbers].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const metrics = [
  ['60-point drag', 'drag 60 points'],
  ['960 × 600 fill', 'fill 960x600 '],
  ['1920 × 1200 fill', 'fill 1920x1200 '],
  ['portrait redraw', 'portrait redraw 960x600 '],
].map(([name, prefix]) => {
  const before = baseline.filter(row => row.name.startsWith(prefix) && typeof row.ms === 'number'), after = candidate.filter(row => row.name.startsWith(prefix) && typeof row.ms === 'number');
  if (!before.length || !after.length) throw new Error('Missing metric ' + name);
  const beforeMs = median(before.map(row => row.ms)), afterMs = median(after.map(row => row.ms));
  return {name, beforeMs, afterMs, speedup: beforeMs / afterMs, beforeSamples: before.length, afterSamples: after.length};
});
const files = ['星泉塗鴉室.aqua', '作品引擎.aqua', 'web/wasm-host.mjs', 'web/processing.mjs', 'dist/星泉塗鴉室.wasm', 'dist/android.apk'];
const result = {date: '2026-10-14', environment: {device: 'emulator-5556', avd: 'Aquarius35', api: 35, abi: 'x86_64', gpu: 'host', resolution: '1080x2400', physicalPhoneUsed: false},
  method: 'Production APK on an Android emulator, isolated test harness invoking real compiled callbacks and native GPU presentation/readback. Times include script, transport, GPU and snapshot work. Synthetic burst drag measures processing throughput, not hardware input-to-display latency. Before/after runs can vary with emulator load. The baseline large fill has one completed sample; its second sample was stopped after the first succeeded.',
  metrics, pixelValidation: candidate.filter(row => row.passed), baseline, candidate,
  sha256: Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))};
fs.writeFileSync(path.join(folder, 'Android效能.json'), JSON.stringify(result, null, 2) + '\n');
const table = metrics.map(row => `| ${row.name} | ${(row.beforeMs / 1000).toFixed(3)} s | ${(row.afterMs / 1000).toFixed(3)} s | ${row.speedup.toFixed(1)}× |`).join('\n');
fs.writeFileSync(path.join(folder, 'Android效能.md'), `# Android drawing and fill performance\n\nBoth AquariusLang and the Painter script needed improvements. AquariusLang now supplies the portable Wasm fill primitive, collection scheduling, numeric-array transport, GPU batching, binary readback and direct pixel conversion. Painter adopts the primitive and caches its portrait controls and composite image.\n\nMeasured on API 35 emulator-5556 (Aquarius35, x86_64, host GPU). No physical phone was used.\n\n| Operation | Before | After | Speedup |\n| --- | ---: | ---: | ---: |\n${table}\n\nThe drag test preserves and verifies all 60 callbacks and their painted endpoints. Fill tests verify both canvas corners, including exact color and alpha. These are emulator callback/presentation timings, not phone FPS or hardware input-to-display latency. The 1920 × 1200 baseline has one completed sample.\n\nValidation: 1,399 language tests passed (30 environment-dependent tests skipped), 268 shared-host/Android tests passed, Java bridge tests passed, and the Painter browser suite passed all 25 groups. The saved JSON contains raw samples, phase timings and deliverable SHA-256 hashes.\n\nThe deliverable is ../../dist/android.apk. It contains no profiling harness. The updated compiler is C:/OfficialProjects/AquariusLangTW/dist/releases/AquariusCompiler-win-x64-20261014-painter-performance/aqua/aqua.exe. Build with 建置.ps1 -Compiler PATH_TO_NEW_AQUA_EXE when the older compiler remains on PATH.\n`);
console.table(metrics);
