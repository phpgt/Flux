import {DomPath} from "./DomPath.es6";

export class FocusStateManager {
	constructor(domPath = DomPath) {
		this.domPath = domPath;
	}

	markAutofocus(newDocument) {
		let autofocusElement = newDocument.querySelector("[autofocus]");
		if(autofocusElement) {
			autofocusElement.dataset["fluxAutofocus"] = "";
		}
	}

	capturePendingActiveElement(newDocument) {
		let activeContainer = document.querySelector("[data-flux-active]");
		if(!activeContainer) {
			return null;
		}

		let activeContainerPath = activeContainer.dataset["fluxPath"];
		let newActiveContainer = this.domPath.findInDocument(newDocument, activeContainerPath);
		if(!newActiveContainer) {
			return null;
		}

		let activeElementPath = activeContainer.dataset["fluxActive"];
		return this.domPath.findInContext(newActiveContainer, activeElementPath);
	}

	captureElementState(existingElement) {
		if(!existingElement.contains(document.activeElement)) {
			return null;
		}

		let activeElement = document.activeElement;
		let selection = null;
		if(activeElement.selectionStart >= 0 && activeElement.selectionEnd >= 0) {
			selection = [activeElement.selectionStart, activeElement.selectionEnd];
		}

		return {
			path: this.domPath.getXPathForElement(activeElement),
			selection,
		};
	}

	restoreElementState(elementState) {
		if(!elementState) {
			return;
		}

		let elementToActivate = this.domPath.findInDocument(document, elementState.path);
		if(!elementToActivate) {
			return;
		}

		elementToActivate.focus();
		if(elementState.selection && elementToActivate.setSelectionRange) {
			elementToActivate.setSelectionRange(
				elementState.selection[0],
				elementState.selection[1],
			);
		}
	}

	restorePendingActiveElement(newActiveElement) {
		if(!newActiveElement) {
			return;
		}

		newActiveElement.focus();
		newActiveElement.blur();
	}

	focusMarkedAutofocusElements() {
		document.querySelectorAll("[data-flux-autofocus]").forEach(autofocusElement => {
			autofocusElement.focus();
		});
	}

	storeFormState(form, activeElement) {
		form.dataset["fluxPath"] = this.domPath.getXPathForElement(form);
		form.dataset["fluxActive"] = this.domPath.getXPathForElement(
			activeElement,
			form,
		);
	}
}
