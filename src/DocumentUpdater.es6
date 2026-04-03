import {DomPath} from "./DomPath.es6";

export class DocumentUpdater {
	constructor(
		updateTargetRegistry,
		focusStateManager,
		prepareElementUpdate = () => {},
		domPath = DomPath,
		logger = console,
		debug = false,
	) {
		this.updateTargetRegistry = updateTargetRegistry;
		this.focusStateManager = focusStateManager;
		this.prepareElementUpdate = prepareElementUpdate;
		this.domPath = domPath;
		this.logger = logger;
		this.debug = debug;
	}

	apply(newDocument, allowedTypes = undefined) {
		this.focusStateManager.markAutofocus(newDocument);
		let newActiveElement = this.focusStateManager.capturePendingActiveElement(newDocument);
		let allowedTypeSet = allowedTypes ? new Set(allowedTypes) : null;
		let updateTypeSnapshot = new Map();

		for(let type of this.updateTargetRegistry.getTypes()) {
			if(allowedTypeSet && !allowedTypeSet.has(type)) {
				continue;
			}

			updateTypeSnapshot.set(type, Array.from(this.updateTargetRegistry.getElements(type)));
		}

		for(let [type, elements] of updateTypeSnapshot) {
			elements.forEach(existingElement => {
				this.applyUpdateTarget(type, existingElement, newDocument);
			});
		}

		this.focusStateManager.restorePendingActiveElement(newActiveElement);
		if(this.debug && newActiveElement) {
			this.logger.debug("Focussed and blurred", newActiveElement);
		}
		this.focusStateManager.focusMarkedAutofocusElements();
	}

	applyUpdateTarget(type, existingElement, newDocument) {
		if(!existingElement) {
			return;
		}

		if(!existingElement.isConnected) {
			this.updateTargetRegistry.remove(type, existingElement);
			return;
		}

		let activeElementState = this.focusStateManager.captureElementState(existingElement);
		let xPath = this.domPath.getXPathForElement(existingElement, document);
		let newElement = this.domPath.findInDocument(newDocument, xPath);

		if(type === "outer" || type === "link-outer") {
			this.applyOuterUpdate(type, existingElement, newElement);
		}
		else if(type === "inner" || type === "link-inner") {
			this.applyInnerUpdate(existingElement, newElement);
		}
		else if(type === "attributes") {
			this.applyAttributesUpdate(existingElement, newElement);
		}

		if(activeElementState) {
			if(this.debug) {
				this.logger.debug("Active element", activeElementState.path);
			}
			this.focusStateManager.restoreElementState(activeElementState);
		}
	}

	applyOuterUpdate(type, existingElement, newElement) {
		this.updateTargetRegistry.replace(type, existingElement, newElement);
		if(!newElement) {
			return;
		}

		this.prepareElementUpdate(existingElement, newElement);
		existingElement.replaceWith(newElement);
	}

	applyInnerUpdate(existingElement, newElement) {
		this.prepareElementUpdate(existingElement, newElement);

		while(existingElement.firstChild) {
			existingElement.removeChild(existingElement.firstChild);
		}
		while(newElement && newElement.firstChild) {
			existingElement.appendChild(newElement.firstChild);
		}
	}

	applyAttributesUpdate(existingElement, newElement) {
		if(!newElement) {
			return;
		}

		Array.from(existingElement.attributes).forEach(attribute => {
			if(!newElement.hasAttribute(attribute.name)) {
				existingElement.removeAttribute(attribute.name);
			}
		});

		Array.from(newElement.attributes).forEach(attribute => {
			existingElement.setAttribute(attribute.name, attribute.value);
		});
	}
}
