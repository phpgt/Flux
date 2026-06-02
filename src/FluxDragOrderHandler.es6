export class FluxDragOrderHandler {
	constructor(
		formHandler,
		documentObject = globalThis.document,
		logger = console,
		debug = false,
	) {
		this.formHandler = formHandler;
		this.documentObject = documentObject;
		this.logger = logger;
		this.debug = debug;
		this.containerState = new WeakSet();
		this.dragState = null;
		this.activePointerId = null;
	}

	initDragOrder = (form) => {
		if(!(form instanceof HTMLFormElement)) {
			throw new TypeError("data-flux type \"drag-order\" must be applied to a form element.");
		}

		if(form.dataset["fluxDragOrderInit"] !== undefined) {
			return;
		}

		let orderInput = this.getOrderInput(form);
		let submitButton = this.getSubmitButton(form);
		let item = this.getItem(form);
		let container = item.parentElement;

		form.dataset["fluxDragOrderInit"] = "";
		this.hideFormControls(form, orderInput, submitButton);

		let handle = this.documentObject.createElement("span");
		handle.className = "drag-handle";
		handle.draggable = true;
		handle.role = "button";
		handle.tabIndex = 0;
		handle.ariaLabel = "Drag to reorder";
		handle.textContent = "Drag";
		form.prepend(handle);

		handle.addEventListener("dragstart", e => this.startNativeDrag(e, form));
		handle.addEventListener("dragend", this.endDrag);
		handle.addEventListener("pointerdown", e => this.startPointerDrag(e, form));

		if(!this.containerState.has(container)) {
			this.containerState.add(container);
			container.addEventListener("dragover", this.dragOver);
			container.addEventListener("drop", this.drop);
		}

		if(this.debug) {
			this.logger.debug("initDragOrder completed", form);
		}
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

	getItem(form) {
		let item = form.parentElement;
		if(!item?.parentElement) {
			throw new TypeError("data-flux type \"drag-order\" requires the form to be inside a sortable item.");
		}

		return item;
	}

	hideFormControls(form, ...controls) {
		let hiddenElements = new Set();
		for(let control of controls) {
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

	startNativeDrag(e, form) {
		this.startDrag(form, e.clientY);
		if(e.dataTransfer) {
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", "");
		}
	}

	startPointerDrag(e, form) {
		if(e.pointerType === "mouse" || e.button !== 0) {
			return;
		}

		e.preventDefault();
		this.startDrag(form, e.clientY);
		this.moveItem(e.clientY);

		this.activePointerId = e.pointerId;
		this.documentObject.addEventListener("pointermove", this.pointerMove, true);
		this.documentObject.addEventListener("pointerup", this.pointerUp, true);
		this.documentObject.addEventListener("pointercancel", this.pointerCancel, true);
	}

	startDrag(form, clientY = null) {
		this.endDrag();

		let item = this.getItem(form);
		let rect = item.getBoundingClientRect();
		let pointerOffsetY = clientY === null
			? 0
			: rect.top + rect.height / 2 - clientY;

		item.classList.add("flux-drag-order-dragging");
		this.dragState = {
			form,
			item,
			container: item.parentElement,
			pointerOffsetY,
		};
	}

	dragOver = (e) => {
		if(!this.dragState) {
			return;
		}

		e.preventDefault();
		this.moveItem(e.clientY);
	}

	pointerMove = (e) => {
		if(!this.dragState || e.pointerId !== this.activePointerId) {
			return;
		}

		e.preventDefault();
		this.moveItem(e.clientY);
	}

	pointerUp = (e) => {
		if(e.pointerId !== this.activePointerId) {
			return;
		}

		this.removePointerListeners();
		this.submitDrag();
	}

	pointerCancel = (e) => {
		if(e.pointerId !== this.activePointerId) {
			return;
		}

		this.removePointerListeners();
		this.endDrag();
	}

	removePointerListeners() {
		this.documentObject.removeEventListener("pointermove", this.pointerMove, true);
		this.documentObject.removeEventListener("pointerup", this.pointerUp, true);
		this.documentObject.removeEventListener("pointercancel", this.pointerCancel, true);
		this.activePointerId = null;
	}

	moveItem(clientY) {
		let {container, item, pointerOffsetY} = this.dragState;
		let itemCenterY = clientY + pointerOffsetY;
		let siblings = [...container.children].filter(child => {
			return child !== item;
		});
		let insertBefore = siblings.find(child => {
			let rect = child.getBoundingClientRect();
			return itemCenterY < rect.top + rect.height / 2;
		});

		container.insertBefore(item, insertBefore ?? null);
	}

	drop = (e) => {
		if(!this.dragState) {
			return;
		}

		e.preventDefault();
		this.submitDrag();
	}

	submitDrag() {
		if(!this.dragState) {
			return;
		}

		let {form} = this.dragState;
		let order = this.getItemOrder();
		this.endDrag();

		let orderInput = this.getOrderInput(form);
		let submitButton = this.getSubmitButton(form);
		orderInput.value = String(order);
		this.formHandler.submitForm(form, submitButton);
	}

	getItemOrder() {
		let {item, container} = this.dragState;
		return [...container.children].indexOf(item) + 1;
	}

	endDrag = () => {
		if(!this.dragState) {
			return;
		}

		this.dragState.item.classList.remove("flux-drag-order-dragging");
		this.removePointerListeners();
		this.dragState = null;
	}
}
