import {describe, it, expect, vi} from "vitest";
import {DirectiveParser} from "../../src/DirectiveParser.es6";
import {DirectiveRegistry} from "../../src/DirectiveRegistry.es6";
import {CSS_SOURCES} from "../../src/CssProperties/SourceRegistry.es6";

describe("Flux directive parsing", () => {
	it("keeps full CSS selectors inside connections", () => {
		expect(DirectiveParser.parse(`update-inner flux-size (flux-pointer,flux-size@footer > :is(.a,.b), [data-label="a ) @ b"])`)).toEqual([
			{names: ["update-inner"], selector: null},
			{names: ["flux-size"], selector: null},
			{names: ["flux-pointer", "flux-size"], selector: 'footer > :is(.a,.b), [data-label="a ) @ b"]'},
		]);
	});
	it("accepts newlines, duplicates, and escaped selector characters", () => {
		expect(DirectiveParser.parse("flux-size\nflux-size\t(flux-size@#a\\)b)")).toHaveLength(2);
	});
	it.each(["(flux-size@)", "(flux-size@div", "flux-size)", '(flux-size@[title="x])', "(flux-size div)"])("rejects malformed syntax: %s", value => {
		expect(() => DirectiveParser.parse(value)).toThrow(SyntaxError);
	});
	it("initialises valid neighbours despite an unknown directive", () => {
		let update = vi.fn();
		let css = vi.fn();
		let registry = new DirectiveRegistry({updateInner: update, cssProperties: css});
		let element = document.createElement("div");
		element.dataset.flux = "unknown update-inner flux-size flux-pointer (flux-size@footer)";
		expect(() => registry.initElement(element)).toThrow("Unknown flux element type: unknown");
		expect(update).toHaveBeenCalledOnce();
		expect(css).toHaveBeenCalledOnce();
	});
	it("supports auto on forms, buttons, and links with CSS sources", () => {
		let autoContainer = vi.fn();
		let autoSubmit = vi.fn();
		let registry = new DirectiveRegistry({autoContainer, autoSubmit, cssProperties: vi.fn()});
		for(let tag of ["form", "button", "a"]) {
			let element = document.createElement(tag);
			element.dataset.flux = "auto flux-size";
			registry.initElement(element);
		}
		expect(autoContainer).toHaveBeenCalledTimes(2);
		expect(autoSubmit).toHaveBeenCalledOnce();
	});
	it("registers all sixteen CSS sources", () => {
		expect(Object.keys(CSS_SOURCES)).toHaveLength(16);
		for(let name of Object.keys(CSS_SOURCES)) expect(DirectiveRegistry.DEFINITIONS[name].handler).toBe("cssProperties");
	});
});
