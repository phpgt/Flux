export class FluxResponseHandler {
	static DEFAULT_UPDATE_TYPES = Object.freeze([
		"outer",
		"inner",
		"attributes",
	]);

	static LINK_UPDATE_TYPES = Object.freeze([
		...FluxResponseHandler.DEFAULT_UPDATE_TYPES,
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
	) {
		this.documentUpdater = documentUpdater;
		this.logger = logger;
		this.debug = debug;
		this.scheduler = scheduler;
		this.reload = reload;
		this.alerter = alerter;
		this.windowObject = windowObject;
		this.animationFrame = animationFrame;
	}

	handleDocument = (newDocument) => {
		if(!this.isProcessableDocument(newDocument)) {
			return;
		}

		this.scheduler(() => {
			this.documentUpdater.apply(newDocument, FluxResponseHandler.DEFAULT_UPDATE_TYPES);
		}, 0);
	}

	handleLinkDocument = (newDocument) => {
		if(!this.isProcessableDocument(newDocument)) {
			return;
		}

		this.scheduler(() => {
			this.documentUpdater.apply(newDocument, FluxResponseHandler.LINK_UPDATE_TYPES);
			this.scrollToTopAfterPaint();
		}, 0);
	}

	handleLiveDocument = (newDocument, allowedTargetKeys = undefined) => {
		if(!this.isProcessableDocument(newDocument)) {
			return;
		}

		this.scheduler(() => {
			this.documentUpdater.apply(newDocument, FluxResponseHandler.LIVE_UPDATE_TYPES, allowedTargetKeys);
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

	scrollToTopImmediately() {
		if(!this.windowObject || typeof this.windowObject.scrollTo !== "function") {
			return;
		}

		this.windowObject.scrollTo({
			top: 0,
			left: 0,
			behavior: "auto",
		});
	}

	scrollToTopAfterPaint() {
		if(typeof this.animationFrame !== "function") {
			this.scheduler(() => {
				this.scrollToTopImmediately();
			}, 0);
			return;
		}

		// Wait until the updated DOM has been painted before forcing the final
		// scroll position, otherwise the browser can preserve an in-flight
		// scroll animation against the new layout.
		this.animationFrame(() => {
			this.animationFrame(() => {
				this.scrollToTopImmediately();
			});
		});
	}
}
