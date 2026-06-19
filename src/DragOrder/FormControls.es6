/**
 * Finds and prepares the hidden form controls used by drag ordering.
 * Internally, DragOrder.Handler uses this to locate order, parent, and submit
 * inputs without mixing form lookup rules into drag movement code.
 */
export class FormControls {
	getForm(dragElement) {
		if(dragElement instanceof HTMLFormElement) {
			return dragElement;
		}

		let form = dragElement.querySelector("form");
		if(!(form instanceof HTMLFormElement)) {
			throw new TypeError("data-flux type \"drag-order\" requires a form element.");
		}

		return form;
	}

	getOrderInput(form) {
		let orderInput = form.querySelector("input[name='order']");
		if(!(orderInput instanceof HTMLInputElement)) {
			throw new TypeError("data-flux type \"drag-order\" requires an input named \"order\".");
		}

		return orderInput;
	}

	getSubmitButton(form) {
		let submitButton = form.querySelector("button[name='do']");
		if(!(submitButton instanceof HTMLButtonElement)) {
			throw new TypeError("data-flux type \"drag-order\" requires a button named \"do\".");
		}

		return submitButton;
	}

	getParentInput(form) {
		return form.querySelector("input[name='parent']");
	}

	getParentValue(container) {
		return container.dataset["fluxDragParent"] ?? "";
	}

	getItem(dragElement, form = dragElement instanceof HTMLFormElement ? dragElement : null) {
		let item = dragElement instanceof HTMLFormElement
			? form?.parentElement
			: dragElement;
		if(!item?.parentElement) {
			throw new TypeError("data-flux type \"drag-order\" requires the sortable element to be inside a container.");
		}

		return item;
	}

	hideControls(form, ...controls) {
		let hiddenElements = new Set();
		for(let control of controls) {
			if(!control) {
				continue;
			}

			hiddenElements.add(control);
			let label = control.closest("label");
			if(label && form.contains(label)) {
				hiddenElements.add(label);
			}
		}

		for(let element of hiddenElements) {
			element.hidden = true;
		}
	}
}
