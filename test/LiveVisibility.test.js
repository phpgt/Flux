import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {LiveHandler} from "../src/LiveHandler.es6";
import {UpdateTargetRegistry} from "../src/UpdateTargetRegistry.es6";

let handler, observer, hidden;
beforeEach(() => {
	vi.useFakeTimers();
	hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
	vi.stubGlobal("IntersectionObserver", class {
		constructor(callback) { this.callback = callback; this.elements = new Set(); observer = this; }
		observe(element) { this.elements.add(element); }
		unobserve(element) { this.elements.delete(element); }
		disconnect() { this.elements.clear(); }
		emit(element, visible) { this.callback([{target: element, isIntersecting: visible, intersectionRatio: Number(visible)}]); }
	});
	document.body.innerHTML = '<time id="clock" data-flux="live"></time>';
});
afterEach(() => {
	handler?.dispose();
	vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function start(pollDocument = vi.fn().mockResolvedValue(null), onDocument = vi.fn()) {
	handler = new LiveHandler({pollDocument}, new UpdateTargetRegistry(), onDocument);
	let element = document.querySelector("time");
	handler.register("live-outer", element);
	return {element, pollDocument, onDocument};
}
function visibility(value) { hidden.mockReturnValue(value); document.dispatchEvent(new Event("visibilitychange")); }

describe("Live polling lifecycle", () => {
	it("idles off-screen and resumes with one overdue request without replaying missed polls", async () => {
		let {element, pollDocument} = start();
		await vi.advanceTimersByTimeAsync(86400000);
		expect(pollDocument).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
		observer.emit(element, true);
		await vi.advanceTimersByTimeAsync(0);
		expect(pollDocument).toHaveBeenCalledOnce();
		observer.emit(element, false);
		await vi.advanceTimersByTimeAsync(86400000);
		expect(pollDocument).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
	});
	it("cancels hidden-tab polling and resumes after several days", async () => {
		let {element, pollDocument} = start(); observer.emit(element, true);
		visibility(true); await vi.advanceTimersByTimeAsync(3 * 86400000);
		expect(pollDocument).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
		visibility(false); await vi.advanceTimersByTimeAsync(0);
		expect(pollDocument).toHaveBeenCalledOnce();
	});
	it("does not schedule another poll while a slow request is outstanding or render its hidden response", async () => {
		let finish;
		let pollDocument = vi.fn((url, callback) => new Promise(resolve => { finish = () => { callback(document); resolve(); }; }));
		let {element, onDocument} = start(pollDocument); observer.emit(element, true);
		await vi.advanceTimersByTimeAsync(1000);
		handler.ensureRunning(); observer.emit(element, false); observer.emit(element, true);
		await vi.advanceTimersByTimeAsync(10000);
		expect(pollDocument).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
		visibility(true); finish(); await Promise.resolve();
		expect(onDocument).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
	});
	it("releases removed targets, observers and refresh history even while hidden", async () => {
		let {element} = start(); observer.emit(element, true); visibility(true);
		element.remove(); await Promise.resolve();
		expect(handler.lastRefreshMap.size).toBe(0);
		expect(handler.updateTargetRegistry.getElements("live-outer")).toHaveLength(0);
		expect(observer.elements.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
	});
	it("observes a server replacement after adoption without retaining the old target", async () => {
		let {element, pollDocument} = start(); observer.emit(element, true);
		let replacement = new DOMParser().parseFromString('<time id="clock" data-flux="live"></time>', "text/html").querySelector("time");
		handler.updateTargetRegistry.replace("live-outer", element, replacement);
		handler.register("live-outer", replacement); element.replaceWith(replacement);
		await Promise.resolve(); observer.emit(replacement, true);
		await vi.advanceTimersByTimeAsync(1000);
		expect(pollDocument).toHaveBeenCalledOnce();
		expect(observer.elements).toEqual(new Set([replacement]));
		expect(handler.lastRefreshMap.size).toBe(1);
	});
});
