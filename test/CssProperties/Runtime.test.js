import {afterEach, describe, it, expect, vi} from "vitest";
import {createRuntime, property, event} from "./Support.js";
import {DocumentUpdater} from "../../src/DocumentUpdater.es6";
import {UpdateTargetRegistry} from "../../src/UpdateTargetRegistry.es6";
import {FocusStateManager} from "../../src/FocusStateManager.es6";
import {Flux} from "../../src/Flux.es6";

let context;
afterEach(() => { context?.runtime.dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function start(html, options) { context = createRuntime(html, options); return context; }
function rectangle(element, rect = {left: 20, top: 40, width: 200, height: 100}) {
	return vi.spyOn(element, "getBoundingClientRect").mockReturnValue({...rect, right: rect.left + rect.width, bottom: rect.top + rect.height});
}
function intersect(observer, element, visible) { observer.emit(element, {isIntersecting: visible, intersectionRatio: visible ? 0.5 : 0}); }

describe("CSS runtime geometry and connections", () => {
	it("shares observers, batches pointer reads, and idles after writing", async () => {
		let {flush, intersections, resizes, frames} = start('<div data-flux="flux-pointer flux-size flux-visible flux-first-visible"></div>', {observers: true});
		let element = document.querySelector("div");
		let measure = rectangle(element);
		expect(intersections).toHaveLength(1); expect(resizes).toHaveLength(1);
		intersect(intersections[0], element, true);
		await flush(); measure.mockClear();
		for(let x = 21; x <= 120; x++) window.dispatchEvent(new MouseEvent("pointermove", {clientX: x, clientY: 65}));
		expect(measure).not.toHaveBeenCalled();
		await flush();
		expect(measure).toHaveBeenCalledOnce();
		expect(property("div", "pointer-x")).toBe("0.5");
		expect(property("div", "pointer-y")).toBe("0.25");
		expect(property("div", "pointer-x-px")).toBe("100");
		expect(property("div", "pointer-y-px")).toBe("25");
		expect(property("div", "size-x")).toBe("200");
		expect(frames.size).toBe(0);
		intersect(intersections[0], element, false); await flush(); measure.mockClear();
		window.dispatchEvent(new MouseEvent("pointermove", {clientX: 30})); await flush();
		expect(measure).not.toHaveBeenCalled();
		expect(property("div", "visible")).toBe("0");
		expect(property("div", "first-visible")).toBe("1");
	});
	it("measures border-box sizes in physical axes", async () => {
		let {flush, intersections, resizes} = start('<div data-flux="flux-size"></div>', {observers: true});
		let element = document.querySelector("div");
		intersect(intersections[0], element, true);
		resizes[0].emit(element, {borderBoxSize: [{inlineSize: 180.25, blockSize: 75.5}]});
		await flush();
		expect(property("div", "size-x")).toBe("180.25");
		expect(property("div", "size-y")).toBe("75.5");
	});
	it("uses viewport coordinates for global pointers", async () => {
		let {flush} = start('<div data-flux="flux-pointer-global"></div>');
		window.dispatchEvent(new MouseEvent("pointermove", {clientX: window.innerWidth / 2, clientY: window.innerHeight / 4}));
		await flush();
		expect(property("div", "pointer-global-x")).toBe("0.5");
		expect(property("div", "pointer-global-y")).toBe("0.25");
		expect(property("div", "pointer-global-x-px")).toBe(String(window.innerWidth / 2));
		expect(property("div", "pointer-global-y-px")).toBe(String(window.innerHeight / 4));
	});
	it("retains fractional pixels and remeasures local coordinates after scrolling", async () => {
		let {flush} = start('<div data-flux="flux-pointer flux-pointer-global"></div>');
		let measure = rectangle(document.querySelector("div"), {left: 20.25, top: 40.75, width: 200, height: 100});
		window.dispatchEvent(new MouseEvent("pointermove", {clientX: 120, clientY: 65}));
		await flush();
		expect(property("div", "pointer-x-px")).toBe("99.75");
		expect(property("div", "pointer-y-px")).toBe("24.25");
		measure.mockReturnValue({left: 10.25, top: 30.75, width: 200, height: 100});
		document.dispatchEvent(new Event("scroll"));
		await flush();
		expect(property("div", "pointer-x-px")).toBe("109.75");
		expect(property("div", "pointer-y-px")).toBe("34.25");
		expect(property("div", "pointer-global-x-px")).toBe("120");
		expect(property("div", "pointer-global-y-px")).toBe("65");
	});
	it("clamps pixel coordinates to the local and viewport edges, including empty boxes", async () => {
		let {flush} = start('<div data-flux="flux-pointer flux-pointer-global"></div>');
		let measure = rectangle(document.querySelector("div"));
		await flush();
		expect(property("div", "pointer-x-px")).toBe("0");
		expect(property("div", "pointer-global-y-px")).toBe("0");
		window.dispatchEvent(new MouseEvent("pointermove", {clientX: -10, clientY: window.innerHeight + 100}));
		await flush();
		expect(property("div", "pointer-x-px")).toBe("0");
		expect(property("div", "pointer-y-px")).toBe("100");
		expect(property("div", "pointer-global-x-px")).toBe("0");
		expect(property("div", "pointer-global-x-raw-px")).toBe("-10");
		expect(property("div", "pointer-global-y-raw-px")).toBe(String(window.innerHeight + 100));
		expect(Number(property("div", "pointer-x-raw-px"))).toBeLessThan(0);
		expect(Number(property("div", "pointer-y-raw-px"))).toBeGreaterThan(100);
		expect(property("div", "pointer-global-y-px")).toBe(String(window.innerHeight));
		measure.mockReturnValue({left: 0, top: 0, width: 0, height: 0});
		window.dispatchEvent(new Event("resize"));
		await flush();
		expect(property("div", "pointer-x-px")).toBe("0");
		expect(property("div", "pointer-y-px")).toBe("0");
		expect(property("div", "pointer-y")).toBe("0");
	});
	it("keeps an off-screen source active for a visible remote destination", async () => {
		let {flush, intersections} = start('<div data-flux="(flux-pointer@footer > :is(.preview,.summary))"></div><footer><output class="preview"></output><output class="summary"></output></footer>', {observers: true});
		rectangle(document.querySelector("div"));
		intersect(intersections[0], document.querySelector(".preview"), true);
		window.dispatchEvent(new MouseEvent("pointermove", {clientX: 120, clientY: 90}));
		await flush();
		expect(property("div", "pointer-x")).toBe("0.5");
		expect(property(".preview", "pointer-x")).toBe("0.5");
		expect(property(".summary", "pointer-x")).toBe("0.5");
		expect(property(".preview", "pointer-x-px")).toBe("100");
		expect(property(".summary", "pointer-y-px")).toBe("50");
	});
	it("reconnects after destination replacement and restores author properties on removal", async () => {
		let {flush} = start('<input type="range" value="40" data-flux="(flux-range@footer)"><footer style="--flux-range: .7"></footer>');
		await flush(); expect(property("footer", "range")).toBe("0.4");
		document.querySelector("footer").outerHTML = '<footer style="--flux-range: .9"></footer>';
		await flush(); expect(property("footer", "range")).toBe("0.4");
		document.querySelector("input").remove(); await flush();
		expect(property("footer", "range")).toBe(".9");
	});
	it("updates selector matches when arbitrary attributes change", async () => {
		let {flush} = start('<input type="range" value="25" data-flux="(flux-range@[data-target=active])"><footer data-target="inactive"></footer>');
		await flush(); expect(property("footer", "range")).toBe("");
		document.querySelector("footer").dataset.target = "active"; await flush();
		expect(property("footer", "range")).toBe("0.25");
	});
	it("reports conflicting owners and promotes the next owner on removal", async () => {
		let {flush, logger} = start('<input id="a" type="range" value="20" data-flux="(flux-range@footer)"><input id="b" type="range" value="80" data-flux="(flux-range@footer)"><footer></footer>');
		await flush(); expect(property("footer", "range")).toBe("0.2"); expect(logger.warn).toHaveBeenCalledOnce();
		event("#b", "input", "90"); await flush(); expect(property("footer", "range")).toBe("0.2");
		document.querySelector("#a").remove(); await flush(); expect(property("footer", "range")).toBe("0.9");
	});
	it("does not let an invalid selector disable valid sources", async () => {
		let {flush, logger} = start('<input type="range" value="30" data-flux="flux-range (flux-range@[)">');
		await flush(); expect(property("input", "range")).toBe("0.3"); expect(logger.error).toHaveBeenCalled();
	});
	it("pauses writes in a hidden tab and refreshes on return", async () => {
		let {flush, frames} = start('<input type="range" value="20" data-flux="flux-range">');
		await flush(); vi.spyOn(document, "hidden", "get").mockReturnValue(true);
		document.dispatchEvent(new Event("visibilitychange")); event("input", "input", "80");
		expect(frames.size).toBe(0); expect(property("input", "range")).toBe("0.2");
		vi.spyOn(document, "hidden", "get").mockReturnValue(false); document.dispatchEvent(new Event("visibilitychange"));
		await flush(); expect(property("input", "range")).toBe("0.8");
	});
	it("remeasures truncated text when content changes in a fixed-size box", async () => {
		let {flush} = start('<p data-flux="flux-truncated" style="overflow:hidden">Short</p>');
		let element = document.querySelector("p");
		Object.defineProperties(element, {clientWidth: {value: 100}, scrollWidth: {get: () => element.textContent.length * 10}, clientHeight: {value: 20}, scrollHeight: {value: 20}});
		await flush(); expect(property("p", "truncated")).toBe("0");
		element.textContent = "This is much longer text"; await flush();
		expect(property("p", "truncated-x")).toBe("1"); expect(property("p", "truncated-y")).toBe("0");
	});
});

describe("CSS source lifecycle through Flux rendering", () => {
	function updater(element, type) {
		let registry = new UpdateTargetRegistry(); registry.add(element, type);
		return new DocumentUpdater(registry, new FocusStateManager());
	}
	function response(html) { return new DOMParser().parseFromString(html, "text/html"); }
	it.each(["outer", "inner"])("preserves field history after %s updates", async type => {
		let {flush} = start('<section id="panel"><label id="field" data-flux="flux-field"><input value="original"></label></section>');
		await flush(); event("input", "focusin"); event("input", "input", "edited"); await flush();
		updater(document.querySelector("section"), type).apply(response('<section id="panel"><label id="field" data-flux="flux-field"><input value="edited"></label></section>'));
		await flush();
		expect(property("label", "field-dirty")).toBe("1"); expect(property("label", "field-touched")).toBe("1"); expect(property("label", "field-changed")).toBe("1");
		event("input", "input", "original"); await flush(); expect(property("label", "field-changed")).toBe("0");
	});
	it("starts new field history on link navigation", async () => {
		let {flush} = start('<section id="panel"><input data-flux="flux-field" value="a"></section>');
		await flush(); event("input", "input", "b"); await flush();
		updater(document.querySelector("section"), "outer").apply(response('<section id="panel"><input data-flux="flux-field" value="c"></section>'), undefined, undefined, null, true);
		await flush(); expect(property("input", "field-clean")).toBe("1"); expect(property("input", "field-unchanged")).toBe("1");
	});
	it("reapplies CSS values stripped by an attribute update", async () => {
		let {flush} = start('<input id="range" type="range" value="50" data-flux="flux-range">');
		await flush();
		updater(document.querySelector("input"), "attributes").apply(response('<input id="range" type="range" value="50" data-flux="flux-range">'));
		await flush(); expect(property("input", "range")).toBe("0.5");
	});
	it("preserves history on a DOM move and releases all subscriptions when removed", async () => {
		let {flush, runtime, intersections, resizes} = start('<div><input data-flux="flux-field flux-size" value="a"></div><aside></aside>', {observers: true});
		await flush(); event("input", "input", "b"); await flush();
		document.querySelector("aside").append(document.querySelector("input")); await flush();
		expect(property("input", "field-dirty")).toBe("1");
		document.querySelector("input").remove(); await flush();
		expect(runtime.bindings.size).toBe(0); expect(intersections[0].elements.size).toBe(0); expect(resizes[0].elements.size).toBe(0);
	});
	it("initialises mixed directives through Flux without duplicate CSS runtimes", async () => {
		let {runtime, flush} = start('<form data-flux="auto flux-form"><input value="a" data-flux="flux-field"></form>');
		runtime.dispose();
		let flux = new Flux();
		context.runtime = flux.cssPropertyRuntime;
		await flush();
		expect(property("input", "field-length")).toBe("1");
		expect(flux.updateTargetRegistry.getElements("outer")).toContain(document.querySelector("form"));
		expect(flux.cssPropertyRuntime.bindings.size).toBe(2);
	});
});
