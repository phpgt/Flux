/** Opens server-rendered dialogs after Flux has inserted them into the document. */
export class DialogHandler {
	constructor(documentObject = globalThis.document) {
		this.documentObject = documentObject;
		this.opened = new WeakSet();
		this.returnFocus = new WeakMap();
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
				this.returnFocus.set(dialog, returnFocus);
				dialog.addEventListener("close", this.onClose, {once: true});
			}
			this.opened.add(dialog);
		});
	}

	onClose = event => {
		let dialog = event.currentTarget;
		let target = this.returnFocus.get(dialog);
		this.returnFocus.delete(dialog);
		// A shared listener can be transferred without retaining a previous dialog.
		if(target?.isConnected && !dialog.contains(target)) target.focus({preventScroll: true});
	}
}
