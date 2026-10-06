import { Flux } from "./Flux.es6";
import { RuntimeConfig } from "./RuntimeConfig.es6";
export { Debug, Debug as FluxDebug } from "./Debug.es6";

// Re-exporting Debug evaluates its static initialiser too. Normal startup is quiet.
RuntimeConfig.configure({debug: false, ...globalThis.FluxConfig});
new Flux();
