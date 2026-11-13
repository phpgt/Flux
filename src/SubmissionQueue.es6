import {DomPath} from "./DomPath.es6";
import {DirectiveParser} from "./DirectiveParser.es6";

/** Serialises requests and keeps one distinct action across server renders. */
export class SubmissionQueue {
	constructor(domPath = DomPath) {
		this.domPath = domPath;
		this.pending = new Map();
	}

	run(form, submitter, send) {
		const identity = this.identity(form);
		const action = this.action(form, submitter);
		const current = this.pending.get(identity.key);
		if(current) {
			// Field changes and repeated clicks must not duplicate an active request.
			if(current.automatic && submitter && !current.next && !this.sameAction(current.action, action)) {
				current.next = action;
			}
			return current.promise;
		}

		const state = {action, automatic: this.isAutomatic(form, submitter), next: null, promise: null, canReplay: false};
		this.pending.set(identity.key, state);
		state.promise = this.send(form, send, identity, state);
		return state.promise;
	}

	async send(form, send, identity, state) {
		let unlock = () => {};
		let result = null;
		try {
			// Build FormData before disabling controls, so all successful fields remain included.
			const request = send((response, successful) => {
				const returnedForm = this.findForm(identity, response);
				state.canReplay = successful && response.head?.children.length > 0
					&& returnedForm instanceof HTMLFormElement
					&& DirectiveParser.has(returnedForm, "submit-queue");
			});
			unlock = this.lock(form);
			result = await request;
			return result;
		}
		finally {
			unlock();
			this.pending.delete(identity.key);
			// A failed request needs a deliberate retry, not an automatic second write.
			if(result && state.canReplay && state.next) this.replay(identity, state.next);
		}
	}

	identity(form) {
		const id = form.getAttribute("id");
		const path = this.domPath.getXPathForElement(form);
		return {id, path, key: id ? `id:${id}` : `path:${path}`};
	}

	action(form, submitter) {
		const fallback = form.fluxObj?.autoSave;
		return submitter ? {
			name: submitter.name, value: submitter.value, id: submitter.getAttribute("id"),
		} : {name: fallback?.key ?? "", value: fallback?.value ?? "", id: null};
	}

	isAutomatic(form, submitter) {
		const fallback = form.fluxObj?.autoSave;
		return !!fallback && (!submitter || (submitter.name === fallback.key && submitter.value === fallback.value));
	}

	sameAction(first, second) {
		return first.name === second.name && first.value === second.value
			&& (first.name !== "" || first.id === second.id);
	}

	findForm(identity, document) {
		return identity.id ? document.getElementById(identity.id)
			: this.domPath.findInDocument(document, identity.path);
	}

	replay(identity, action) {
		const form = this.findForm(identity, document);
		if(!(form instanceof HTMLFormElement) || !DirectiveParser.has(form, "submit-queue")) return;
		const button = Array.from(form.elements).find(element =>
			(element instanceof HTMLButtonElement || (element instanceof HTMLInputElement && element.type === "submit"))
			&& element.name === action.name && element.value === action.value
			&& (!action.id || element.getAttribute("id") === action.id));
		if(button && !button.matches(":disabled")) form.requestSubmit(button);
	}

	lock(form) {
		const previousBusy = form.getAttribute("aria-busy");
		const fields = Array.from(form.elements).filter(field =>
			field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement);
		const previous = fields.map(field => ({field, readOnly: field.readOnly, disabled: field.disabled}));
		for(const field of fields) {
			if(field instanceof HTMLTextAreaElement || (field instanceof HTMLInputElement
				&& !["checkbox", "radio", "file", "submit", "image", "button", "reset", "hidden"].includes(field.type))) {
				field.readOnly = true;
			}
			else if(field instanceof HTMLSelectElement || ["checkbox", "radio", "file"].includes(field.type)) {
				field.disabled = true;
			}
		}
		form.setAttribute("aria-busy", "true");
		return () => {
			for(const {field, readOnly, disabled} of previous) {
				if(readOnly !== undefined) field.readOnly = readOnly;
				field.disabled = disabled;
			}
			if(previousBusy === null) form.removeAttribute("aria-busy");
			else form.setAttribute("aria-busy", previousBusy);
		};
	}
}
