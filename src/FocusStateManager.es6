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

		let elementState = {
			path: this.domPath.getXPathForElement(activeElement),
			selection,
		};

		if(activeElement instanceof HTMLInputElement) {
			if(activeElement.type !== "file") {
				elementState.value = activeElement.value;
			}

			if(activeElement.type === "checkbox" || activeElement.type === "radio") {
				elementState.checked = activeElement.checked;
			}
		}
		else if(activeElement instanceof HTMLTextAreaElement) {
			elementState.value = activeElement.value;
		}
		else if(activeElement instanceof HTMLSelectElement) {
			elementState.value = activeElement.value;
			if(activeElement.multiple) {
				elementState.selectedValues = Array.from(activeElement.options)
					.filter(option => option.selected)
					.map(option => option.value);
			}
		}

		return elementState;
	}

	restoreElementState(elementState) {
		if(!elementState) {
			return;
		}

		let elementToActivate = this.domPath.findInDocument(document, elementState.path);
		if(!elementToActivate) {
			return;
		}

		if("selectedValues" in elementState && elementToActivate instanceof HTMLSelectElement) {
			let selectedValueSet = new Set(elementState.selectedValues);
			Array.from(elementToActivate.options).forEach(option => {
				option.selected = selectedValueSet.has(option.value);
			});
		}
		else if("value" in elementState && "value" in elementToActivate) {
			elementToActivate.value = elementState.value;
		}

		if("checked" in elementState && elementToActivate instanceof HTMLInputElement) {
			elementToActivate.checked = elementState.checked;
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
	}

	focusMarkedAutofocusElements() {
		document.querySelectorAll("[data-flux-autofocus]").forEach(autofocusElement => {
			autofocusElement.focus();
		});
	}

	storeFormState(form, activeElement) {
		let formPath = this.domPath.getXPathForElement(form);
		if(formPath) {
			form.dataset["fluxPath"] = formPath;
		}

		let activePath = this.domPath.getXPathForElement(
			activeElement,
			form,
		);
		if(activePath) {
			form.dataset["fluxActive"] = activePath;
		}
		else {
			delete form.dataset["fluxActive"];
		}
	}
}
