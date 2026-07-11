/**
 * Records event listeners added to event targets after Flux starts.
 * It wraps EventTarget listener methods so DomBridge can reattach those
 * listeners when an updated response replaces existing elements.
 */
export class ElementEventMapper {
	static addEventListenerOriginal = EventTarget.prototype.addEventListener;
	static removeEventListenerOriginal = EventTarget.prototype.removeEventListener;
	static activeMapper;
	static installed = false;

	map;

	constructor(logger = console, debug = false) {
// TODO: Is a WeakMap a better choice than Map? WeakMaps will automatically get garbage-collected when DOM nodes are removed, but do not have iteration functions.
		this.map = new WeakMap();
		this.logger = logger;
		this.debug = debug;

		ElementEventMapper.activeMapper = this;
		ElementEventMapper.install();
	}

	has(element) {
		return this.get(element).length > 0;
	}

	get(element) {
		return this.map.get(element) ?? [];
	}

	/**
	 * This function wraps the EventTarget.addEventListener function. It is
	 * required because Flux needs to keep track of all events that are
	 * added to individual targets, so that when it updates the DOM and
	 * replaces elements in place, it can re-attach current events to the
	 * newly replaced elements using the original listener options.
	 *
	 * The added functionality here stores listener records in this.map.
	 * Once we've kept a record of this, we call the original
	 * addEventListener function of the browser. Listener identity follows
	 * the browser's duplicate/removal key: type, listener and capture.
	 */
	addEventListenerFlux = (type, listener, options, element) => {
		if(listener) {
			this.addToMap(element, type, listener, options);
		}
		ElementEventMapper.addEventListenerOriginal.call(
			element,
			type,
			listener,
			options,
		);

		if(this.debug) {
			this.logger.debug(`Event ${type} added to element:`, element);
		}
	}

	removeEventListenerFlux = (type, listener, options, element) => {
		if(listener) {
			this.removeFromMap(element, type, listener, options);
		}
		ElementEventMapper.removeEventListenerOriginal.call(
			element,
			type,
			listener,
			options,
		);

		if(this.debug) {
			this.logger.debug(`Event ${type} removed from element:`, element);
		}
	}

	addToMap(element, type, listener, options) {
		let records = this.get(element);
		let capture = this.getCapture(options);

		if(this.contains(records, type, listener, capture)) {
			return;
		}

		records.push({type, listener, options, capture});
		this.map.set(element, records);
	}

	removeFromMap(element, type, listener, options) {
		let records = this.get(element);
		let capture = this.getCapture(options);

		records = records.filter(record => {
			return !this.matches(record, type, listener, capture);
		});

		if(records.length > 0) {
			this.map.set(element, records);
		}
		else {
			this.map.delete(element);
		}
	}

	contains(records, type, listener, capture) {
		return records.some(record => this.matches(record, type, listener, capture));
	}

	matches(record, type, listener, capture) {
		return record.type === type
			&& record.listener === listener
			&& record.capture === capture;
	}

	getCapture(options) {
		if(typeof options === "boolean") {
			return options;
		}

		return Boolean(options?.capture);
	}

	static install() {
		if(ElementEventMapper.installed) {
			return;
		}

		EventTarget.prototype.addEventListener = function(type, listener, options) {
			let mapper = ElementEventMapper.activeMapper;
			if(mapper) {
				mapper.addEventListenerFlux(type, listener, options, this);
				return;
			}

			ElementEventMapper.addEventListenerOriginal.call(this, type, listener, options);
		};

		EventTarget.prototype.removeEventListener = function(type, listener, options) {
			let mapper = ElementEventMapper.activeMapper;
			if(mapper) {
				mapper.removeEventListenerFlux(type, listener, options, this);
				return;
			}

			ElementEventMapper.removeEventListenerOriginal.call(this, type, listener, options);
		};

		ElementEventMapper.installed = true;
	}
}
