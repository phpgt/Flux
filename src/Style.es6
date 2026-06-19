export class Style {
	element;

	constructor() {
		this.setupElement();
	}

	setupElement() {
		this.element = document.createElement("style");
		this.element.id = "flux-style";
		this.element.innerHTML = CSS_CONTENT;
	}

	addToDocument() {
		document.head.append(this.element);
	}
}

const CSS_CONTENT = `
[data-flux="autosave"] {
	display: none;
}

.drag-handle {
	cursor: move;
	user-select: none;
	touch-action: none;
}

.drag-handle::before {
	content: attr(data-flux-title);
}

.flux-drag-order-dragging {
	opacity: 0;
}

.flux-drag-order-floating {
	box-sizing: border-box;
	position: fixed;
	z-index: 2147483647;
	pointer-events: none;
	opacity: 0.85;
	transform-origin: top left;
}
`;
