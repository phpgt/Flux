import {afterEach, describe, it, expect, vi} from "vitest";
import {extractPalette} from "../../src/CssProperties/Palette.es6";
import {createRuntime, property} from "./Support.js";

let context;
afterEach(() => { context?.runtime.dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function pixels(...colours) { return new Uint8ClampedArray(colours.flatMap(colour => [...colour, 255])); }
function canvas(data) {
	let drawing = {drawImage: vi.fn(), getImageData: vi.fn(() => ({data}))};
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(drawing);
	return drawing;
}
function loaded(image) {
	Object.defineProperties(image, {complete: {value: true}, naturalWidth: {value: 100}});
}

describe("Palette extraction", () => {
	it("calculates dominant, accent, extrema, mean, and temperature from one sample", () => {
		let result = extractPalette(pixels([200, 0, 0], [200, 0, 0], [0, 0, 255], [40, 40, 40], [230, 230, 230]));
		expect(result[""]).toBe("#c80000"); expect(result.accent).toBe("#0000ff");
		expect(result.dark).toBe("#0000ff"); expect(result.light).toBe("#e6e6e6");
		expect(result.average).toBe("#863669"); expect(result.temp).toBeCloseTo((134 - 105) / 255);
	});
	it("ignores transparency and has defined fallbacks for monochrome samples", () => {
		expect(extractPalette(new Uint8ClampedArray([255, 0, 0, 0]))).toBeNull();
		let result = extractPalette(pixels([0, 0, 0]));
		for(let name of ["", "accent", "dark", "light", "average"]) expect(result[name]).toBe("#000000");
		expect(result.temp).toBe(0);
	});
	it("samples loaded images once and reuses the result on visibility changes", async () => {
		context = createRuntime('<figure data-flux="flux-palette"><img src="/image.png"></figure>', {observers: true});
		let drawing = canvas(pixels([200, 0, 0])); loaded(document.querySelector("img"));
		let {flush, intersections} = context;
		let figure = document.querySelector("figure");
		let intersect = visible => intersections[0].emit(figure, {isIntersecting: visible, intersectionRatio: visible ? 1 : 0});
		intersect(true); await flush(); expect(property("figure", "palette")).toBe("#c80000");
		intersect(false); await flush(); intersect(true); await flush();
		expect(drawing.getImageData).toHaveBeenCalledOnce();
	});
	it("does not retry unreadable media every frame", async () => {
		context = createRuntime('<img src="/blocked.png" data-flux="flux-palette">');
		loaded(document.querySelector("img"));
		let drawing = canvas(pixels([0, 0, 0])); drawing.getImageData.mockImplementation(() => { throw new DOMException("Tainted canvas", "SecurityError"); });
		await context.flush(); context.runtime.refreshAll(); await context.flush();
		expect(drawing.getImageData).toHaveBeenCalledOnce(); expect(property("img", "palette")).toBe("");
	});
	it("discards asynchronous image results after removal", async () => {
		context = createRuntime('<img src="/slow.png" data-flux="flux-palette">');
		let drawing = canvas(pixels([100, 0, 0])); loaded(document.querySelector("img"));
		let resolve; vi.stubGlobal("createImageBitmap", vi.fn(() => new Promise(done => { resolve = done; })));
		await context.flush(); document.querySelector("img").remove(); await context.flush();
		let bitmap = {close: vi.fn()}; resolve(bitmap); await context.flush();
		expect(bitmap.close).toHaveBeenCalledOnce(); expect(drawing.drawImage).not.toHaveBeenCalled();
	});
	it("caps video sampling and cancels its callback off-screen", async () => {
		context = createRuntime('<video data-flux="flux-palette" src="/video.webm"></video>', {observers: true});
		let video = document.querySelector("video");
		Object.defineProperties(video, {readyState: {value: 2}, paused: {value: false}});
		let next; video.requestVideoFrameCallback = vi.fn(callback => { next = callback; return 1; });
		video.cancelVideoFrameCallback = vi.fn();
		let drawing = canvas(pixels([0, 100, 0]));
		let time = 1000; vi.spyOn(window.performance, "now").mockImplementation(() => time);
		context.intersections[0].emit(video, {isIntersecting: true, intersectionRatio: 1});
		await context.flush(); expect(property("video", "palette")).toBe("#006400");
		time += 100; next(); await context.flush(); expect(drawing.getImageData).toHaveBeenCalledOnce();
		time += 200; next(); await context.flush(); expect(drawing.getImageData).toHaveBeenCalledTimes(2);
		context.intersections[0].emit(video, {isIntersecting: false, intersectionRatio: 0}); await context.flush();
		expect(video.cancelVideoFrameCallback).toHaveBeenCalled();
		for(let i = 0; i < 100; i++) video.dispatchEvent(new Event("timeupdate"));
		expect(context.frames.size).toBe(0);
		expect(drawing.getImageData).toHaveBeenCalledTimes(2);
		context.intersections[0].emit(video, {isIntersecting: true, intersectionRatio: 1}); await context.flush();
		video.cancelVideoFrameCallback.mockClear();
		vi.spyOn(document, "hidden", "get").mockReturnValue(true);
		document.dispatchEvent(new Event("visibilitychange"));
		expect(video.cancelVideoFrameCallback).toHaveBeenCalledOnce();
	});
});
