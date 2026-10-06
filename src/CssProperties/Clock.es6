/** Shares one wall-clock timer between all visible time and date sources. */
export class Clock {
	constructor(windowObject = window) {
		this.window = windowObject;
		this.subscribers = new Set();
		this.timer = null;
	}

	now() { return new this.window.Date(); }

	subscribe(callback) {
		this.subscribers.add(callback);
		this.schedule();
		return () => {
			this.subscribers.delete(callback);
			if(!this.subscribers.size) this.cancel();
		};
	}

	schedule() {
		if(this.timer !== null || !this.subscribers.size) return;
		// Recalculate from the clock each tick rather than accumulating interval drift.
		let delay = 1000 - this.now().getMilliseconds();
		this.timer = this.window.setTimeout(this.tick, delay);
	}

	tick = () => {
		this.timer = null;
		for(let callback of this.subscribers) callback();
		this.schedule();
	}

	cancel() {
		if(this.timer !== null) this.window.clearTimeout(this.timer);
		this.timer = null;
	}

	dispose() {
		this.cancel();
		this.subscribers.clear();
	}
}
