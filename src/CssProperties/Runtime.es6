import {ConnectionResolver} from "./ConnectionResolver.es6";
import {DomPath} from "../DomPath.es6";
import {FrameScheduler} from "./FrameScheduler.es6";
import {PropertyWriter} from "./PropertyWriter.es6";
import {ObserverHub} from "./ObserverHub.es6";
import {Binding} from "./Binding.es6";
import {CSS_SOURCES} from "./SourceRegistry.es6";

const CONTROL_EVENTS = ["input", "change", "focusin", "reset", "invalid"];
const MEDIA_EVENTS = ["load", "loadeddata", "timeupdate", "play", "pause", "seeked", "error", "emptied"];


/** Coordinates CSS bindings as Flux and other scripts change the document. */
export class CssPropertyRuntime {
	constructor(documentObject = document, logger = console) {
		this.document = documentObject;
		this.window = documentObject.defaultView;
		this.logger = logger;
		this.scheduler = new FrameScheduler(this.window, logger);
		this.writer = new PropertyWriter(this.scheduler, logger);
		this.bindings = new Map();
		this.connections = new ConnectionResolver(documentObject, logger);
		this.history = new WeakMap();
		this.pointer = {x: 0, y: 0};
		this.listeners = [];
		this.pointerAttached = false;
		this.intersections = this.window.IntersectionObserver
			? new ObserverHub(callback => new this.window.IntersectionObserver(callback)) : null;
		this.resizes = this.window.ResizeObserver
			? new ObserverHub(callback => new this.window.ResizeObserver(callback)) : null;
		this.mutations = new this.window.MutationObserver(records => {
			// CSS writes change style attributes. They must not feed back into binding discovery.
			if(records.some(record => record.type !== "attributes" || record.attributeName !== "style")) this.synchronise();
		});
		this.mutations.observe(documentObject.documentElement, {
			subtree: true, childList: true, characterData: true, attributes: true,
		});
		for(let name of [...CONTROL_EVENTS, ...MEDIA_EVENTS]) this.listen(documentObject, name, this.onEvent, true);
		this.listen(documentObject, "visibilitychange", this.onVisibility);
		this.listen(documentObject, "flux:before-render", this.beforeRender);
		this.listen(documentObject, "flux:after-render", this.synchronise);
		this.listen(this.window, "resize", this.refreshGeometry);
		this.listen(documentObject, "scroll", this.refreshPointers, true);
		this.document.fonts?.ready.then(() => { if(!this.disposed) this.refreshAll(); });
		if(this.document.fonts) this.listen(this.document.fonts, "loadingdone", this.refreshAll);
	}

	listen(target, name, callback, capture = false) {
		target.addEventListener(name, callback, {passive: true, capture});
		this.listeners.push(() => target.removeEventListener(name, callback, capture));
	}

	observeVisibility(element, callback) {
		if(element === this.document.documentElement || !this.intersections) {
			callback(true);
			return () => {};
		}
		return this.intersections.observe(element, entry => callback(entry.isIntersecting && entry.intersectionRatio > 0));
	}

	observeResize(element, callback) { return this.resizes?.observe(element, callback) ?? (() => {}); }

	synchronise = () => {
		if(this.disposed) return;
		this.connections.begin();
		let elements = new Set(this.document.querySelectorAll("[data-flux]"));
		for(let [element, bindings] of this.bindings) {
			if(elements.has(element)) continue;
			for(let binding of bindings.values()) binding.dispose();
			this.bindings.delete(element);
		}
		for(let element of elements) this.syncElement(element);
		this.syncPointerListener();
	}

	syncElement(element) {
		if(!element.isConnected || element.ownerDocument !== this.document) return;
		let wanted;
		try { wanted = this.connections.resolve(element); }
		catch(error) { this.logger.error("Invalid Flux CSS declaration:", error); return; }
		let bindings = this.bindings.get(element) ?? new Map();
		for(let [name, binding] of bindings) {
			if(wanted.has(name)) continue;
			binding.dispose();
			bindings.delete(name);
		}
		for(let [name, destinations] of wanted) {
			let binding = bindings.get(name);
			if(!binding) {
				binding = new Binding(this, element, name, CSS_SOURCES[name], this.history.get(element)?.get(name));
				bindings.set(name, binding);
			}
			binding.connect(destinations);
			binding.requestRefresh();
		}
		if(bindings.size) this.bindings.set(element, bindings);
		else this.bindings.delete(element);
		this.history.delete(element);
	}

	forEach(callback) {
		for(let bindings of this.bindings.values()) for(let binding of bindings.values()) callback(binding);
	}

	refreshAll = () => this.forEach(binding => binding.requestRefresh());
	refreshGeometry = () => this.forEach(binding => { if(!binding.definition.always) binding.requestRefresh(); });
	refreshPointers = () => this.forEach(binding => { if(binding.definition.pointer && binding.active) binding.requestRefresh(); });

	onVisibility = () => {
		if(this.document.hidden) this.forEach(binding => binding.source.stop?.());
		else this.refreshAll();
	}

	onPointer = event => {
		if(this.pointer.x === event.clientX && this.pointer.y === event.clientY) return;
		this.pointer = {x: event.clientX, y: event.clientY};
		this.refreshPointers();
	}

	syncPointerListener() {
		let needed = false;
		this.forEach(binding => { if(binding.definition.pointer) needed = true; });
		if(needed === this.pointerAttached) return;
		this.pointerAttached = needed;
		if(needed) this.window.addEventListener("pointermove", this.onPointer, {passive: true});
		else this.window.removeEventListener("pointermove", this.onPointer);
	}

	onEvent = event => {
		// A reset can be cancelled by a later listener. Inspect it after dispatch finishes.
		if(event.type === "reset") {
			queueMicrotask(() => {
				if(!event.defaultPrevented && !this.disposed) this.forEach(binding => binding.source.onEvent?.(event));
			});
			return;
		}
		this.forEach(binding => binding.source.onEvent?.(event));
	}

	beforeRender = event => {
		let {updates, navigation = false} = event.detail;
		for(let update of updates) {
			if(navigation) {
				this.forEach(binding => {
					if(update.existingElement.contains(binding.element)) {
						for(let key of Object.keys(binding.state)) delete binding.state[key];
					}
				});
				continue;
			}
			if(!update.newElement || update.mode === "attributes") continue;
			this.forEach(binding => this.preserveHistory(binding, update));
		}
	}

	preserveHistory(binding, update) {
		let {element, name, state} = binding;
		if(!update.existingElement.contains(element)) return;
		if(update.mode === "inner" && element === update.existingElement) return;
		let replacement;
		if(element === update.existingElement) replacement = update.newElement;
		else if(element.id) {
			replacement = [...update.newElement.querySelectorAll("[id]")].find(candidate => candidate.id === element.id);
		}
		else {
			let path = DomPath.getXPathForElement(element, update.existingElement);
			replacement = DomPath.findInContext(update.newElement, path);
		}
		if(!replacement || replacement.tagName !== element.tagName) return;
		let history = this.history.get(replacement) ?? new Map();
		history.set(name, {...state});
		this.history.set(replacement, history);
	}

	dispose() {
		this.disposed = true;
		this.mutations.disconnect();
		this.forEach(binding => binding.dispose());
		this.bindings.clear();
		this.connections.begin();
		this.window.removeEventListener("pointermove", this.onPointer);
		for(let remove of this.listeners) remove();
		this.intersections?.dispose();
		this.resizes?.dispose();
		this.writer.dispose();
		this.scheduler.dispose();
	}
}
