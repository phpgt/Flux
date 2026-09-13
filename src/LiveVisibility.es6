/** Watches live targets without a scroll listener or a recurring visibility check. */
export class LiveVisibility {
	constructor(onChange, documentObject = globalThis.document) {
		this.document = documentObject;
		this.onChange = onChange;
		this.elements = new Set();
		this.visible = new WeakSet();
		this.started = false;
		let windowObject = documentObject.defaultView;
		this.observer = windowObject.IntersectionObserver
			? new windowObject.IntersectionObserver(entries => {
				for(let entry of entries) {
					if(entry.isIntersecting && entry.intersectionRatio > 0) this.visible.add(entry.target);
					else this.visible.delete(entry.target);
				}
				this.onChange();
			}) : null;
		this.mutations = new windowObject.MutationObserver(onChange);
	}

	observe(element) {
		if(this.elements.has(element)) return;
		if(!this.started) {
			this.started = true;
			this.document.addEventListener("visibilitychange", this.onChange);
			this.mutations.observe(this.document.documentElement, {childList: true, subtree: true});
		}
		this.elements.add(element);
		this.observer?.observe(element);
	}

	isActive(element) {
		return !this.document.hidden && this.document.contains(element)
			&& (!this.observer || this.visible.has(element));
	}

	prune() {
		for(let element of this.elements) {
			if(this.document.contains(element)) continue;
			this.observer?.unobserve(element);
			this.elements.delete(element);
			this.visible.delete(element);
		}
	}

	dispose() {
		this.observer?.disconnect();
		this.mutations.disconnect();
		this.document.removeEventListener("visibilitychange", this.onChange);
		this.elements.clear();
	}
}
