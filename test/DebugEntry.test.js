import {afterEach, describe, expect, it, vi} from "vitest";
import {execFileSync} from "node:child_process";

const originalAddEventListener = Element.prototype.addEventListener;
afterEach(() => {
	Element.prototype.addEventListener = originalAddEventListener;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.head.innerHTML = "";
	document.body.innerHTML = "";
});

async function loadBundle(source) {
	document.body.innerHTML = '<form data-flux method="post"><button>Submit</button></form>';
	const script = execFileSync("node_modules/.bin/esbuild", [
		"--bundle", "--format=iife", "--platform=browser", "--loader:.es6=js",
	], {input: source, encoding: "utf8", cwd: process.cwd()});
	new Function(script)();
}

describe("Published debug entry point", () => {
	it("keeps normal imports quiet, including ElementEventMapper", async () => {
		const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
		await loadBundle('import "@phpgt/flux";');
		document.createElement("button").addEventListener("click", () => {});
		expect(debug).not.toHaveBeenCalled();
	});
	it("enables startup and listener logs when the debug import comes first", async () => {
		const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
		await loadBundle('import "@phpgt/flux/debug"; import "@phpgt/flux";');
		expect(debug).toHaveBeenCalled();
		debug.mockClear();
		const button = document.createElement("button");
		button.addEventListener("click", () => {});
		expect(debug).toHaveBeenCalledWith("Event click added to element:", button);
	});
	it("keeps an explicit debug:false override quiet", async () => {
		vi.stubGlobal("FluxConfig", {debug: false});
		const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
		await loadBundle('import "@phpgt/flux/debug"; import "@phpgt/flux";');
		document.createElement("button").addEventListener("click", () => {});
		expect(debug).not.toHaveBeenCalled();
	});
});
