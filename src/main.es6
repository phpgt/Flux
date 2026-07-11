import { Flux } from "./Flux.es6";
import { RuntimeConfig } from "./RuntimeConfig.es6";
export { Debug, Debug as FluxDebug } from "./Debug.es6";

RuntimeConfig.configure(globalThis.FluxConfig);
new Flux();
