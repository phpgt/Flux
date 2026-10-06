import {RuntimeConfig} from "./RuntimeConfig.es6";

/**
 * Legacy opt-in for applications constructing Flux directly from source.
 * The browser entry point applies FluxConfig.debug explicitly so re-exporting
 * this helper does not enable logging in the normal bundle.
 */
export class Debug {
	static {
		RuntimeConfig.debug = true;
	}
}
