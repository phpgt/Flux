import {afterEach, describe, it, expect, vi} from "vitest";
import {createRuntime, property} from "./Support.js";
import {Flux} from "../../src/Flux.es6";
import {SortableItems} from "../../src/DragOrder/SortableItems.es6";
import {Style} from "../../src/Style.es6";

let context;
let flux;
afterEach(() => {
	context?.runtime.dispose();
	flux?.cssPropertyRuntime?.dispose();
	flux?.liveHandler?.stop();
	if(flux) document.removeEventListener("flux:after-render", flux.initRenderedCssProperties);
	vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function start(html) {
	context = createRuntime(html);
	context.runtime.dispose();
	flux = new Flux();
	return context;
}
function response(html) { return new DOMParser().parseFromString(html, "text/html"); }

describe("CSS sources alongside existing directives", () => {
	it("registers live updates and CSS sources on the same node", async () => {
		let {flush} = start('<section id="live" data-flux="live-inner flux-visible">Old</section>');
		await flush();
		expect(flux.updateTargetRegistry.getElements("live-inner")).toContain(document.querySelector("section"));
		flux.documentUpdater.apply(response('<section id="live" data-flux="live-inner flux-visible">New</section>'), ["live-inner"]);
		await flush();
		expect(document.querySelector("section").textContent).toBe("New");
		expect(property("section", "visible")).toBe("1");
	});
	it("starts CSS sources first introduced in autocomplete results", async () => {
		let {flush} = start('<form data-flux="autocomplete"><input name="query"></form>');
		expect(flux.cssPropertyRuntime).toBeUndefined();
		let form = document.querySelector("form");
		flux.autocompleteHandler.applyResults(form, flux.autocompleteHandler.state.get(form), response('<section data-flux="autocomplete-results flux-visible">Results</section>'));
		await flush();
		expect(property("section", "visible")).toBe("1");
	});
	it("starts CSS sources first introduced by an attribute update", async () => {
		let {flush} = start('<input id="field" data-flux="update-attributes" value="hello">');
		expect(flux.cssPropertyRuntime).toBeUndefined();
		flux.documentUpdater.apply(response('<input id="field" data-flux="update-attributes flux-field" value="hello">'));
		await flush();
		expect(property("input", "field-length")).toBe("5");
	});
	it("recognises drag items with additional CSS directives", () => {
		document.body.innerHTML = '<ul><li data-flux="drag-order flux-size"></li><li></li></ul>';
		expect(new SortableItems().getSiblings(document.querySelector("ul"))).toHaveLength(1);
	});
	it("keeps the autosave hiding rule applicable to combined directives", () => {
		document.body.innerHTML = '<button data-flux="autosave flux-size">Save</button>';
		let style = new Style(); style.addToDocument();
		expect(window.getComputedStyle(document.querySelector("button")).display).toBe("none");
	});
});
