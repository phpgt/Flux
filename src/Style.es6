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
	cursor: grab;
	user-select: none;
	touch-action: none;
}

.drag-handle:active {
	cursor: grabbing;
}

.flux-drag-order-dragging {
	opacity: 0.5;
}
`;
