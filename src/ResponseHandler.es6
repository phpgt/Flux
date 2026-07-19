import {RuntimeConfig} from "./RuntimeConfig.es6";
import {DomPath} from "./DomPath.es6";

/**
 * Decides how a fetched HTML document should update the current page.
 * It validates responses, schedules DOM updates, and applies the right update
 * types for forms, links, and live polling.
 */
export class ResponseHandler {
	static DEFAULT_UPDATE_TYPES = Object.freeze([
		"outer",
		"inner",
		"attributes",
		"live-outer",
		"live-inner",
	]);

	static LINK_UPDATE_TYPES = Object.freeze([
		...ResponseHandler.DEFAULT_UPDATE_TYPES,
		"link-outer",
		"link-inner",
	]);

	static LIVE_UPDATE_TYPES = Object.freeze([
		"live-outer",
		"live-inner",
	]);

	constructor(
		documentUpdater,
		logger = console,
		debug = false,
		scheduler = globalThis.setTimeout.bind(globalThis),
		reload = () => location.reload(),
		alerter = globalThis.alert?.bind(globalThis),
		windowObject = globalThis.window,
		animationFrame = globalThis.requestAnimationFrame?.bind(globalThis),
		onLiveDocumentUsed = () => {},
	) {
		this.documentUpdater = documentUpdater;
		this.logger = logger;
		this.debug = debug;
		this.scheduler = scheduler;
		this.reload = reload;
		this.alerter = alerter;
		this.windowObject = windowObject;
		this.animationFrame = animationFrame;
		this.onLiveDocumentUsed = onLiveDocumentUsed;
	}

	handleDocument = (newDocument, requestElementState = null) => {
		if(!this.isProcessableDocument(newDocument)) {
			return;
		}

		this.scheduler(() => {
			this.documentUpdater.apply(
				newDocument,
				ResponseHandler.DEFAULT_UPDATE_TYPES,
				undefined,
				requestElementState,
			);
			this.onLiveDocumentUsed();
		}, 0);
	}

	handleLinkDocument = (newDocument, requestElementState = null) => {
		if(!this.isProcessableDocument(newDocument)) {
			return;
		}

		let scrollState = this.isScrollState(requestElementState) ? requestElementState : null;
		let elementState = scrollState ? null : requestElementState;
		this.scheduler(() => {
			this.documentUpdater.apply(
				newDocument,
				ResponseHandler.LINK_UPDATE_TYPES,
				undefined,
				elementState,
			);
			this.onLiveDocumentUsed();
			this.scrollToTopAfterPaint(scrollState);
		}, 0);
	}

	handleLiveDocument = (newDocument, allowedTargetKeys = undefined) => {
		if(!this.isProcessableDocument(newDocument)) {
			return;
		}

		this.scheduler(() => {
			this.documentUpdater.apply(newDocument, ResponseHandler.LIVE_UPDATE_TYPES, allowedTargetKeys);
		}, 0);
	}

	isProcessableDocument(newDocument) {
		if(newDocument.head.children.length === 0) {
			if(this.debug && this.alerter) {
				this.alerter("Error processing new document!");
			}

			this.logger.error("Error processing new document!");
			this.reload();
			return false;
		}

		return true;
	}

	isScrollState(state) {
		return !!state
			&& typeof state === "object"
			&& (Number.isFinite(state.fluxScrollY) || state.action === "clickLink");
	}

	scrollToTopImmediately(scrollState = null) {
		let scrollTarget = this.getScrollTarget(scrollState);
		let behavior = scrollState?.fluxScrollBehavior ?? RuntimeConfig.scrollToTopBehavior;
		if(scrollTarget?.element) {
			this.scrollElementTo(scrollTarget.element, 0, 0, behavior);
			return;
		}

		if(!this.windowObject || typeof this.windowObject.scrollTo !== "function") {
			return;
		}

		this.windowObject.scrollTo({
			top: 0,
			left: 0,
			behavior,
		});
	}

	scrollElementTo(element, top, left, behavior) {
		if(typeof element.scrollTo === "function") {
			element.scrollTo({
				top,
				left,
				behavior,
			});
			return;
		}

		element.scrollTop = top;
		element.scrollLeft = left;
	}

	getScrollTarget(scrollState) {
		if(!scrollState?.fluxScrollPath) {
			return {element: null};
		}

		return {
			element: DomPath.findInDocument(globalThis.document, scrollState.fluxScrollPath),
		};
	}

	scrollToTopAfterPaint(scrollState = null) {
		if(typeof this.animationFrame !== "function") {
			this.scheduler(() => {
				this.scrollToTopImmediately(scrollState);
			}, 0);
			return;
		}

		// Wait until the updated DOM has been painted before forcing the final
		// scroll position, otherwise the browser can preserve an in-flight
		// scroll animation against the new layout.
		this.animationFrame(() => {
			this.animationFrame(() => {
				this.scrollToTopImmediately(scrollState);
			});
		});
	}
}
