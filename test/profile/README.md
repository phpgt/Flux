# Browser profiling

Use Node 22 or newer, PHP and Chromium. This harness uses Chromium's DevTools protocol directly, without an automation framework changing tab visibility. It adds no browser code to the examples themselves.

Build the assets and start a local server from the repository root:

```sh
npm run build
npm run build --prefix examples
php -S 127.0.0.1:8082 -t .
```

In another terminal:

```sh
node test/profile/run.cjs http://127.0.0.1:8082/ > /tmp/flux-profile.jsonl
```

Set `CHROME_BIN` if Chromium has a different executable name. The script creates its own temporary browser profile and removes it on completion. Requests and form state use that browser's separate session.

Each steady-state sample lasts 6.2 seconds, covering at least one five-second live polling interval. Other example pages receive three-second idle samples. The script also follows 1,000 city links in batches of 100, using real PHP responses and Flux updates. Configure longer runs with `PROFILE_SAMPLE_MS`, `PROFILE_BATCHES` and `PROFILE_BATCH_SIZE`.

The JSON lines contain callback/request counts, renderer main-thread JavaScript and task durations, and memory measurements after explicit garbage collection. Memory records include DOM counts before and after clearing inspector console entries. Logged DOM objects can otherwise appear to be application leaks. Browser navigation caches and normal engine warm-up can also retain memory.

These are renderer measurements, not whole-process CPU or GPU measurements. Native video decoding can continue after Flux stops palette sampling. A background sample fails if the page's real `document.hidden` value is false; the script does not substitute a simulated visibility event.

## Findings from 11 September 2026

The initial audit found that off-screen clocks already became idle, but live polling continued off-screen and in hidden tabs. Two application retention paths also accumulated parsed response documents and dialog listeners. In an isolated 200-replacement reproduction, DOM nodes grew from 265 to 50,665 and the update registry grew from one entry to 201. After fixing those paths, the same reproduction remained at 294 nodes, one target and one dialog listener from 50 through 200 replacements.

Further checks found that the default browser bundle enabled debug logging through a re-export's static initialiser. Logging is now opt-in through `FluxConfig.debug`. CSS cleanup no longer waits for a hidden tab to paint, off-screen video events no longer schedule palette frames, and the gauge's redline animation stops off-screen.

The final run used Chromium 151.0.7922.108 on Linux. Each sample below lasted 6.2 seconds; the [raw results](results-2026-09-11.jsonl) include the browser version and all page measurements.

| State | Timer callbacks | Animation frames | Palette video callbacks | Fetches |
| --- | ---: | ---: | ---: | ---: |
| Clock visible | 6 | 6 | 0 | 0 |
| Clock off-screen | 0 | 0 | 0 | 0 |
| Gauge off-screen | 0 | 0 | 0 | 0 |
| Live regions off-screen, local clock visible | 6 | 6 | 0 | 0 |
| Live regions in a background tab | 0 | 0 | 0 | 0 |
| Video off-screen | 0 | 0 | 0 | 0 |
| Video in a background tab | 0 | 0 | 0 | 0 |

Both background samples recorded zero JavaScript execution time. Off-screen media still delivered native playback events, costing 0.54 ms of JavaScript over 6.2 seconds, without scheduling palette frames. Native playback was not paused. The forms, navigation, search, geometry, controls and reference pages each recorded no timer callbacks, frames or fetches during their idle samples.

After 100 dialog replacements, retained DOM nodes and event listeners were 317 and 27 respectively. They remained at those counts through 1,000 replacements, both before and after clearing inspector entries with default logging now disabled. JavaScript heap usage settled around 1.49 MB after warm-up. These counts cover the measured renderer, including browser-retained documents from earlier navigation, rather than just the dialog.

Validation: 196 unit/integration tests and 52 Behat scenarios (432 steps) passed. The tests include a simulated three-day hidden interval; the browser profile was not a three-day wall-clock run.

Run the script against your own build for current measurements. A short run cannot prove that arbitrary pages are leak-free over days; increase the duration and exercise the application's own update paths for a soak test.
