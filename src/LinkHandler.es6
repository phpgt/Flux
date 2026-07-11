import {DomPath} from "./DomPath.es6";

/**
 * Wires data-flux link elements into background navigation.
 * It captures clicks, applies rate limiting, and delegates the fetch work to
 * NavigationController.
 */
export class LinkHandler {
	constructor(
		navigationController,
		onDocument,
		windowObject = globalThis.window,
		now = () => Date.now(),
		domPath = DomPath,
	) {
		this.navigationController = navigationController;
		this.onDocument = onDocument;
		this.windowObject = windowObject;
		this.now = now;
		this.domPath = domPath;
		this.rateLimitState = new Map();
	}

	initAutoLink = (fluxElement) => {
		if(!(fluxElement instanceof HTMLAnchorElement)) {
			throw new TypeError("data-flux type \"link\" must be applied to an anchor element.");
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
		if(this.isRateLimited(link)) {
			return Promise.resolve(null);
		}

		return this.navigationController.clickLink(link, this.onDocument);
	}

	isRateLimited(link) {
		let rate = Number.parseFloat(link.dataset["fluxRate"] ?? "");
		if(!Number.isFinite(rate) || rate <= 0) {
			return false;
		}

		let now = this.now();
		let rateLimitKey = this.getRateLimitKey(link);
		let lastClickedAt = this.rateLimitState.get(rateLimitKey) ?? -Infinity;
		if(now - lastClickedAt < rate * 1000) {
			return true;
		}

		this.rateLimitState.set(rateLimitKey, now);
		return false;
	}

	getRateLimitKey(link) {
		let path = this.domPath.getXPathForElement(link, document);
		return `link:${path}`;
	}
}
