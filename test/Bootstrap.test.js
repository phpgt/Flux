import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("../src/Flux.es6", () => ({Flux: vi.fn()}));
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("Browser bundle configuration", () => {
	it("does not enable debug logging merely by exporting the debug helper", async () => {
		vi.stubGlobal("FluxConfig", undefined);
		await import("../src/main.es6");
		let {RuntimeConfig} = await import("../src/RuntimeConfig.es6");
		expect(RuntimeConfig.debug).toBe(false);
	});
	it("applies an explicit debug setting before initialising Flux", async () => {
		vi.stubGlobal("FluxConfig", {debug: true, scrollBehavior: "smooth"});
		await import("../src/main.es6");
		let {RuntimeConfig} = await import("../src/RuntimeConfig.es6");
		let {Flux} = await import("../src/Flux.es6");
		expect(RuntimeConfig.debug).toBe(true);
		expect(RuntimeConfig.scrollToTopBehavior).toBe("smooth");
		expect(Flux).toHaveBeenCalledOnce();
	});
});
