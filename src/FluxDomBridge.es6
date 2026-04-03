import {DomPath} from "./DomPath.es6";

export class FluxDomBridge {
	constructor(
		elementEventMapper,
		initFluxElement,
		domPath = DomPath,
		logger = console,
		debug = false,
	) {
		this.elementEventMapper = elementEventMapper;
		this.initFluxElement = initFluxElement;
		this.domPath = domPath;
		this.logger = logger;
		this.debug = debug;
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

		let mapObj = this.elementEventMapper.get(oldElement);
		for(let type of Object.keys(mapObj)) {
			for(let listener of mapObj[type]) {
				newElement.addEventListener(type, listener);
				if(this.debug) {
					this.logger.debug("Reattached listener to element:", newElement, listener);
				}
			}
		}
	}

	reattachFluxElements(oldElement, newElement) {
		if(!newElement) {
			return;
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
}
