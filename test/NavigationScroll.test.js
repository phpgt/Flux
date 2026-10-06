import {afterEach, describe, expect, it, vi} from "vitest";
import {NavigationController} from "../src/NavigationController.es6";
import {ResponseHandler} from "../src/ResponseHandler.es6";

afterEach(() => { document.body.innerHTML = ""; });

describe("Preserving scroll on link navigation", () => {
	it.each([false, true])("retains history coordinates and restores the original position (scoped: %s)", async scoped => {
		document.body.innerHTML = scoped
			? '<section data-flux-scroll="smooth"><a href="/selection" data-flux-scroll="preserve">Select</a></section>'
			: '<a href="/selection" data-flux-scroll="preserve">Select</a>';
		let section = document.querySelector("section");
		if(section) { section.scrollTop = 220; section.scrollLeft = 15; }
		let windowObject = {scrollX: 10, scrollY: 900, scrollTo: vi.fn()};
		let historyObject = {state: {}, replaceState: vi.fn(), pushState: vi.fn()};
		let fetcher = vi.fn().mockResolvedValue({ok: true, url: 'http://localhost/selection', text: async () => '<html><head><title>Selection</title></head><body><main>Selection</main></body></html>'});
		let controller = new NavigationController(new DOMParser(), fetcher, historyObject, console, document, windowObject);
		let updater = {apply: vi.fn()};
		let animationFrame = vi.fn(callback => callback());
		let response = new ResponseHandler(updater, console, false, callback => callback(), undefined, undefined, windowObject, animationFrame);
		await controller.clickLink(document.querySelector("a"), response.handleLinkDocument);
		expect(historyObject.pushState.mock.calls[0][0]).toMatchObject({
			fluxScrollPreserve: true,
			fluxScrollX: scoped ? 15 : 10,
			fluxScrollY: scoped ? 220 : 900,
		});
		expect(updater.apply).toHaveBeenCalledOnce();
		expect(animationFrame).toHaveBeenCalledTimes(2);
		if(scoped) expect(windowObject.scrollTo).not.toHaveBeenCalled();
		else expect(windowObject.scrollTo).toHaveBeenCalledWith({top: 900, left: 10, behavior: "instant"});
		if(section) expect(section.scrollTop).toBe(220);
	});
});
