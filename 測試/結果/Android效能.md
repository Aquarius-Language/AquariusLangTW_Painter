# Android drawing and fill performance

Both AquariusLang and the Painter script needed improvements. AquariusLang now supplies the portable Wasm fill primitive, collection scheduling, numeric-array transport, GPU batching, binary readback and direct pixel conversion. Painter adopts the primitive and caches its portrait controls and composite image.

Measured on API 35 emulator-5556 (Aquarius35, x86_64, host GPU). No physical phone was used.

| Operation | Before | After | Speedup |
| --- | ---: | ---: | ---: |
| 60-point drag | 2.700 s | 1.717 s | 1.6× |
| 960 × 600 fill | 30.367 s | 0.898 s | 33.8× |
| 1920 × 1200 fill | 195.551 s | 3.232 s | 60.5× |
| portrait redraw | 0.072 s | 0.083 s | 0.9× |

The drag test preserves and verifies all 60 callbacks and their painted endpoints. Fill tests verify both canvas corners, including exact color and alpha. These are emulator callback/presentation timings, not phone FPS or hardware input-to-display latency. The 1920 × 1200 baseline has one completed sample.

Validation: 1,399 language tests passed (30 environment-dependent tests skipped), 268 shared-host/Android tests passed, Java bridge tests passed, and the Painter browser suite passed all 25 groups. The saved JSON contains raw samples, phase timings and deliverable SHA-256 hashes.

The deliverable is ../../dist/android.apk. It contains no profiling harness. The updated compiler is C:/OfficialProjects/AquariusLangTW/dist/releases/AquariusCompiler-win-x64-20261014-painter-performance/aqua/aqua.exe. Build with 建置.ps1 -Compiler PATH_TO_NEW_AQUA_EXE when the older compiler remains on PATH.
