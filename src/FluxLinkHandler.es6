export class FluxLinkHandler {
	constructor(
		navigationController,
		onDocument,
		windowObject = globalThis.window,
	) {
		this.navigationController = navigationController;
		this.onDocument = onDocument;
		this.windowObject = windowObject;
	}

	initAutoLink = (fluxElement) => {
		if(!(fluxElement instanceof HTMLAnchorElement)) {
			throw new TypeError("data-type type \"link\" must be applied to an anchor element.");
		}

		fluxElement.addEventListener("click", this.autoClick);
	}

	autoClick = (e) => {
		e.preventDefault();
		let link = e.currentTarget;
		this.scrollToTop();

		setTimeout(() => {
			this.clickLink(link);
		}, 0);
	}

	clickLink(link) {
		return this.navigationController.clickLink(link, this.onDocument);
	}

	scrollToTop() {
		if(!this.windowObject || typeof this.windowObject.scrollTo !== "function") {
			return;
		}

		this.windowObject.scrollTo({
			top: 0,
			left: 0,
			behavior: "smooth",
		});
	}
}
