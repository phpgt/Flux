export class FluxFormHandler {
	constructor(
		navigationController,
		focusStateManager,
		onDocument,
		onNavigationDocument = onDocument,
		logger = console,
		debug = false,
	) {
		this.navigationController = navigationController;
		this.focusStateManager = focusStateManager;
		this.onDocument = onDocument;
		this.onNavigationDocument = onNavigationDocument;
		this.logger = logger;
		this.debug = debug;
	}

	initAutoContainer = (fluxElement) => {
		if(fluxElement instanceof HTMLFormElement) {
			fluxElement.addEventListener("submit", this.formSubmitAutoSave);
		}
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
		fluxElement.form.addEventListener("submit", this.autoSubmit);
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
		if(currentActiveElement) {
			currentActiveElement.blur();
		}

		let form = e.target;
		if(form.form instanceof HTMLFormElement) {
			form = form.form;
		}

		this.focusStateManager.storeFormState(form, currentActiveElement);

		if(form.querySelectorAll(".input-changed").length > 0) {
			return;
		}

		let submitter = null;
		if(e.submitter instanceof HTMLButtonElement) {
			submitter = e.submitter;
		}

		this.submitForm(form, submitter);
	}

	submitForm(form, submitter) {
		let formData = this.getFormDataForButton(form, "autoSave", submitter);
		let responseHandler = form.hasAttribute("action")
			? this.onNavigationDocument
			: this.onDocument;
		return this.navigationController.submitForm(form, formData, responseHandler);
	}

	getFormDataForButton(form, type, submitter) {
		let formData = new FormData(form);
		if(submitter) {
			formData.set(submitter.name, submitter.value);
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
