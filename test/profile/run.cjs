const {Browser, delay} = require('./browser.cjs');

const base = process.argv[2] || 'http://127.0.0.1:8082/';
const sampleMs = Number(process.env.PROFILE_SAMPLE_MS || 6200);
const batches = Number(process.env.PROFILE_BATCHES || 10);
const batchSize = Number(process.env.PROFILE_BATCH_SIZE || 100);
const output = result => console.log(JSON.stringify(result));

async function run(browser) {
	const page = await browser.page();
	await page.send('Page.enable');
	await page.send('Performance.enable');
	await page.send('Emulation.setDeviceMetricsOverride', {width: 1280, height: 800, deviceScaleFactor: 1, mobile: false});
	await page.send('Page.addScriptToEvaluateOnNewDocument', {source: `
		window.profileActivity = {timers: 0, frames: 0, videoFrames: 0, fetches: 0};
		const timeout = window.setTimeout, frame = window.requestAnimationFrame, fetcher = window.fetch;
		window.setTimeout = (callback, delay, ...args) => typeof callback === 'function'
			? timeout(() => { profileActivity.timers++; callback(...args); }, delay) : timeout(callback, delay, ...args);
		window.requestAnimationFrame = callback => frame(time => { profileActivity.frames++; callback(time); });
		window.fetch = (...args) => { profileActivity.fetches++; return fetcher(...args); };
		const videoFrame = HTMLVideoElement.prototype.requestVideoFrameCallback;
		if(videoFrame) HTMLVideoElement.prototype.requestVideoFrameCallback = function(callback) {
			return videoFrame.call(this, (...args) => { profileActivity.videoFrames++; callback(...args); });
		};
	`});
	async function navigate(query = '') {
		await page.activate();
		await page.send('Page.navigate', {url: new URL(query, base).href});
		for(let attempt = 0; attempt < 100; attempt++) {
			await delay(50);
			if(await page.evaluate(`document.readyState === 'complete' && !!document.querySelector('main')`)) return;
		}
		throw new Error('Page did not load. Start the PHP server before profiling.');
	}
	const metrics = async () => Object.fromEntries((await page.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value]));
	async function sample(label, duration = sampleMs) {
		await delay(700);
		const before = await metrics(), activity = await page.evaluate('({...profileActivity})');
		await delay(duration);
		const after = await metrics(), current = await page.evaluate('({...profileActivity})');
		output({label, seconds: duration / 1000, hidden: await page.evaluate('document.hidden'),
			...Object.fromEntries(Object.keys(activity).map(key => [key, current[key] - activity[key]])),
			scriptMs: +((after.ScriptDuration - before.ScriptDuration) * 1000).toFixed(2),
			taskMs: +((after.TaskDuration - before.TaskDuration) * 1000).toFixed(2),
		});
	}
	const scroll = selector => page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block: 'center', behavior: 'instant'})`);
	const background = await browser.page();
	async function hide() {
		await background.activate(); await delay(100);
		if(!await page.evaluate('document.hidden')) throw new Error('Chromium did not hide the tab; this run cannot validate background behaviour.');
	}
	output({browser: await browser.send('Browser.getVersion'), base, sampleMs, batches, batchSize});
	await navigate(); await scroll('#clock-demo'); await sample('Clock visible');
	await scroll('#search-demo'); await sample('Clock off-screen');
	await scroll('#gauge-demo');
	await page.evaluate(`document.querySelector('#engine-load').value = 100; document.querySelector('#engine-load').dispatchEvent(new Event('input', {bubbles: true}))`);
	await sample('Gauge redlining'); await scroll('#search-demo'); await sample('Gauge off-screen');
	output({label: 'Off-screen gauge animation', animation: await page.evaluate(`getComputedStyle(document.querySelector('.radial-gauge')).animationName`)});
	await navigate('?page=time'); await scroll('#polling-demo'); await sample('Live regions visible');
	await scroll('#clock-demo'); await sample('Live regions off-screen');
	await scroll('#polling-demo'); await hide(); await sample('Live regions in background tab');
	await page.activate(); await sample('Live regions resumed');
	await navigate('?page=media'); await scroll('video');
	await page.evaluate(`document.querySelector('video').muted = true; document.querySelector('video').play()`);
	await sample('Video playing'); await page.evaluate('scrollTo(0, 0)'); await sample('Video off-screen');
	await scroll('video'); await hide(); await sample('Video in background tab');
	for(const name of ['forms', 'navigation', 'search', 'geometry', 'controls', 'reference']) {
		await navigate(`?page=${name}`); await sample(`${name} page idle`, 3000);
	}
	await navigate('?page=search&q=London');
	async function memory(updates) {
		await delay(100); await page.send('HeapProfiler.collectGarbage');
		const withInspectorEntries = await page.send('Memory.getDOMCounters');
		// Inspector diagnostics can retain nodes independently of the application.
		await page.send('Runtime.discardConsoleEntries');
		await page.send('HeapProfiler.collectGarbage');
		output({label: 'Dialog replacements', updates, withInspectorEntries,
			...await page.send('Memory.getDOMCounters'), heap: await page.send('Runtime.getHeapUsage')});
	}
	await memory(0);
	for(let batch = 1; batch <= batches; batch++) {
		await page.evaluate(`(async () => {
			for(let i = 0; i < ${batchSize}; i++) {
				document.querySelector('dialog')?.close();
				await new Promise((resolve, reject) => {
					const finish = () => { clearTimeout(timer); resolve(); };
					const timer = setTimeout(() => { document.removeEventListener('flux:after-render', finish); reject(new Error('Dialog request timed out')); }, 5000);
					document.addEventListener('flux:after-render', finish, {once: true});
					document.querySelector('#search-results a[data-flux="link"]').click();
				});
			}
		})()`);
		await memory(batch * batchSize);
	}
}
(async () => {
	const browser = await Browser.launch();
	try { await run(browser); }
	finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
