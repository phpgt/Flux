import {SubmissionQueue} from "./SubmissionQueue.es6";
import {DirectiveParser} from "./DirectiveParser.es6";
import {DomPath} from "./DomPath.es6";

/**
 * Wires Flux forms and submit buttons into background submission.
 * It handles autosave, auto-submit, rate limiting, and focused
 * field state capture before handing requests to NavigationController.
 */
export class FormHandler {
	constructor(
		navigationController,
		focusStateManager,
		onDocument,
		onNavigationDocument = onDocument,
		logger = console,
		debug = false,
		now = () => Date.now(),
		domPath = DomPath,
	) {
		this.navigationController = navigationController;
		this.focusStateManager = focusStateManager;
		this.onDocument = onDocument;
		this.onNavigationDocument = onNavigationDocument;
		this.logger = logger;
		this.debug = debug;
		this.now = now;
		this.domPath = domPath;
		this.rateLimitState = new Map();
		this.submissionQueue = new SubmissionQueue(domPath);
	}

	initAutoContainer = (fluxElement) => {
		if(fluxElement instanceof HTMLFormElement) {
			fluxElement.addEventListener("submit", this.formSubmitAutoSave);
		}
	}

	initSubmitQueue = (element) => {
		if(!(element instanceof HTMLFormElement)) {
			throw new TypeError('data-flux type "submit-queue" must be applied to a form element.');
		}
		element.addEventListener("submit", this.formSubmitAutoSave);
	}

	initAutoSave = (fluxElement) => {
		if(!(fluxElement instanceof HTMLButtonElement)) {
			throw new TypeError("data-flux type \"autosave\" must be applied to a button element.");
		}

		if(!fluxElement.form) {
			throw new TypeError("data-flux type \"autosave\" must have a containing form element.");
		}

		if(!fluxElement.form.fluxObj) {
			fluxElement.form.fluxObj = {};
		}

		fluxElement.form.fluxObj.autoSave = {
			key: fluxElement.name,
			value: fluxElement.value,
		};

		fluxElement.form.dataset["fluxObj"] = "";
		fluxElement.form.addEventListener("change", this.formChangeAutoSave);
		fluxElement.form.addEventListener("submit", this.formSubmitAutoSave);
		if(this.debug) {
			this.logger.debug("initAutoSave completed", fluxElement);
		}
	}

	initAutoSubmit = (fluxElement) => {
		if(!(fluxElement instanceof HTMLButtonElement)) {
			throw new TypeError("data-flux type \"submit\" must be applied to a button element.");
		}

		if(!fluxElement.form) {
			throw new TypeError("data-flux type \"submit\" must have a containing form element.");
		}

		if(fluxElement.form.dataset["fluxSubmitInit"] !== undefined) {
			return;
		}

		fluxElement.form.dataset["fluxSubmitInit"] = "";
		fluxElement.form.addEventListener("submit", DirectiveParser.has(fluxElement.form, "submit-queue")
			? this.formSubmitAutoSave : this.autoSubmit);
	}

	autoSubmit = (e) => {
		e.preventDefault();
		setTimeout(() => {
			this.submitForm(e.target, e.submitter);
		}, 0);
	}

	formChangeAutoSave = (e) => {
		let form = e.target;
		if(form.form instanceof HTMLFormElement) {
			let element = form;
			element.classList.add("input-changed");
			element.setAttribute("data-flux-active", "");
			setTimeout(() => {
				element.classList.remove("input-changed");
			}, 100);

			form = form.form;
		}

		this.submitForm(form);
	}

	formSubmitAutoSave = (e) => {
		e.preventDefault();
		let currentActiveElement = document.activeElement;

		let form = e.target;
		if(form.form instanceof HTMLFormElement) {
			form = form.form;
		}

		this.focusStateManager.storeFormState(form, currentActiveElement);

		if(!DirectiveParser.has(form, "submit-queue") && form.querySelectorAll(".input-changed").length > 0) {
			return;
		}

		let submitter = null;
		if(e.submitter instanceof HTMLButtonElement || e.submitter instanceof HTMLInputElement) {
			submitter = e.submitter;
		}

		this.submitForm(form, submitter);
	}

	submitForm(form, submitter) {
		if(DirectiveParser.has(form, "submit-queue")) {
			return this.submissionQueue.run(form, submitter, (inspectResponse) => this.sendForm(form, submitter, inspectResponse));
		}
		return this.sendForm(form, submitter);
	}

	sendForm(form, submitter, inspectResponse = null) {
		if(this.isRateLimited(submitter)) {
			return Promise.resolve(null);
		}

		let requestElementState = this.focusStateManager.captureElementState(form);
		let formData = this.getFormDataForButton(form, "autoSave", submitter);
		let responseHandler = (newDocument) => {
			inspectResponse?.(newDocument, this.navigationController.isSuccessfulResponse?.(newDocument) ?? true);
			return form.hasAttribute("action") ? this.onNavigationDocument(newDocument, requestElementState)
				: this.onDocument(newDocument, requestElementState);
		};
		return this.navigationController.submitForm(form, formData, responseHandler, submitter);
	}

	isRateLimited(submitter) {
		if(!(submitter instanceof HTMLElement)) {
			return false;
		}

		let rate = Number.parseFloat(submitter.dataset["fluxRate"] ?? "");
		if(!Number.isFinite(rate) || rate <= 0) {
			return false;
		}

		let now = this.now();
		let rateLimitKey = this.getRateLimitKey(submitter);
		let lastSubmittedAt = this.rateLimitState.get(rateLimitKey) ?? -Infinity;
		if(now - lastSubmittedAt < rate * 1000) {
			return true;
		}

		this.rateLimitState.set(rateLimitKey, now);
		return false;
	}

	getRateLimitKey(submitter) {
		let path = this.domPath.getXPathForElement(submitter, document);
		return `submit:${path}`;
	}

	getFormDataForButton(form, type, submitter) {
		let formData = new FormData(form);
		if(submitter) {
			if(submitter.name) formData.set(submitter.name, submitter.value);
		}
		else if(form.fluxObj && form.fluxObj[type]) {
			formData.set(
				form.fluxObj[type].key,
				form.fluxObj[type].value,
			);
		}

		return formData;
	}
}
