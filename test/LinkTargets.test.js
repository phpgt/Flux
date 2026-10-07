import {afterEach, describe, expect, it, vi} from "vitest";
import {NavigationController} from "../src/NavigationController.es6";
import {ResponseHandler} from "../src/ResponseHandler.es6";
import {DocumentUpdater} from "../src/DocumentUpdater.es6";
import {UpdateTargetRegistry} from "../src/UpdateTargetRegistry.es6";
import {FocusStateManager} from "../src/FocusStateManager.es6";

afterEach(() => { document.body.innerHTML = ""; });

describe("Link update targets", () => {
	it.each([
		["#chapter, #summary", "", false, true, false],
		["#chapter, #summary", "#dialog", false, false, true],
		["", "", true, true, true],
		["#missing", "", false, false, false],
	])("limits updates to the inherited selector %s or link selector %s", async (ancestorTarget, linkTarget, replaceMain, replaceChapter, replaceDialog) => {
		let html = `<main id="content"><textarea></textarea><nav ${ancestorTarget ? `data-flux-target="${ancestorTarget}"` : ""}><a href="/next" ${linkTarget ? `data-flux-target="${linkTarget}"` : ""}>Next</a></nav><section id="chapter">Chapter</section><p id="summary">Summary</p></main><div id="dialog">Dialog</div>`;
		document.body.innerHTML = html;
		let main = document.querySelector("main");
		let chapter = document.querySelector("#chapter");
		let dialog = document.querySelector("#dialog");
		document.querySelector("textarea").value = "Keep this thought";
		let registry = new UpdateTargetRegistry();
		registry.add(main, "link-outer");
		registry.add(chapter, "link-outer");
		registry.add(document.querySelector("#summary"), "link-inner");
		registry.add(dialog, "link-inner");
		let updater = new DocumentUpdater(registry, new FocusStateManager());
		let history = {state: {}, replaceState: vi.fn(), pushState: vi.fn()};
		let windowObject = {scrollX: 0, scrollY: 0, scrollTo: vi.fn()};
		let fetcher = vi.fn().mockResolvedValue({ok: true, url: "http://localhost/next", text: async () => `<html><head><title>Next</title></head><body>${html.replace("Chapter</section>", "New chapter</section>").replace("Summary</p>", "New summary</p>").replace("Dialog</div>", "New dialog</div>")}</body></html>`});
		let controller = new NavigationController(new DOMParser(), fetcher, history, console, document, windowObject);
		let handler = new ResponseHandler(updater, console, false, callback => callback(), undefined, undefined, windowObject, callback => callback());
		await controller.clickLink(document.querySelector("a"), handler.handleLinkDocument);
		expect(document.querySelector("main") !== main).toBe(replaceMain);
		expect(document.querySelector("#chapter").textContent).toBe(replaceChapter ? "New chapter" : "Chapter");
		expect(document.querySelector("#summary").textContent).toBe(replaceChapter ? "New summary" : "Summary");
		expect(document.querySelector("#dialog").textContent).toBe(replaceDialog ? "New dialog" : "Dialog");
		expect(document.querySelector("textarea").value).toBe(replaceMain ? "" : "Keep this thought");
		if(ancestorTarget || linkTarget) expect(history.pushState.mock.calls[0][0].fluxTargetSelector).toBe(linkTarget || ancestorTarget);
	});
});
