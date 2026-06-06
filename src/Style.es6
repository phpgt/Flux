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
	opacity: 0.5;
}
`;
