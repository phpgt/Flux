import {RuntimeConfig} from "./RuntimeConfig.es6";

/**
 * Enables Flux debug logging when imported before the main browser bundle.
 * This flips the shared runtime flag that Flux passes into each
 * handler during startup.
 */
export class Debug {
	static {
		RuntimeConfig.debug = true;
	}
}
