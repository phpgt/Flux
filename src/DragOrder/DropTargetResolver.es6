/**
 * Chooses the container that should receive the dragged item.
 * Internally, DragOrder.Handler uses this during pointer movement to support
 * nested sortable areas such as Kanban lists inside draggable columns.
 */
export class DropTargetResolver {
	constructor(documentObject = globalThis.document) {
		this.documentObject = documentObject;
	}

	getContainer(event, dragState) {
		if(typeof this.documentObject.elementFromPoint !== "function"
			|| !Number.isFinite(event.clientX)
			|| !Number.isFinite(event.clientY)) {
			return dragState.container;
		}

		let element = this.documentObject.elementFromPoint(event.clientX, event.clientY);
		let container = element
			? this.getNestedContainer(element, event.clientX, event.clientY, dragState)
			: null;
		container ??= element?.closest("[data-flux-drag-parent]")
			?? this.getParentContainerAtPoint(event.clientX, event.clientY)
			?? dragState.container;

		return this.getCompatibleContainer(container, dragState);
	}

	getCompatibleContainer(container, dragState) {
		let {initialContainer} = dragState;
		if(container !== initialContainer
			&& (initialContainer.contains(container) || container.contains(initialContainer))) {
			return dragState.container;
		}

		return container;
	}

	getNestedContainer(element, clientX, clientY, dragState) {
		let outerContainer = element.closest("[data-flux-drag-parent]");
		if(!outerContainer?.contains(dragState.initialContainer)) {
			return null;
		}

		let host = element.closest("[data-flux='drag-order']");
		if(!host || host === dragState.item) {
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
}
