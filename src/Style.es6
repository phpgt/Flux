/**
 * Adds the small stylesheet Flux needs for built-in behaviours.
 * This hides autosave buttons and supplies default drag-handle and
 * drag-preview styles when a Flux instance starts.
 */
export class Style {
	element;

	constructor(documentObject = globalThis.document) {
		this.documentObject = documentObject;
		this.setupElement();
	}

	setupElement() {
		this.element = this.documentObject.createElement("style");
		this.element.id = "flux-style";
		this.element.innerHTML = CSS_CONTENT;
	}

	addToDocument() {
		this.documentObject.head.append(this.element);
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
