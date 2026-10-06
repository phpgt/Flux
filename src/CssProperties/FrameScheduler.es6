/** Coalesces measurements before writes, and sleeps whenever both queues are empty. */
export class FrameScheduler {
	constructor(windowObject = window, logger = console) {
		this.window = windowObject;
		this.logger = logger;
		this.reads = new Set();
		this.writes = new Set();
		this.frame = null;
		this.flushing = false;
		this.onVisibility = () => {
			if(this.window.document.hidden) this.cancel();
			else this.schedule();
		};
		this.window.document.addEventListener("visibilitychange", this.onVisibility);
	}

	measure(callback) { this.reads.add(callback); this.schedule(); }
	write(callback) { this.writes.add(callback); this.schedule(); }
	forget(callback) { this.reads.delete(callback); this.writes.delete(callback); }

	schedule() {
		if(this.frame !== null || this.flushing || this.window.document.hidden) return;
		if(!this.reads.size && !this.writes.size) return;
		this.frame = this.window.requestAnimationFrame(this.flush);
	}

	flush = () => {
		this.frame = null;
		this.flushing = true;
		this.run(this.reads);
		this.run(this.writes);
		this.flushing = false;
		this.schedule();
	}

	run(queue) {
		let callbacks = [...queue];
		queue.clear();
		for(let callback of callbacks) {
			try { callback(); }
			catch(error) { this.logger.error("Error updating Flux CSS properties:", error); }
		}
	}

	cancel() {
		if(this.frame !== null) this.window.cancelAnimationFrame(this.frame);
		this.frame = null;
	}

	dispose() {
		this.cancel();
		this.reads.clear();
		this.writes.clear();
		this.window.document.removeEventListener("visibilitychange", this.onVisibility);
	}
}
