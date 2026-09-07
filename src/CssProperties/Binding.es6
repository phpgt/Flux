/** Connects one source to its local element and optional remote CSS destinations. */
export class Binding {
	constructor(runtime, element, name, definition, state = {}) {
		this.runtime = runtime;
		this.element = element;
		this.name = name;
		this.definition = definition;
		this.state = state;
		this.values = new Map();
		this.destinations = new Map();
		this.source = new definition.source(this);
		this.disposed = false;
		this.visible = false;
		this.resizeEntry = null;
		this.offVisibility = runtime.observeVisibility(element, visible => {
			this.visible = visible;
			this.requestRefresh();
		});
		this.offResize = definition.resize ? runtime.observeResize(element, entry => {
			this.resizeEntry = entry;
			this.requestRefresh();
		}) : null;
		this.requestRefresh();
	}

	get active() {
		if(this.runtime.document.hidden) return false;
		if(this.visible) return true;
		for(let target of this.destinations.values()) if(target.visible) return true;
		return false;
	}

	requestRefresh = () => {
		if(!this.disposed) this.runtime.scheduler.measure(this.refresh);
	}

	refresh = () => {
		if(this.disposed || !this.element.isConnected) return;
		if(this.definition.always || this.active) this.source.refresh();
		else this.source.stop?.();
	}

	set(suffix, value) {
		if(typeof value === "number") {
			if(!Number.isFinite(value)) value = 0;
			value = Math.round(value * 10000) / 10000;
		}
		let name = this.definition.properties?.[suffix]
			?? `--${this.name}${suffix ? "-" + suffix : ""}`;
		this.values.set(name, value);
		this.runtime.writer.set(this, this.element, name, value);
		for(let destination of this.destinations.keys()) this.runtime.writer.set(this, destination, name, value);
	}

	connect(elements) {
		for(let [element, target] of this.destinations) {
			if(elements.has(element)) continue;
			target.dispose();
			this.destinations.delete(element);
			this.runtime.writer.release(this, element);
		}
		for(let element of elements) {
			if(element === this.element || this.destinations.has(element)) continue;
			let target = {visible: false, dispose: () => {}};
			this.destinations.set(element, target);
			target.dispose = this.runtime.observeVisibility(element, visible => {
				target.visible = visible;
				this.requestRefresh();
			});
			for(let [name, value] of this.values) this.runtime.writer.set(this, element, name, value);
		}
	}

	clear() {
		this.values.clear();
		this.runtime.writer.release(this);
	}

	dispose() {
		this.disposed = true;
		this.runtime.scheduler.forget(this.refresh);
		this.source.dispose();
		this.offVisibility();
		this.offResize?.();
		for(let target of this.destinations.values()) target.dispose();
		this.destinations.clear();
		this.clear();
	}
}
