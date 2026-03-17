import {Flux} from "./Flux.es6";

/**
 * The `addEventListener` behaviour of the DOM is overridden here to provide
 * functionality for tracking event listeners added to elements.
 * This is necessary because as elements in the DOM are replaced/updated
 * dynamically, their corresponding event listeners will need to be reattached
 * automatically.
 *
 * Only one instance of the ElementEventMapper is necessary per Flux instance,
 * as the constructor handles the override.
 *
 * A reference to the original `addEventListener` functionality is stored in
 * `addEventListenerOriginal`, before it is replace by the function called
 * `addEventListenerFlux`.
 *
 * The map property is a map of objects: the outer map's key is the HTMLElement,
 * which contains an object, where the keys are the type of event listener such
 * as "click", "submit", etc.
 */
export class ElementEventMapper {
	map;
	addEventListenerOriginal;

	constructor() {
// TODO: Is a WeakMap a better choice than Map? WeakMaps will automatically get garbage-collected when DOM nodes are removed, but do not have iteration functions.
		this.map = new WeakMap();
		this.addEventListenerOriginal = EventTarget.prototype.addEventListener;

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

		Flux.DEBUG && console.debug(`Event ${type} added to element:`, element);
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
