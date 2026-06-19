/**
 * Creates the floating visual copy shown while an item is dragged.
 * DragOrder.Handler asks this class to clone computed styles and
 * keep the preview positioned under the pointer.
 */
export class Preview {
	constructor(documentObject = globalThis.document) {
		this.documentObject = documentObject;
	}

	create(item, rect) {
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

	move(dragState, clientX, clientY) {
		if(!dragState?.floatingItem
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
		} = dragState;
		let left = clientX + pointerOffsetX - itemWidth / 2;
		let top = clientY + pointerOffsetY - itemHeight / 2;

		floatingItem.style.transform = `translate(${left}px, ${top}px)`;
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
}
