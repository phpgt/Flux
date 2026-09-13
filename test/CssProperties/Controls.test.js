import {afterEach, describe, it, expect, vi} from "vitest";
import {createRuntime, property, event} from "./Support.js";

let context;
afterEach(() => { context?.runtime.dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function start(html) { context = createRuntime(html); return context; }

describe("Control CSS sources", () => {
	it("normalises a descendant range and follows reset", async () => {
		let {flush} = start('<form><label data-flux="flux-range"><input type="range" min="20" max="80" value="35"></label></form>');
		await flush();
		expect(property("label", "range")).toBe("0.25");
		event("input", "input", "80"); await flush();
		expect(property("label", "range")).toBe("1");
		document.querySelector("form").reset(); await flush();
		expect(property("label", "range")).toBe("0.25");
	});
	it("uses the first matching control or the bound control itself", async () => {
		let {flush} = start('<div data-flux="flux-range"><input type="range" value="20"><input type="range" value="80"></div><input id="direct" type="range" value="40" data-flux="flux-range">');
		await flush();
		expect(property("div", "range")).toBe("0.2");
		expect(property("#direct", "range")).toBe("0.4");
	});
	it("removes a non-numeric selection and exposes a colour", async () => {
		let {flush} = start('<select data-flux="flux-select"><option value="3">Three</option><option value="none">None</option></select><input type="color" value="#123456" data-flux="flux-color">');
		await flush();
		expect(property("select", "select")).toBe("3");
		expect(property("input", "color")).toBe("#123456");
		event("select", "change", "none"); await flush();
		expect(property("select", "select")).toBe("");
	});
	it("exposes field budgets, native validation, and independent history flags", async () => {
		let {flush} = start('<form><label data-flux="flux-field"><input required pattern="[a-z]+" maxlength="10" value="abc"></label></form>');
		await flush();
		expect(property("label", "field-length")).toBe("3");
		expect(property("label", "field-remaining")).toBe("7");
		expect(property("label", "field-filled-scalar")).toBe("0.3");
		expect(property("label", "field-clean")).toBe("1");
		event("input", "focusin"); event("input", "input", "123"); await flush();
		expect(property("label", "field-touched")).toBe("1");
		expect(property("label", "field-dirty")).toBe("1");
		expect(property("label", "field-pattern-error")).toBe("1");
		expect(property("label", "field-invalid")).toBe("1");
		event("input", "input", "abc"); await flush();
		expect(property("label", "field-changed")).toBe("0");
		expect(property("label", "field-dirty")).toBe("1");
		document.querySelector("form").reset(); await flush();
		expect(property("label", "field-clean")).toBe("1");
		expect(property("label", "field-untouched")).toBe("1");
	});
	it("honours cancelled reset events", async () => {
		let {flush} = start('<form><input data-flux="flux-field" value="a"></form>');
		await flush(); event("input", "input", "b"); await flush();
		document.querySelector("form").addEventListener("reset", event => event.preventDefault());
		document.querySelector("form").reset(); await flush();
		expect(property("input", "field-dirty")).toBe("1");
		expect(property("input", "field-changed")).toBe("1");
	});
	it("updates validation counts when fields or constraints change", async () => {
		let {flush} = start('<form data-flux="flux-form"><input required><input type="email" value="a@example.com"><input disabled required><input type="hidden"><button>Save</button></form>');
		await flush();
		expect(property("form", "form-field-count")).toBe("2");
		expect(property("form", "form-valid-count")).toBe("1");
		expect(property("form", "form-invalid-count")).toBe("1");
		expect(property("form", "form-valid-scalar")).toBe("0.5");
		document.querySelector("input").remove(); await flush();
		expect(property("form", "form-all-valid")).toBe("1");
	});
	it("counts external form-associated fields and treats an empty form as valid", async () => {
		let {flush} = start('<form id="form" data-flux="flux-form"></form><input form="form" required>');
		await flush(); expect(property("form", "form-invalid-count")).toBe("1");
		event("input", "input", "ready"); await flush();
		expect(property("form", "form-all-valid")).toBe("1");
		document.querySelector("input").remove(); await flush();
		expect(property("form", "form-valid-scalar")).toBe("1");
	});
	it("removes budgets when maxlength is removed and binds a replacement input", async () => {
		let {flush} = start('<label data-flux="flux-field"><input maxlength="10" value="abc"></label>');
		await flush(); document.querySelector("input").removeAttribute("maxlength"); await flush();
		expect(property("label", "field-remaining")).toBe("");
		document.querySelector("label").innerHTML = '<textarea>hello</textarea>'; await flush();
		expect(property("label", "field-length")).toBe("5");
	});
	it("updates both sides of a radio group without marking the unfocussed control touched", async () => {
		let {flush} = start('<form><input id="first" type="radio" name="choice" checked data-flux="flux-field"><input id="second" type="radio" name="choice" data-flux="flux-field"></form>');
		await flush();
		document.querySelector("#second").checked = true;
		event("#second", "focusin"); event("#second", "change"); await flush();
		expect(property("#first", "field-changed")).toBe("1");
		expect(property("#first", "field-dirty")).toBe("1");
		expect(property("#first", "field-touched")).toBe("0");
		expect(property("#second", "field-touched")).toBe("1");
	});

	it("records focus and edits before the first scheduled CSS flush", async () => {
		let {flush} = start('<input data-flux="flux-field" value="initial">');
		event("input", "focusin"); event("input", "input", "edited");
		await flush();
		expect(property("input", "field-touched")).toBe("1");
		expect(property("input", "field-dirty")).toBe("1");
		expect(property("input", "field-changed")).toBe("1");
	});

});
