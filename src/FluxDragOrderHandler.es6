export class FluxDragOrderHandler {
	static LEGACY_SORTABLE_ITEM_ATTRIBUTE = "data-flux-drag-order-item";

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

	initDragOrder = (dragElement) => {
		if(!(dragElement instanceof HTMLElement)) {
			throw new TypeError("data-flux type \"drag-order\" must be applied to an HTML element.");
		}

		if(dragElement.dataset["fluxDragOrderInit"] !== undefined) {
			return;
		}

		let form = this.getForm(dragElement);
		let orderInput = this.getOrderInput(form);
		let parentInput = this.getParentInput(form);
		let submitButton = this.getSubmitButton(form);
		let item = this.getItem(dragElement, form);
		let container = item.parentElement;
		let handleTitle = this.getHandleTitle(dragElement, item);

		dragElement.dataset["fluxDragOrderInit"] = "";
		if(dragElement instanceof HTMLFormElement) {
			item.setAttribute(FluxDragOrderHandler.LEGACY_SORTABLE_ITEM_ATTRIBUTE, "");
		}
		this.hideFormControls(form, orderInput, parentInput, submitButton);

		let handle = this.documentObject.createElement("span");
		handle.className = "drag-handle";
		handle.draggable = true;
		handle.role = "button";
		handle.tabIndex = 0;
		handle.ariaLabel = "Drag to reorder";
		handle.dataset["fluxTitle"] = handleTitle;
		form.prepend(handle);

		handle.addEventListener("dragstart", e => this.startNativeDrag(e, form, item));
		handle.addEventListener("dragend", this.endNativeDrag);
		handle.addEventListener("pointerdown", e => this.startPointerDrag(e, form, item));

		this.initContainer(container);
		this.initParentContainers();

		if(this.debug) {
			this.logger.debug("initDragOrder completed", dragElement);
		}
	}

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

	getHandleTitle(dragElement, item) {
		return dragElement.dataset["fluxDragHandle"]
			?? dragElement.parentElement?.dataset["fluxDragHandle"]
			?? item.parentElement?.dataset["fluxDragHandle"]
			?? "Drag";
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

	hideFormControls(form, ...controls) {
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

	initContainer(container) {
		if(this.containerState.has(container)) {
			return;
		}

		this.containerState.add(container);
		container.addEventListener("dragover", this.dragOver);
		container.addEventListener("drop", this.drop);
	}

	initParentContainers() {
		this.documentObject.querySelectorAll("[data-flux-drag-parent]").forEach(container => {
			this.initContainer(container);
		});
	}

	startNativeDrag(e, form, item = null) {
		this.startDrag(form, e.clientY, item);
		if(e.dataTransfer) {
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", "");
		}
	}

	startPointerDrag(e, form, item = null) {
		if(e.pointerType === "mouse" || e.button !== 0) {
			return;
		}

		e.preventDefault();
		this.startDrag(form, e.clientY, item);
		this.moveItem(e.clientY);

		this.activePointerId = e.pointerId;
		this.documentObject.addEventListener("pointermove", this.pointerMove, true);
		this.documentObject.addEventListener("pointerup", this.pointerUp, true);
		this.documentObject.addEventListener("pointercancel", this.pointerCancel, true);
	}

	startDrag(form, clientY = null, item = null) {
		this.endDrag();

		item ??= this.getItem(form);
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
		this.moveItem(e.clientY, e.currentTarget);
	}

	pointerMove = (e) => {
		if(!this.dragState || e.pointerId !== this.activePointerId) {
			return;
		}

		e.preventDefault();
		this.moveItem(e.clientY, this.getPointerContainer(e));
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

	getPointerContainer(e) {
		if(typeof this.documentObject.elementFromPoint !== "function"
			|| !Number.isFinite(e.clientX)
			|| !Number.isFinite(e.clientY)) {
			return this.dragState.container;
		}

		let element = this.documentObject.elementFromPoint(e.clientX, e.clientY);
		return element?.closest("[data-flux-drag-parent]")
			?? this.getParentContainerAtPoint(e.clientX, e.clientY)
			?? this.dragState.container;
	}

	getParentContainerAtPoint(clientX, clientY) {
		let containers = this.documentObject.querySelectorAll("[data-flux-drag-parent]");
		return [...containers].find(container => {
			let rect = container.getBoundingClientRect();
			return clientX >= rect.left
				&& clientX <= rect.right
				&& clientY >= rect.top
				&& clientY <= rect.bottom;
		});
	}

	moveItem(clientY, container = this.dragState.container) {
		if(!(container instanceof HTMLElement)) {
			container = this.dragState.container;
		}

		let {item, pointerOffsetY} = this.dragState;
		let itemCenterY = clientY + pointerOffsetY;
		let siblings = this.getSortableSiblings(container).filter(child => child !== item);
		let insertBefore = siblings.find(child => {
			let rect = child.getBoundingClientRect();
			return itemCenterY < rect.top + rect.height / 2;
		});

		this.dragState.container = container;
		container.insertBefore(item, this.getInsertBeforeElement(container, insertBefore, siblings));
	}

	getInsertBeforeElement(container, sortableInsertBefore, sortableSiblings) {
		if(sortableInsertBefore) {
			return sortableInsertBefore;
		}

		if(!container.hasAttribute("data-flux-drag-parent")) {
			return null;
		}

		let children = [...container.children].filter(child => child !== this.dragState.item);
		let lastSortable = sortableSiblings.at(-1);
		let startIndex = lastSortable
			? children.indexOf(lastSortable) + 1
			: 0;

		return children.slice(startIndex).find(child => !this.isSortableItem(child)) ?? null;
	}

	drop = (e) => {
		if(!this.dragState) {
			return;
		}

		e.preventDefault();
		this.submitDrag();
	}

	endNativeDrag = () => {
		if(!this.dragState) {
			return;
		}

		this.submitDrag();
	}

	submitDrag() {
		if(!this.dragState) {
			return;
		}

		let {form} = this.dragState;
		let order = this.getItemOrder();
		let container = this.dragState.container;
		this.endDrag();

		let orderInput = this.getOrderInput(form);
		let parentInput = this.getParentInput(form);
		let submitButton = this.getSubmitButton(form);
		orderInput.value = String(order);
		if(parentInput) {
			parentInput.value = this.getParentValue(container);
		}
		this.formHandler.submitForm(form, submitButton);
	}

	getItemOrder() {
		let {item} = this.dragState;
		let container = item.parentElement ?? this.dragState.container;
		this.dragState.container = container;
		return this.getSortableSiblings(container).indexOf(item);
	}

	getSortableSiblings(container) {
		return [...container.children].filter(child => this.isSortableItem(child));
	}

	isSortableItem(child) {
		return child.dataset["flux"] === "drag-order"
			|| child.hasAttribute(FluxDragOrderHandler.LEGACY_SORTABLE_ITEM_ATTRIBUTE);
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
