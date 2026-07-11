const VALID_SCROLL_BEHAVIOURS = new Set(["auto", "smooth"]);

/**
 * Stores process-wide Flux settings shared by small helper modules.
 * Internally, this keeps settings available without making helpers import
 * the main Flux class.
 */
export const RuntimeConfig = {
	debug: false,
	scrollToTopBehavior: "auto",
	restoreScrollBehavior: "auto",

	configure(config = {}) {
		if(!config || typeof config !== "object") {
			return;
		}

		if("debug" in config) {
			this.debug = Boolean(config.debug);
		}

		if(VALID_SCROLL_BEHAVIOURS.has(config.scrollBehavior)) {
			this.scrollToTopBehavior = config.scrollBehavior;
			this.restoreScrollBehavior = config.scrollBehavior;
		}

		if(VALID_SCROLL_BEHAVIOURS.has(config.scrollToTopBehavior)) {
			this.scrollToTopBehavior = config.scrollToTopBehavior;
		}

		if(VALID_SCROLL_BEHAVIOURS.has(config.restoreScrollBehavior)) {
			this.restoreScrollBehavior = config.restoreScrollBehavior;
		}
	},
};
