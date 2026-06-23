import {DropTargetResolver} from "./DropTargetResolver.es6";
import {FormControls} from "./FormControls.es6";
import {Preview} from "./Preview.es6";
import {
	LEGACY_SORTABLE_ITEM_ATTRIBUTE as LEGACY_ITEM_ATTRIBUTE,
	SortableItems,
} from "./SortableItems.es6";

/**
 * Coordinates drag-order behaviour for a single Flux instance.
 * Internally it creates handles, tracks the active drag, moves items in the
 * DOM, then submits the hidden order form when the user drops the item.
 */
export class Handler {
	static LEGACY_SORTABLE_ITEM_ATTRIBUTE = LEGACY_ITEM_ATTRIBUTE;

	constructor(
		formHandler,
		documentObject = globalThis.document,
		logger = console,
		debug = false,
		formControls = new FormControls(),
		sortableItems = new SortableItems(),
		preview = new Preview(documentObject),
		dropTargetResolver = new DropTargetResolver(documentObject),
	) {
		this.formHandler = formHandler;
		this.documentObject = documentObject;
		this.logger = logger;
		this.debug = debug;
		this.formControls = formControls;
		this.sortableItems = sortableItems;
		this.preview = preview;
		this.dropTargetResolver = dropTargetResolver;
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

		let form = this.formControls.getForm(dragElement);
		let orderInput = this.formControls.getOrderInput(form);
		let parentInput = this.formControls.getParentInput(form);
		let submitButton = this.formControls.getSubmitButton(form);
		let item = this.formControls.getItem(dragElement, form);
		let container = item.parentElement;
		let handleTitle = this.getHandleTitle(dragElement, item);

		dragElement.dataset["fluxDragOrderInit"] = "";
		if(dragElement instanceof HTMLFormElement) {
			item.setAttribute(Handler.LEGACY_SORTABLE_ITEM_ATTRIBUTE, "");
		}
		this.formControls.hideControls(form, orderInput, parentInput, submitButton);

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

	getHandleTitle(dragElement, item) {
		return dragElement.dataset["fluxDragHandle"]
			?? dragElement.parentElement?.dataset["fluxDragHandle"]
			?? item.parentElement?.dataset["fluxDragHandle"]
			?? "Drag";
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

		item ??= this.formControls.getItem(form);
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
			floatingItem: this.preview.create(item, rect),
			initialContainer: item.parentElement,
			container: item.parentElement,
			pointerOffsetX,
			pointerOffsetY,
			itemWidth: rect.width,
			itemHeight: rect.height,
		};
		this.preview.move(this.dragState, clientX, clientY);
	}

	dragOver = (e) => {
		if(!this.dragState) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		this.moveItem(
			e.clientY,
			this.dropTargetResolver.getCompatibleContainer(e.currentTarget, this.dragState),
			e.clientX,
		);
	}

	pointerMove = (e) => {
		if(!this.dragState || e.pointerId !== this.activePointerId) {
			return;
		}

		e.preventDefault();
		this.moveItem(e.clientY, this.dropTargetResolver.getContainer(e, this.dragState), e.clientX);
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

	moveItem(clientY, container = this.dragState.container, clientX = null) {
		if(!(container instanceof HTMLElement)) {
			container = this.dragState.container;
		}

		let {item, pointerOffsetX, pointerOffsetY} = this.dragState;
		let sortableItems = this.sortableItems.getSiblings(container);
		let siblings = sortableItems.filter(child => child !== item);
		let horizontal = this.sortableItems.isHorizontal(sortableItems);
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
		container.insertBefore(
			item,
			this.sortableItems.getInsertBeforeElement(container, item, insertBefore, siblings),
		);
		this.preview.move(this.dragState, clientX, clientY);
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

		let orderInput = this.formControls.getOrderInput(form);
		let parentInput = this.formControls.getParentInput(form);
		let submitButton = this.formControls.getSubmitButton(form);
		orderInput.value = String(order);
		if(parentInput) {
			parentInput.value = this.formControls.getParentValue(container);
		}
		this.formHandler.submitForm(form, submitButton);
	}

	getItemOrder() {
		let {item} = this.dragState;
		let container = item.parentElement ?? this.dragState.container;
		this.dragState.container = container;
		return this.sortableItems.getSiblings(container).indexOf(item);
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
