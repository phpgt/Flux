/** Owns individual declarations so disposal restores author styles and preserves other bindings. */
export class PropertyWriter {
	constructor(scheduler, logger = console) {
		this.scheduler = scheduler;
		this.logger = logger;
		this.targets = new Map();
		this.pending = new Set();
		this.ownership = new Map();
	}

	set(owner, element, name, value) {
		let properties = this.targets.get(element);
		if(!properties) this.targets.set(element, properties = new Map());
		let property = properties.get(name);
		if(!property) {
			property = {
				element, name, owners: new Map(),
				original: element.style.getPropertyValue(name),
				priority: element.style.getPropertyPriority(name),
				written: null,
			};
			properties.set(name, property);
		}
		let actual = element.style.getPropertyValue(name);
		if(property.written !== null && property.written !== actual) {
			property.original = actual;
			property.priority = element.style.getPropertyPriority(name);
			property.written = null;
		}
		if(!property.owners.has(owner) && property.owners.size) {
			this.logger.warn(`Conflicting Flux CSS sources for ${name}; the first binding takes precedence.`, element);
		}
		let next = value === null ? "" : String(value);
		if(property.owners.get(owner) === next && property.written === element.style.getPropertyValue(name)) return;
		property.owners.set(owner, next);
		let owned = this.ownership.get(owner);
		if(!owned) this.ownership.set(owner, owned = new Set());
		owned.add(property);
		this.pending.add(property);
		this.scheduler.write(this.flush);
	}

	flush = () => {
		for(let property of this.pending) {
			let value = property.owners.size ? property.owners.values().next().value : property.original;
			let priority = property.owners.size ? "" : property.priority;
			if(property.element.style.getPropertyValue(property.name) !== value
				|| property.element.style.getPropertyPriority(property.name) !== priority) {
				property.element.style.setProperty(property.name, value, priority);
			}
			property.written = value;
			if(!property.owners.size) {
				let properties = this.targets.get(property.element);
				properties?.delete(property.name);
				if(!properties?.size) this.targets.delete(property.element);
			}
		}
		this.pending.clear();
	}

	release(owner, element = null) {
		let owned = this.ownership.get(owner);
		if(!owned) return;
		for(let property of owned) {
			if(element && property.element !== element) continue;
			property.owners.delete(owner);
			owned.delete(property);
			this.pending.add(property);
		}
		if(!owned.size) this.ownership.delete(owner);
		if(this.pending.size) this.scheduler.write(this.flush);
	}

	dispose() {
		for(let properties of this.targets.values()) {
			for(let property of properties.values()) {
				property.owners.clear();
				this.pending.add(property);
			}
		}
		this.flush();
		this.targets.clear();
		this.ownership.clear();
		this.scheduler.forget(this.flush);
	}
}
