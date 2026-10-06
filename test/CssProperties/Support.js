import {vi} from "vitest";
import {CssPropertyRuntime} from "../../src/CssProperties/Runtime.es6";

export function createRuntime(html, {observers = false} = {}) {
	document.body.innerHTML = html;
	let frames = new Map();
	let nextFrame = 0;
	vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++nextFrame, callback); return nextFrame; });
	vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => frames.delete(id));
	vi.spyOn(document, "hidden", "get").mockReturnValue(false);
	let intersections = [];
	let resizes = [];
	function observerClass(collection) {
		return class {
			constructor(callback) { this.callback = callback; this.elements = new Set(); collection.push(this); }
			observe(element) { this.elements.add(element); }
			unobserve(element) { this.elements.delete(element); }
			disconnect() { this.elements.clear(); }
			emit(element, values) { this.callback([{target: element, ...values}]); }
		};
	}
	vi.stubGlobal("IntersectionObserver", observers ? observerClass(intersections) : undefined);
	vi.stubGlobal("ResizeObserver", observers ? observerClass(resizes) : undefined);
	let logger = {error: vi.fn(), warn: vi.fn()};
	let runtime = new CssPropertyRuntime(document, logger);
	runtime.synchronise();
	let flush = async () => {
		await Promise.resolve();
		let callbacks = [...frames.values()];
		frames.clear();
		for(let callback of callbacks) callback(1000);
		await Promise.resolve();
	};
	return {runtime, frames, flush, intersections, resizes, logger};
}

export function property(selector, name) {
	return document.querySelector(selector).style.getPropertyValue(`--flux-${name}`);
}

export function event(selector, type, value) {
	let element = document.querySelector(selector);
	if(value !== undefined) element.value = value;
	element.dispatchEvent(new Event(type, {bubbles: true, cancelable: true}));
}
