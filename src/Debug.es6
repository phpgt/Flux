import {RuntimeConfig} from "./RuntimeConfig.es6";

/** Explicit debug helper; exporting the class has no startup side effects. */
export class Debug {
	static enable() {
		RuntimeConfig.debug = true;
	}
}
