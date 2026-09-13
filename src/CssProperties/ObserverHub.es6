/** Shares one browser observer among all subscribers, including visibility gates. */
export class ObserverHub {
	constructor(createObserver) {
		this.createObserver = createObserver;
		this.subscriptions = new Map();
		this.observer = null;
	}

	observe(element, callback) {
		if(!this.observer) this.observer = this.createObserver(this.dispatch);
		let subscription = this.subscriptions.get(element);
		if(!subscription) {
			subscription = {callbacks: new Set(), entry: null};
			this.subscriptions.set(element, subscription);
			this.observer.observe(element);
		}
		subscription.callbacks.add(callback);
		if(subscription.entry) callback(subscription.entry);
		return () => {
			subscription.callbacks.delete(callback);
			if(subscription.callbacks.size) return;
			this.observer.unobserve(element);
			this.subscriptions.delete(element);
		};
	}

	dispatch = entries => {
		for(let entry of entries) {
			let subscription = this.subscriptions.get(entry.target);
			if(!subscription) continue;
			subscription.entry = entry;
			for(let callback of [...subscription.callbacks]) callback(entry);
		}
	}

	dispose() {
		this.observer?.disconnect();
		this.subscriptions.clear();
		this.observer = null;
	}
}
