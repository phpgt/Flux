import {DirectiveParser} from "./DirectiveParser.es6";
import {CSS_SOURCES} from "./CssProperties/SourceRegistry.es6";

const DIRECTIVE_DEFINITIONS = Object.freeze({
	...Object.fromEntries(Object.keys(CSS_SOURCES).map(name => [name, {
		handler: "cssProperties", description: `Expose ${name} CSS properties.`,
	}])),
	"auto": {handler: "autoContainer", description: "Enable automatic Flux interactions."},
	"": {
		handler: "autoContainer",
		description: "Initialise a container element for automatic Flux interactions.",
	},
	"autosave": {
		handler: "autoSave",
		description: "Enable automatic background form submission on change.",
	},
	"update": {
		handler: "updateOuter",
		description: "Register the element for outerHTML replacement on updates.",
	},
	"update-outer": {
		handler: "updateOuter",
		description: "Register the element for outerHTML replacement on updates.",
	},
	"update-inner": {
		handler: "updateInner",
		description: "Register the element for innerHTML replacement on updates.",
	},
	"update-link": {
		handler: "updateLinkOuter",
		description: "Register the element for outerHTML replacement on link updates only.",
	},
	"update-link-inner": {
		handler: "updateLinkInner",
		description: "Register the element for innerHTML replacement on link updates only.",
	},
	"live": {
		handler: "liveOuter",
		description: "Register the element for recurring outerHTML replacement using background polling.",
	},
	"live-outer": {
		handler: "liveOuter",
		description: "Register the element for recurring outerHTML replacement using background polling.",
	},
	"live-inner": {
		handler: "liveInner",
		description: "Register the element for recurring innerHTML replacement using background polling.",
	},
	"update-attributes": {
		handler: "updateAttributes",
		description: "Register the element for attribute-only updates on refresh.",
	},
	"submit": {
		handler: "autoSubmit",
		description: "Submit the containing form in the background.",
	},
	"autocomplete": {
		handler: "autocomplete",
		description: "Fetch form results in the background as the user types.",
	},
	"autocomplete-results": {
		handler: "autocompleteResults",
		description: "Mark the response element used by autocomplete forms.",
	},
	"link": {
		handler: "autoLink",
		description: "Follow the link in the background.",
	},
	"drag-order": {
		handler: "dragOrder",
		description: "Turn a server-ordered form into a draggable ordering control.",
	},
});

/**
 * Maps data-flux attribute values to their internal handler functions.
 * Flux asks this registry to initialise each element according to
 * the directive declared in its data-flux value.
 */
export class DirectiveRegistry {
	static DEFINITIONS = DIRECTIVE_DEFINITIONS;

	constructor(handlers) {
		this.handlers = handlers;
	}

	initElement(fluxElement) {
		let declarations = DirectiveParser.parse(fluxElement.dataset["flux"]);
		if(!declarations.length) declarations = [{names: [""], selector: null}];
		let invoked = new Set();
		let errors = [];
		for(let declaration of declarations) {
			for(let name of declaration.names) {
				try {
					if(declaration.selector && !Object.hasOwn(CSS_SOURCES, name)) {
						throw new TypeError(`Only CSS sources can be connected: ${name}`);
					}
					if((name === "" || name === "auto") && fluxElement instanceof HTMLButtonElement) name = "submit";
					let definition = Object.hasOwn(DirectiveRegistry.DEFINITIONS, name) ? DirectiveRegistry.DEFINITIONS[name] : null;
					if(!definition) throw new TypeError(`Unknown flux element type: ${name}`);
					if(invoked.has(definition.handler)) continue;
					let handler = this.handlers[definition.handler];
					if(typeof handler !== "function") throw new TypeError(`Missing Flux directive handler: ${definition.handler}`);
					handler(fluxElement);
					invoked.add(definition.handler);
				}
				catch(error) { errors.push(error); }
			}
		}
		if(errors.length) throw errors[0];
	}

	getDefinitions() {
		return DirectiveRegistry.DEFINITIONS;
	}
}
