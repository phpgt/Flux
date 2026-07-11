import {DomPath} from "./DomPath.es6";

/**
 * Prepares replacement DOM nodes before they are inserted into the page.
 * It reattaches event listeners, reinitialises nested Flux elements,
 * and carries private Flux state across matching old and new nodes.
 */
export class DomBridge {
	constructor(
		elementEventMapper,
		initFluxElement,
		domPath = DomPath,
		logger = console,
		debug = false,
		documentObject = globalThis.document,
	) {
		this.elementEventMapper = elementEventMapper;
		this.initFluxElement = initFluxElement;
		this.domPath = domPath;
		this.logger = logger;
		this.debug = debug;
		this.documentObject = documentObject;
	}

	prepareElementUpdate = (oldElement, newElement) => {
		if(!newElement) {
			return;
		}

		this.reattachEventListeners(oldElement, newElement);
		this.reattachFluxElements(oldElement, newElement);
	}

	reattachEventListeners(oldElement, newElement) {
		if(!newElement) {
			return;
		}

		this.reattachElementListeners(oldElement, newElement);

		oldElement.querySelectorAll("*").forEach(oldChild => {
			let xPath = this.domPath.getXPathForElement(oldChild, oldElement);
			let newChild = this.domPath.findInContext(newElement, xPath);

			if(newChild instanceof Element) {
				this.reattachElementListeners(oldChild, newChild);
			}
		});
	}

	reattachElementListeners(oldElement, newElement) {
		if(!this.elementEventMapper.has(oldElement)) {
			return;
		}

		for(let record of this.elementEventMapper.get(oldElement)) {
			newElement.addEventListener(record.type, record.listener, record.options);
			if(this.debug) {
				this.logger.debug("Reattached listener to element:", newElement, record.listener);
			}
		}
	}

	reattachFluxElements(oldElement, newElement) {
		if(!newElement) {
			return;
		}

		if(newElement.matches?.("[data-flux]")) {
			this.initFluxElement(newElement);
		}

		newElement.querySelectorAll("[data-flux]").forEach(this.initFluxElement);
		oldElement.querySelectorAll("[data-flux-obj]").forEach(fluxElement => {
			let xPath = this.domPath.getXPathForElement(fluxElement, oldElement);
			let newFluxElement = this.domPath.findInContext(newElement, xPath);
			if(newFluxElement) {
				newFluxElement.fluxObj = fluxElement.fluxObj;
				newFluxElement.dataset["fluxObj"] = "";
			}
		});
	}

	reviveScripts(newElement) {
		let scripts = newElement.matches?.("script")
			? [newElement, ...newElement.querySelectorAll("script")]
			: newElement.querySelectorAll("script");

		scripts.forEach(script => {
			let freshScript = this.documentObject.createElement("script");
			Array.from(script.attributes).forEach(attribute => {
				freshScript.setAttribute(attribute.name, attribute.value);
			});
			freshScript.textContent = script.textContent;
			script.replaceWith(freshScript);
		});
	}
}
