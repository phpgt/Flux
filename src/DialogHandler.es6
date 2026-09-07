/** Opens server-rendered dialogs after Flux has inserted them into the document. */
export class DialogHandler {
	constructor(documentObject = globalThis.document) {
		this.documentObject = documentObject;
		this.opened = new WeakSet();
	}

	initModal = dialog => {
		if(!(dialog instanceof HTMLDialogElement)) {
			throw new TypeError('data-flux type "modal" requires a dialog element.');
		}
		let returnFocus = this.documentObject.activeElement;
		// DOM updates initialise directives before insertion and restore focus afterwards.
		queueMicrotask(() => {
			if(!dialog.isConnected || dialog.ownerDocument !== this.documentObject || this.opened.has(dialog)) return;
			if(typeof dialog.showModal !== "function") return;
			if(!dialog.matches(":modal")) {
				// An open attribute supplies a visible non-modal fallback without JavaScript.
				dialog.removeAttribute("open");
				dialog.showModal();
				dialog.addEventListener("close", () => {
					// Autofocus on inserted markup may run before showModal captures its return target.
					if(returnFocus?.isConnected && !dialog.contains(returnFocus)) returnFocus.focus({preventScroll: true});
				}, {once: true});
			}
			this.opened.add(dialog);
		});
	}
}
