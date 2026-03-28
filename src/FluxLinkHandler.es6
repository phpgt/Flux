export class FluxLinkHandler {
	constructor(navigationController, onDocument) {
		this.navigationController = navigationController;
		this.onDocument = onDocument;
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

		setTimeout(() => {
			this.clickLink(link);
		}, 0);
	}

	clickLink(link) {
		return this.navigationController.clickLink(link, this.onDocument);
	}
}
