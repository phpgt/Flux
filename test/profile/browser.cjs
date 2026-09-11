const {spawn} = require('node:child_process');
const {once} = require('node:events');
const {mkdtemp, readFile, rm} = require('node:fs/promises');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {setTimeout: delay} = require('node:timers/promises');

/** A direct DevTools connection leaves Chromium's tab visibility behaviour intact. */
class Browser {
	static async launch() {
		const browser = new Browser();
		browser.pending = new Map();
		browser.nextId = 0;
		browser.directory = await mkdtemp(join(tmpdir(), 'flux-profile-'));
		browser.process = spawn(process.env.CHROME_BIN || 'chromium', [
			'--headless=new', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
			'--remote-debugging-port=0', `--user-data-dir=${browser.directory}`, 'about:blank',
		], {stdio: 'ignore'});
		let launchError;
		browser.process.on('error', error => { launchError = error; });
		try {
			let address;
			for(let attempt = 0; attempt < 100; attempt++) {
				if(launchError) throw launchError;
				try {
					const [port, path] = (await readFile(join(browser.directory, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
					address = `ws://127.0.0.1:${port}${path}`;
					break;
				}
				catch { await delay(50); }
			}
			if(!address) throw new Error('Chromium did not start. Set CHROME_BIN to its executable.');
			browser.socket = new WebSocket(address);
			await new Promise((resolve, reject) => {
				browser.socket.addEventListener('open', resolve, {once: true});
				browser.socket.addEventListener('error', reject, {once: true});
			});
			browser.socket.addEventListener('message', event => {
				const message = JSON.parse(event.data);
				const request = browser.pending.get(message.id);
				if(!request) return;
				browser.pending.delete(message.id);
				if(message.error) request.reject(new Error(message.error.message));
				else request.resolve(message.result);
			});
			return browser;
		}
		catch(error) { await browser.close(); throw error; }
	}

	send(method, params = {}, sessionId) {
		return new Promise((resolve, reject) => {
			const id = ++this.nextId;
			this.pending.set(id, {resolve, reject});
			this.socket.send(JSON.stringify({id, method, params, sessionId}));
		});
	}

	async page() {
		const {targetId} = await this.send('Target.createTarget', {url: 'about:blank'});
		const {sessionId} = await this.send('Target.attachToTarget', {targetId, flatten: true});
		return {
			targetId,
			send: (method, params) => this.send(method, params, sessionId),
			evaluate: async expression => {
				const result = await this.send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true}, sessionId);
				if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
				return result.result.value;
			},
			activate: () => this.send('Target.activateTarget', {targetId}),
		};
	}

	async close() {
		this.socket?.close();
		if(this.process?.pid && this.process.exitCode === null) {
			const exited = once(this.process, 'exit');
			this.process.kill();
			await exited;
		}
		await rm(this.directory, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
	}
}
module.exports = {Browser, delay};
