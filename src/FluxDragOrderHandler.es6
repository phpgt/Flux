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
		handle.draggable = false;
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
		this.startDrag(form, e.clientY, item, e.clientX);
		if(e.dataTransfer) {
			if(item) {
				let rect = item.getBoundingClientRect();
				e.dataTransfer.setDragImage(
					item,
					e.clientX - rect.left,
					e.clientY - rect.top,
				);
			}

			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", "");
		}
	}

	startPointerDrag(e, form, item = null) {
		if(e.button !== 0) {
			return;
		}

		e.preventDefault();
		this.startDrag(form, e.clientY, item, e.clientX);
		this.moveItem(e.clientY, undefined, e.clientX);

		this.activePointerId = e.pointerId;
		this.documentObject.addEventListener("pointermove", this.pointerMove, true);
		this.documentObject.addEventListener("pointerup", this.pointerUp, true);
		this.documentObject.addEventListener("pointercancel", this.pointerCancel, true);
	}

	startDrag(form, clientY = null, item = null, clientX = null) {
		this.endDrag();

		item ??= this.getItem(form);
		let rect = item.getBoundingClientRect();
		let pointerOffsetX = !Number.isFinite(clientX)
			? 0
			: rect.left + rect.width / 2 - clientX;
		let pointerOffsetY = !Number.isFinite(clientY)
			? 0
			: rect.top + rect.height / 2 - clientY;

		item.classList.add("flux-drag-order-dragging");
		this.dragState = {
			form,
			item,
			floatingItem: this.createFloatingItem(item, rect),
			initialContainer: item.parentElement,
			container: item.parentElement,
			pointerOffsetX,
			pointerOffsetY,
			itemWidth: rect.width,
			itemHeight: rect.height,
		};
		this.moveFloatingItem(clientX, clientY);
	}

	dragOver = (e) => {
		if(!this.dragState) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		this.moveItem(
			e.clientY,
			this.getCompatiblePointerContainer(e.currentTarget),
			e.clientX,
		);
	}

	pointerMove = (e) => {
		if(!this.dragState || e.pointerId !== this.activePointerId) {
			return;
		}

		e.preventDefault();
		this.moveItem(e.clientY, this.getPointerContainer(e), e.clientX);
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
		let container = element
			? this.getNestedPointerContainer(element, e.clientX, e.clientY)
			: null;
		container ??= element?.closest("[data-flux-drag-parent]")
			?? this.getParentContainerAtPoint(e.clientX, e.clientY)
			?? this.dragState.container;

		return this.getCompatiblePointerContainer(container);
	}

	getNestedPointerContainer(element, clientX, clientY) {
		let outerContainer = element.closest("[data-flux-drag-parent]");
		if(!outerContainer?.contains(this.dragState.initialContainer)) {
			return null;
		}

		let host = element.closest("[data-flux='drag-order']");
		if(!host || host === this.dragState.item) {
			return null;
		}

		let candidates = [...host.querySelectorAll("[data-flux-drag-parent]")];
		return candidates.find(container => {
			let rect = container.getBoundingClientRect();
			return clientX >= rect.left
				&& clientX <= rect.right
				&& clientY >= rect.top
				&& clientY <= rect.bottom;
		}) ?? candidates[0] ?? null;
	}

	getParentContainerAtPoint(clientX, clientY) {
		let containers = this.documentObject.querySelectorAll("[data-flux-drag-parent]");
		return [...containers].reverse().find(container => {
			let rect = container.getBoundingClientRect();
			return clientX >= rect.left
				&& clientX <= rect.right
				&& clientY >= rect.top
				&& clientY <= rect.bottom;
		});
	}

	getCompatiblePointerContainer(container) {
		let {initialContainer} = this.dragState;
		if(container !== initialContainer
			&& (initialContainer.contains(container) || container.contains(initialContainer))) {
			return this.dragState.container;
		}

		return container;
	}

	moveItem(clientY, container = this.dragState.container, clientX = null) {
		if(!(container instanceof HTMLElement)) {
			container = this.dragState.container;
		}

		let {item, pointerOffsetX, pointerOffsetY} = this.dragState;
		let sortableItems = this.getSortableSiblings(container);
		let siblings = sortableItems.filter(child => child !== item);
		let horizontal = this.isHorizontalContainer(sortableItems);
		let itemCenter = horizontal
			? (clientX ?? 0) + pointerOffsetX
			: clientY + pointerOffsetY;
		let insertBefore = siblings.find(child => {
			let rect = child.getBoundingClientRect();
			let childCenter = horizontal
				? rect.left + rect.width / 2
				: rect.top + rect.height / 2;
			return itemCenter < childCenter;
		});

		this.dragState.container = container;
		container.insertBefore(item, this.getInsertBeforeElement(container, insertBefore, siblings));
		this.moveFloatingItem(clientX, clientY);
	}

	createFloatingItem(item, rect) {
		let floatingItem = item.cloneNode(true);
		this.copyComputedStyles(item, floatingItem);
		floatingItem.classList.add("flux-drag-order-floating");
		floatingItem.setAttribute("aria-hidden", "true");
		floatingItem.style.setProperty("box-sizing", "border-box");
		floatingItem.style.setProperty("position", "fixed");
		floatingItem.style.setProperty("z-index", "2147483647");
		floatingItem.style.setProperty("pointer-events", "none");
		floatingItem.style.setProperty("opacity", "0.85");
		floatingItem.style.setProperty("transform-origin", "top left");
		floatingItem.style.setProperty("width", `${rect.width}px`);
		floatingItem.style.setProperty("height", `${rect.height}px`);
		floatingItem.style.setProperty("left", "0");
		floatingItem.style.setProperty("top", "0");
		this.documentObject.body.append(floatingItem);

		return floatingItem;
	}

	copyComputedStyles(source, target) {
		let styles = getComputedStyle(source);
		for(let i = 0; i < styles.length; i++) {
			let property = styles.item(i);
			target.style.setProperty(
				property,
				styles.getPropertyValue(property),
				styles.getPropertyPriority(property),
			);
		}

		[...source.children].forEach((sourceChild, index) => {
			let targetChild = target.children[index];
			if(targetChild) {
				this.copyComputedStyles(sourceChild, targetChild);
			}
		});
	}

	moveFloatingItem(clientX, clientY) {
		if(!this.dragState?.floatingItem
			|| !Number.isFinite(clientX)
			|| !Number.isFinite(clientY)) {
			return;
		}

		let {
			floatingItem,
			pointerOffsetX,
			pointerOffsetY,
			itemWidth,
			itemHeight,
		} = this.dragState;
		let left = clientX + pointerOffsetX - itemWidth / 2;
		let top = clientY + pointerOffsetY - itemHeight / 2;

		floatingItem.style.transform = `translate(${left}px, ${top}px)`;
	}

	isHorizontalContainer(siblings) {
		if(siblings.length < 2) {
			return false;
		}

		let rects = siblings.map(child => child.getBoundingClientRect());
		let lefts = rects.map(rect => rect.left);
		let tops = rects.map(rect => rect.top);
		return Math.max(...lefts) - Math.min(...lefts)
			> Math.max(...tops) - Math.min(...tops);
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

		this.dragState.floatingItem?.remove();
		this.dragState.item.classList.remove("flux-drag-order-dragging");
		this.removePointerListeners();
		this.dragState = null;
	}
}
