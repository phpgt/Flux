import {afterEach, describe, expect, it, vi} from "vitest";
import {createRuntime, property} from "./Support.js";

let context;
afterEach(() => {
	context?.runtime.dispose();
	document.body.removeAttribute("data-flux");
	document.documentElement.removeAttribute("data-flux");
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
function start(html, options) { return context = createRuntime(html, options); }
function dimensions(element, values) {
	for(let [name, value] of Object.entries(values)) vi.spyOn(element, name, "get").mockReturnValue(value);
}
function rect(element, values) {
	return vi.spyOn(element, "getBoundingClientRect").mockReturnValue({left: 0, top: 0, width: 100, height: 100, ...values});
}
function scroll(element) { element.dispatchEvent(new Event("scroll")); }

describe("scroll CSS sources", () => {
	it("reports both axes, fractional pixels and clamped scalars from nested scroll events", async () => {
		let {flush, frames} = start('<div data-flux="flux-scroll"></div>', {observers: true});
		let element = document.querySelector("div");
		dimensions(element, {clientWidth: 200, scrollWidth: 600, clientHeight: 100, scrollHeight: 500});
		element.scrollLeft = 100.25; element.scrollTop = 200;
		await flush();
		expect(property("div", "scroll-x")).toBe("0.2506");
		expect(property("div", "scroll-x-px")).toBe("100.25");
		expect(property("div", "scroll-y")).toBe("0.5");
		element.scrollTop = 500;
		scroll(element); scroll(element);
		expect(frames.size).toBe(1);
		await flush(); expect(property("div", "scroll-y")).toBe("1");
		element.scrollTop = -10; scroll(element);
		await flush(); expect(property("div", "scroll-y")).toBe("0");
		expect(property("div", "scroll-y-px")).toBe("-10");
	});
	it("uses zero for an axis with no scroll range and handles RTL offsets", async () => {
		let {flush} = start('<div data-flux="flux-scroll" style="direction:rtl"></div>');
		let element = document.querySelector("div");
		dimensions(element, {clientWidth: 200, scrollWidth: 600, clientHeight: 100, scrollHeight: 100});
		element.scrollLeft = -200;
		await flush();
		expect(property("div", "scroll-x")).toBe("0.5");
		expect(property("div", "scroll-x-px")).toBe("-200");
		expect(property("div", "scroll-y")).toBe("0");
	});
	it("normalises reversed vertical scrolling while retaining its signed pixels", async () => {
		let {flush} = start('<div data-flux="flux-scroll" style="display:flex;flex-direction:column-reverse"></div>');
		let element = document.querySelector("div");
		dimensions(element, {clientHeight: 200, scrollHeight: 600});
		element.scrollTop = -100;
		await flush();
		expect(property("div", "scroll-y")).toBe("0.25");
		expect(property("div", "scroll-y-px")).toBe("-100");
	});
	it.each(["body", "html"])("measures document scrolling when declared on %s", async selector => {
		let {flush, runtime} = start('');
		document.querySelector(selector).dataset.flux = "flux-scroll";
		let page = document.documentElement;
		dimensions(page, {clientHeight: 500, scrollHeight: 1500});
		page.scrollTop = 250;
		runtime.synchronise(); await flush();
		expect(property(selector, "scroll-y")).toBe("0.25");
		expect(property(selector, "scroll-y-px")).toBe("250");
		page.scrollTop = 1000; scroll(document); await flush();
		expect(property(selector, "scroll-y")).toBe("1");
		page.scrollTop = 0;
	});
	it("tracks all passage boundaries outside visibility, accounting for container borders", async () => {
		let {flush} = start('<section style="overflow-y:auto"><div data-flux="flux-scroll-progress"></div></section>', {observers: true});
		let container = document.querySelector("section");
		let element = document.querySelector("div");
		dimensions(container, {clientHeight: 200, clientTop: 5});
		rect(container, {top: 40});
		let box = rect(element, {top: 345, height: 100});
		for(let [top, expected, midway] of [[345, "-0.3333", "-0.6667"], [245, "0", "0"], [170, "0.25", "0.5"], [95, "0.5", "1"], [20, "0.75", "0.5"], [-55, "1", "0"], [-155, "1.3333", "-0.6667"]]) {
			box.mockReturnValue({left: 0, top, width: 100, height: 100});
			scroll(container); await flush();
			expect(property("div", "scroll-progress-y")).toBe(expected);
			expect(property("div", "scroll-midway-y")).toBe(midway);
			expect(Number(property("div", "scroll-progress-y-inverse"))).toBeCloseTo(1 - Number(expected), 4);
		}
	});
	it("uses the nearest scrollport per axis and the viewport as fallback", async () => {
		let {flush} = start('<section style="overflow-x:scroll"><article style="overflow-y:hidden"><div data-flux="flux-scroll-progress"></div></article></section>');
		let outer = document.querySelector("section"), inner = document.querySelector("article");
		dimensions(outer, {clientWidth: 300, clientLeft: 2}); rect(outer, {left: 30});
		dimensions(inner, {clientHeight: 200, clientTop: 5}); rect(inner, {top: 40});
		let element = document.querySelector("div"); rect(element, {left: 132, top: 95});
		await flush();
		expect(property("div", "scroll-progress-x")).toBe("0.5");
		expect(property("div", "scroll-progress-x-inverse")).toBe("0.5");
		expect(property("div", "scroll-midway-x")).toBe("1");
		expect(property("div", "scroll-progress-y")).toBe("0.5");
		document.body.append(element);
		dimensions(document.documentElement, {clientWidth: 364, clientHeight: 290});
		await flush();
		expect(property("div", "scroll-progress-x")).toBe("0.5");
		expect(property("div", "scroll-progress-x-inverse")).toBe("0.5");
		expect(property("div", "scroll-midway-x")).toBe("1");
		expect(property("div", "scroll-progress-y")).toBe("0.5");
	});
	it("handles elements taller than the viewport and a zero-length passage", async () => {
		let {flush, frames} = start('<div data-flux="flux-scroll-progress"></div>');
		let element = document.querySelector("div");
		dimensions(document.documentElement, {clientHeight: 200});
		let box = rect(element, {top: -200, height: 600});
		await flush(); expect(property("div", "scroll-progress-y")).toBe("0.5");
		await flush(); expect(frames.size).toBe(0);
		dimensions(document.documentElement, {clientHeight: 0});
		vi.spyOn(window, "innerHeight", "get").mockReturnValue(0);
		box.mockReturnValue({left: 0, top: 0, width: 0, height: 0});
		window.dispatchEvent(new Event("resize")); await flush();
		expect(property("div", "scroll-progress-y")).toBe("0");
		expect(property("div", "scroll-progress-y-inverse")).toBe("1");
		expect(property("div", "scroll-midway-y")).toBe("0");
	});
	it("remeasures on content resize, window resize and DOM updates, then releases observers", async () => {
		let {flush, runtime, resizes} = start('<section data-flux="(flux-scroll@output)"><article></article></section><output></output>', {observers: true});
		let container = document.querySelector("section"), content = document.querySelector("article");
		dimensions(container, {clientHeight: 100});
		let height = vi.spyOn(container, "scrollHeight", "get").mockReturnValue(300);
		container.scrollTop = 100;
		await flush(); expect(property("output", "scroll-y")).toBe("0.5");
		height.mockReturnValue(500); resizes[0].emit(content, {});
		await flush(); expect(property("output", "scroll-y")).toBe("0.25");
		height.mockReturnValue(200); window.dispatchEvent(new Event("resize"));
		await flush(); expect(property("output", "scroll-y")).toBe("1");
		height.mockReturnValue(300); content.textContent = "More content";
		await flush(); expect(property("output", "scroll-y")).toBe("0.5");
		container.remove(); await flush();
		expect(resizes[0].elements.size).toBe(0);
		expect(property("output", "scroll-y")).toBe("");
		expect(runtime.bindings.size).toBe(0);
	});
});
