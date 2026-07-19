import {DomPath} from "./DomPath.es6";

/**
 * Applies parsed response documents to registered update targets.
 * It performs outer, inner, and attribute-only updates while asking
 * FocusStateManager and DomBridge to preserve the user interaction state.
 */
export class DocumentUpdater {
	constructor(
		updateTargetRegistry,
		focusStateManager,
		prepareElementUpdate = () => {},
		completeElementUpdate = () => {},
		domPath = DomPath,
		logger = console,
		debug = false,
	) {
		this.updateTargetRegistry = updateTargetRegistry;
		this.focusStateManager = focusStateManager;
		this.prepareElementUpdate = prepareElementUpdate;
		this.completeElementUpdate = completeElementUpdate;
		this.domPath = domPath;
		this.logger = logger;
		this.debug = debug;
	}

	apply(newDocument, allowedTypes = undefined, allowedTargetKeys = undefined, requestElementState = null) {
		this.focusStateManager.markAutofocus(newDocument);
		let newActiveElement = this.focusStateManager.capturePendingActiveElement(newDocument);
		let allowedTypeSet = allowedTypes ? new Set(allowedTypes) : null;
		let allowedTargetKeySet = allowedTargetKeys ? new Set(allowedTargetKeys) : null;
		let updateTypeSnapshot = new Map();
		let updates = [];

		for(let type of this.updateTargetRegistry.getTypes()) {
			if(allowedTypeSet && !allowedTypeSet.has(type)) {
				continue;
			}

			updateTypeSnapshot.set(type, Array.from(this.updateTargetRegistry.getElements(type)));
		}

		for(let [type, elements] of updateTypeSnapshot) {
			elements.forEach(existingElement => {
				if(allowedTargetKeySet) {
					let targetKey = this.getTargetKey(type, existingElement);
					if(!allowedTargetKeySet.has(targetKey)) {
						return;
					}
				}

				let update = this.createUpdateTarget(type, existingElement, newDocument);
				if(update) {
					updates.push(update);
				}
			});
		}

		updates = this.withoutTargetsDisconnectedByOuterUpdates(updates);
		if(updates.length > 0) {
			this.dispatchFluxEvent("flux:before-render", {updates});
			updates.forEach(update => this.applyUpdate(update, requestElementState));
			this.dispatchFluxEvent("flux:after-render", {updates});
		}

		this.focusStateManager.restorePendingActiveElement(newActiveElement);
		if(this.debug && newActiveElement) {
			this.logger.debug("Focussed and blurred", newActiveElement);
		}
		this.focusStateManager.focusMarkedAutofocusElements();
		return updates;
	}

	applyUpdateTarget(type, existingElement, newDocument, requestElementState = null) {
		let update = this.createUpdateTarget(type, existingElement, newDocument);
		if(!update) {
			return null;
		}

		this.dispatchFluxEvent("flux:before-render", {updates: [update]});
		this.applyUpdate(update, requestElementState);
		this.dispatchFluxEvent("flux:after-render", {updates: [update]});
		return update;
	}

	createUpdateTarget(type, existingElement, newDocument) {
		if(!existingElement) {
			return null;
		}

		if(!existingElement.isConnected) {
			this.updateTargetRegistry.remove(type, existingElement);
			return null;
		}

		let newElement = this.findMatchingElement(existingElement, newDocument);

		return {
			type,
			mode: this.getUpdateMode(type),
			existingElement,
			newElement,
		};
	}

	applyUpdate(update, requestElementState = null) {
		let {type, existingElement, newElement} = update;
		let activeElementState = this.focusStateManager.captureElementState(existingElement);
		if(activeElementState && requestElementState) {
			activeElementState = this.focusStateManager.withoutUnchangedRequestValues(
				activeElementState,
				requestElementState,
			);
		}

		if(type === "outer" || type === "link-outer" || type === "live-outer") {
			update.element = this.applyOuterUpdate(type, existingElement, newElement);
		}
		else if(type === "inner" || type === "link-inner" || type === "live-inner") {
			update.element = this.applyInnerUpdate(existingElement, newElement);
		}
		else if(type === "attributes") {
			update.element = this.applyAttributesUpdate(existingElement, newElement);
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
			return null;
		}

		this.prepareElementUpdate(existingElement, newElement);
		existingElement.replaceWith(newElement);
		this.completeElementUpdate(newElement);
		return newElement;
	}

	applyInnerUpdate(existingElement, newElement) {
		this.prepareElementUpdate(existingElement, newElement);

		while(existingElement.firstChild) {
			existingElement.removeChild(existingElement.firstChild);
		}
		while(newElement && newElement.firstChild) {
			existingElement.appendChild(newElement.firstChild);
		}
		this.completeElementUpdate(existingElement);
		return existingElement;
	}

	applyAttributesUpdate(existingElement, newElement) {
		if(!newElement) {
			return null;
		}

		Array.from(existingElement.attributes).forEach(attribute => {
			if(!newElement.hasAttribute(attribute.name)) {
				existingElement.removeAttribute(attribute.name);
			}
		});

		Array.from(newElement.attributes).forEach(attribute => {
			existingElement.setAttribute(attribute.name, attribute.value);
		});
		return existingElement;
	}

	findMatchingElement(existingElement, newDocument) {
		if(existingElement.id) {
			return newDocument.getElementById(existingElement.id);
		}

		let xPath = this.domPath.getXPathForElement(existingElement, document);
		return this.domPath.findInDocument(newDocument, xPath);
	}

	getTargetKey(type, element) {
		if(element?.id) {
			return `${type}:#${element.id}`;
		}

		return `${type}:${this.domPath.getXPathForElement(element, document)}`;
	}

	getUpdateMode(type) {
		if(type === "outer" || type === "link-outer" || type === "live-outer") {
			return "outer";
		}

		if(type === "inner" || type === "link-inner" || type === "live-inner") {
			return "inner";
		}

		if(type === "attributes") {
			return "attributes";
		}

		return type;
	}

	withoutTargetsDisconnectedByOuterUpdates(updates) {
		let outerUpdates = updates.filter(update => update.mode === "outer");

		return updates.filter(update => {
			let containingOuterUpdate = outerUpdates.find(outerUpdate =>
				outerUpdate.existingElement !== update.existingElement
				&& outerUpdate.existingElement.contains(update.existingElement)
			);

			if(containingOuterUpdate) {
				this.updateTargetRegistry.remove(update.type, update.existingElement);
				return false;
			}

			return true;
		});
	}

	dispatchFluxEvent(name, detail) {
		globalThis.document?.dispatchEvent?.(new CustomEvent(name, {
			bubbles: true,
			detail,
		}));
	}
}
