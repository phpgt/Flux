import {DirectiveParser} from "../DirectiveParser.es6";
import {CSS_SOURCES} from "./SourceRegistry.es6";

/** Resolves connections once per DOM synchronisation, never during pointer or frame updates. */
export class ConnectionResolver {
	constructor(documentObject, logger) {
		this.document = documentObject;
		this.logger = logger;
		this.declarations = new WeakMap();
		this.selectors = new Map();
	}

	begin() { this.selectors.clear(); }

	resolve(element) {
		let value = element.dataset["flux"];
		let cached = this.declarations.get(element);
		if(!cached || cached.value !== value) {
			cached = {value, tokens: DirectiveParser.parse(value)};
			this.declarations.set(element, cached);
		}
		let sources = new Map();
		for(let {names, selector} of cached.tokens) {
			let destinations = selector ? this.find(selector) : [];
			for(let name of names) {
				if(!Object.hasOwn(CSS_SOURCES, name)) continue;
				if(!sources.has(name)) sources.set(name, new Set());
				for(let destination of destinations) sources.get(name).add(destination);
			}
		}
		return sources;
	}

	find(selector) {
		if(this.selectors.has(selector)) return this.selectors.get(selector);
		let elements = [];
		try { elements = this.document.querySelectorAll(selector); }
		catch(error) { this.logger.error(`Invalid Flux connection selector: ${selector}`, error); }
		this.selectors.set(selector, elements);
		return elements;
	}
}
