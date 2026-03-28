const DIRECTIVE_DEFINITIONS = Object.freeze({
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
	"update-attributes": {
		handler: "updateAttributes",
		description: "Register the element for attribute-only updates on refresh.",
	},
	"submit": {
		handler: "autoSubmit",
		description: "Submit the containing form in the background.",
	},
	"link": {
		handler: "autoLink",
		description: "Follow the link in the background.",
	},
});

export class FluxDirectiveRegistry {
	static DEFINITIONS = DIRECTIVE_DEFINITIONS;

	constructor(handlers) {
		this.handlers = handlers;
	}

	initElement(fluxElement) {
		let fluxType = fluxElement.dataset["flux"];
		let definition = FluxDirectiveRegistry.DEFINITIONS[fluxType];
		if(!definition) {
			throw new TypeError(`Unknown flux element type: ${fluxType}`);
		}

		let handler = this.handlers[definition.handler];
		if(typeof handler !== "function") {
			throw new TypeError(`Missing Flux directive handler: ${definition.handler}`);
		}

		handler(fluxElement);
	}

	getDefinitions() {
		return FluxDirectiveRegistry.DEFINITIONS;
	}
}
