import {afterEach, describe, it, expect, vi} from "vitest";
import {createRuntime} from "./Support.js";

let context;
afterEach(() => { context?.runtime.dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("Batched CSS writing", () => {
	it("writes a property once per frame and skips unchanged values without waking another frame", async () => {
		context = createRuntime('<div></div>');
		let {runtime, flush, frames} = context;
		let element = document.querySelector("div"), owner = {};
		let writes = vi.spyOn(element.style, "setProperty");
		for(let value = 0; value < 100; value++) runtime.writer.set(owner, element, "--example", value);
		expect(writes).not.toHaveBeenCalled(); await flush();
		expect(writes).toHaveBeenCalledOnce(); expect(element.style.getPropertyValue("--example")).toBe("99");
		runtime.writer.set(owner, element, "--example", 99);
		expect(frames.size).toBe(0);
	});
	it("restores original values when ownership changes before a pending flush", async () => {
		context = createRuntime('<div style="--example: original"></div>');
		let {runtime, flush} = context;
		let element = document.querySelector("div"), first = {}, second = {};
		runtime.writer.set(first, element, "--example", "first"); await flush();
		runtime.writer.release(first); runtime.writer.set(second, element, "--example", "second"); await flush();
		expect(element.style.getPropertyValue("--example")).toBe("second");
		runtime.writer.release(second); await flush();
		expect(element.style.getPropertyValue("--example")).toBe("original");
	});
	it("cancels pending writes when a source is removed before its first flush", async () => {
		context = createRuntime('<input type="range" data-flux="flux-range">');
		let element = document.querySelector("input"); element.remove();
		await context.flush();
		expect(element.style.getPropertyValue("--flux-range")).toBe("");
		expect(context.runtime.writer.targets.size).toBe(0);
	});
});
