export const LEGACY_SORTABLE_ITEM_ATTRIBUTE = "data-flux-drag-order-item";

/**
 * Describes which children in a container participate in drag ordering.
 * DragOrder.Handler uses this to ignore non-sortable placeholders
 * and to decide where a dragged item should be inserted.
 */
export class SortableItems {
	getSiblings(container) {
		return [...container.children].filter(child => this.isSortable(child));
	}

	isSortable(child) {
		return child.dataset["flux"] === "drag-order"
			|| child.hasAttribute(LEGACY_SORTABLE_ITEM_ATTRIBUTE);
	}

	isHorizontal(siblings) {
		if(siblings.length < 2) {
			return false;
		}

		let rects = siblings.map(child => child.getBoundingClientRect());
		let lefts = rects.map(rect => rect.left);
		let tops = rects.map(rect => rect.top);
		return Math.max(...lefts) - Math.min(...lefts)
			> Math.max(...tops) - Math.min(...tops);
	}

	getInsertBeforeElement(container, draggedItem, sortableInsertBefore, sortableSiblings) {
		if(sortableInsertBefore) {
			return sortableInsertBefore;
		}

		if(!container.hasAttribute("data-flux-drag-parent")) {
			return null;
		}

		let children = [...container.children].filter(child => child !== draggedItem);
		let lastSortable = sortableSiblings.at(-1);
		let startIndex = lastSortable
			? children.indexOf(lastSortable) + 1
			: 0;

		return children.slice(startIndex).find(child => !this.isSortable(child)) ?? null;
	}
}
