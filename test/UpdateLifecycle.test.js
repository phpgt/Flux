import {afterEach, describe, expect, it, vi} from "vitest";
import {Flux} from "../src/Flux.es6";

let flux;
let originalListener = Element.prototype.addEventListener;
let originalShowModal = HTMLDialogElement.prototype.showModal;
afterEach(() => {
	flux?.liveHandler.dispose();
	Element.prototype.addEventListener = originalListener;
	if(originalShowModal) HTMLDialogElement.prototype.showModal = originalShowModal;
	else delete HTMLDialogElement.prototype.showModal;
	document.removeEventListener("flux:after-render", flux?.initRenderedCssProperties);
	document.body.innerHTML = "";
	vi.restoreAllMocks();
});

describe("Repeated server updates", () => {
	it("keeps one inner target and one dialog close listener across repeated replacements", async () => {
		let html = '<main id="region" data-flux="update-link-inner"><dialog data-flux="modal"><button>Close</button></dialog></main>';
		document.body.innerHTML = html;
		vi.spyOn(HTMLDialogElement.prototype, "matches").mockReturnValue(false);
		HTMLDialogElement.prototype.showModal = vi.fn();
		flux = new Flux(); await Promise.resolve();
		let root = document.querySelector("main");
		for(let i = 0; i < 100; i++) {
			document.querySelector("dialog").dispatchEvent(new Event("close"));
			let response = new DOMParser().parseFromString(html, "text/html");
			flux.documentUpdater.apply(response, ["link-inner"]);
			await Promise.resolve();
			expect(flux.updateTargetRegistry.getElements("link-inner")).toEqual([root]);
			expect(flux.elementEventMapper.get(document.querySelector("dialog")).close).toHaveLength(1);
		}
	});
});
