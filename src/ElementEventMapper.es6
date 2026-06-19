/**
 * Records event listeners added to DOM elements after Flux starts.
 * It wraps Element.addEventListener so DomBridge can reattach those
 * listeners when an updated response replaces existing elements.
 */
export class ElementEventMapper {
	map;
	addEventListenerOriginal;

	constructor(logger = console, debug = false) {
// TODO: Is a WeakMap a better choice than Map? WeakMaps will automatically get garbage-collected when DOM nodes are removed, but do not have iteration functions.
		this.map = new WeakMap();
		this.addEventListenerOriginal = EventTarget.prototype.addEventListener;
		this.logger = logger;
		this.debug = debug;

		const self = this;
		Element.prototype.addEventListener = function(type, listener, options) {
			self.addEventListenerFlux(type, listener, options, this);
		};
	}

	has(element) {
		return this.map.has(element);
	}

	get(element) {
		return this.map.get(element);
	}

	/**
	 * This function overrides the Element.addEventListener function. It is
	 * required because Flux needs to keep track of all events that are
	 * added to individual elements, so that when it updates the DOM and
	 * replaces elements in place, it can re-attach any added events to the
	 * newly replaced elements.
	 *
	 * The added functionality here stores a record of all "listener"
	 * functions that are added to elements, within the this.map data
	 * structure. Once we've kept a record of this, we call the original
	 * addEventListener function of the browser.
	 */
	addEventListenerFlux = (type, listener, options, element) => {
// TODO: Do we need to store the "options" in here as a tuple?
		if(!this.mapTypeContains(element, type, listener)) {
			this.addToMapType(element, type, listener);
		}
		this.addEventListenerOriginal.call(
			element,
			type,
			listener,
			options,
		);

		if(this.debug) {
			this.logger.debug(`Event ${type} added to element:`, element);
		}
	}

	mapTypeContains = (element, type, listener) => {
		let mapObj = this.map.get(element);

		if(!mapObj || !mapObj[type]) {
			return false;
		}

		return mapObj[type].includes(listener);
	}

	addToMapType = (element, type, listener) => {
		let mapObj = this.map.get(element);

		if(!mapObj) {
			mapObj = {};
			this.map.set(element, mapObj);
		}

		if(!mapObj[type]) {
			mapObj[type] = [];
		}

		if(!mapObj[type].includes(listener)) {
			mapObj[type].push(listener);
		}
// Objects and arrays are passed by reference in ES6, so there's no need to
// update this.map or mapObj's contents.
	}
}
