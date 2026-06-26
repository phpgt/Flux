/**
 * Enhances plain GET search forms with background result previews.
 * Normal form submission is left untouched, so pressing Enter still follows
 * the form action using the browser's standard navigation.
 */
export class AutocompleteHandler {
	constructor(
		navigationController,
		logger = console,
		debug = false,
		scheduler = globalThis.setTimeout.bind(globalThis),
		clearScheduler = globalThis.clearTimeout.bind(globalThis),
		delay = 200,
	) {
		this.navigationController = navigationController;
		this.logger = logger;
		this.debug = debug;
		this.scheduler = scheduler;
		this.clearScheduler = clearScheduler;
		this.delay = delay;
		this.state = new WeakMap();
	}

	initAutocomplete = (fluxElement) => {
		if(!(fluxElement instanceof HTMLFormElement)) {
			throw new TypeError("data-flux type \"autocomplete\" must be applied to a form element.");
		}

		if(this.state.has(fluxElement)) {
			return;
		}

		this.state.set(fluxElement, {
			timer: null,
			minLength: this.getMinLength(fluxElement),
			requestId: 0,
			resultsElement: null,
		});
		this.hideSubmitControls(fluxElement);
		fluxElement.addEventListener("input", this.onInput);
		fluxElement.addEventListener("keydown", this.onKeyDown);
	}

	initAutocompleteResults = () => {
	}

	onInput = (e) => {
		let form = e.currentTarget;
		let state = this.state.get(form);
		if(!state) {
			return;
		}

		if(state.timer) {
			this.clearScheduler(state.timer);
		}

		state.timer = this.scheduler(() => {
			state.timer = null;
			this.updateResults(form);
		}, this.delay);
	}

	onKeyDown = (e) => {
		if(e.key !== "ArrowDown" && e.key !== "ArrowUp") {
			return;
		}

		let form = e.currentTarget;
		let state = this.state.get(form);
		let focusableElements = this.getFocusableElements(form, state?.resultsElement);
		if(focusableElements.length === 0) {
			return;
		}

		e.preventDefault();
		this.moveFocus(focusableElements, e.key === "ArrowDown" ? 1 : -1);
	}

	updateResults(form) {
		let formData = new FormData(form);
		let state = this.state.get(form);
		if(!state) {
			return Promise.resolve(null);
		}

		if(!this.hasMinimumValue(formData, state.minLength)) {
			this.removeResults(form, state);
			return Promise.resolve(null);
		}

		let requestId = ++state.requestId;
		return this.navigationController.fetchForm(
			form,
			formData,
			newDocument => {
				if(state.requestId !== requestId) {
					return;
				}

				this.applyResults(form, state, newDocument);
			},
		);
	}

	getMinLength(form) {
		let minLength = Number.parseInt(form.dataset["fluxMinLength"] ?? "", 10);
		if(Number.isFinite(minLength) && minLength >= 0) {
			return minLength;
		}

		return 3;
	}

	hideSubmitControls(form) {
		form.querySelectorAll("button, input[type='submit'], input[type='image']").forEach(element => {
			if(element instanceof HTMLButtonElement && element.type !== "submit") {
				return;
			}

			element.hidden = true;
			element.dataset["fluxAutocompleteButton"] = "";
		});
	}

	hasMinimumValue(formData, minLength) {
		for(let value of formData.values()) {
			if(typeof value === "string" && value.trim().length >= minLength) {
				return true;
			}

			if(typeof File !== "undefined" && value instanceof File && value.name !== "") {
				return true;
			}
		}

		return false;
	}

	applyResults(form, state, newDocument) {
		let newResultsElement = newDocument.querySelector('[data-flux="autocomplete-results"]');
		if(!newResultsElement) {
			this.removeResults(form, state);
			if(this.debug) {
				this.logger.debug("No autocomplete results element found in response", form);
			}
			return;
		}

		newResultsElement.dataset["fluxAutocompleteMounted"] = "";
		newResultsElement.addEventListener("keydown", this.onResultsKeyDown);
		if(state.resultsElement?.isConnected) {
			state.resultsElement.replaceWith(newResultsElement);
		}
		else {
			form.after(newResultsElement);
		}

		state.resultsElement = newResultsElement;
	}

	onResultsKeyDown = (e) => {
		if(e.key !== "ArrowDown" && e.key !== "ArrowUp") {
			return;
		}

		let resultsElement = e.currentTarget;
		let form = this.findOwningForm(resultsElement);
		if(!form) {
			return;
		}

		let focusableElements = this.getFocusableElements(form, resultsElement);
		if(focusableElements.length === 0) {
			return;
		}

		e.preventDefault();
		this.moveFocus(focusableElements, e.key === "ArrowDown" ? 1 : -1);
	}

	findOwningForm(resultsElement) {
		let previousElement = resultsElement.previousElementSibling;
		while(previousElement) {
			if(previousElement instanceof HTMLFormElement && this.state.has(previousElement)) {
				return previousElement;
			}

			previousElement = previousElement.previousElementSibling;
		}

		return null;
	}

	getFocusableElements(form, resultsElement) {
		let selectors = [
			"a[href]",
			"button:not([disabled])",
			"input:not([disabled])",
			"select:not([disabled])",
			"textarea:not([disabled])",
			'[tabindex]:not([tabindex="-1"])',
		].join(",");
		let elements = [
			...form.querySelectorAll(selectors),
		];

		if(resultsElement?.isConnected) {
			elements.push(...resultsElement.querySelectorAll(selectors));
		}

		return elements.filter(element => !element.hidden);
	}

	moveFocus(focusableElements, direction) {
		let currentIndex = focusableElements.indexOf(document.activeElement);
		let nextIndex = currentIndex + direction;
		if(currentIndex === -1) {
			nextIndex = direction > 0 ? 0 : focusableElements.length - 1;
		}

		nextIndex = Math.max(0, Math.min(focusableElements.length - 1, nextIndex));
		focusableElements[nextIndex].focus();
	}

	removeResults(form, state) {
		if(state.resultsElement?.isConnected) {
			state.resultsElement.remove();
		}

		state.resultsElement = null;
		let adjacentResultsElement = form.nextElementSibling;
		if(adjacentResultsElement?.dataset["fluxAutocompleteMounted"] !== undefined) {
			adjacentResultsElement.remove();
		}
	}
}
