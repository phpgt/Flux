import {Style} from "./Style.es6";
import {ElementEventMapper} from "./ElementEventMapper.es6";
import {DomPath} from "./DomPath.es6";
import {UpdateTargetRegistry} from "./UpdateTargetRegistry.es6";
import {FocusStateManager} from "./FocusStateManager.es6";
import {NavigationController} from "./NavigationController.es6";
import {DocumentUpdater} from "./DocumentUpdater.es6";

export class Flux {
	static DEBUG = false;
	style;
	elementEventMapper;
	navigationController;
	updateTargetRegistry;
	focusStateManager;
	documentUpdater;

	constructor(
		style = undefined,
		elementEventMapper = undefined,
		parser = undefined,
		navigationController = undefined,
		updateTargetRegistry = undefined,
		focusStateManager = undefined,
		documentUpdater = undefined,
	) {
		handleWindowPopState();
		style = style ?? new Style();
		style.addToDocument();
		this.elementEventMapper = elementEventMapper ?? new ElementEventMapper();
		this.navigationController = navigationController ?? new NavigationController(
			parser ?? new DOMParser(),
		);
		this.updateTargetRegistry = updateTargetRegistry ?? new UpdateTargetRegistry();
		this.focusStateManager = focusStateManager ?? new FocusStateManager();
		this.documentUpdater = documentUpdater ?? new DocumentUpdater(
			this.updateTargetRegistry,
			this.focusStateManager,
			this.prepareElementUpdate,
			DomPath,
			console,
			Flux.DEBUG,
		);

		document.querySelectorAll("[data-flux]").forEach(this.initFluxElement);
	}

	/**
	 * Initialise a single element in the document with its functionality
	 * as specified by the data-flux attribute.
	 *
	 * data-flux="update" - Synonymous with update-outer
	 * data-flux="update-outer" - Updates the outerHTML of the element when
	 * the page updates
	 * data-flux="update-inner" - Updates the innerHTML of the element when
	 * the page updates
	 * data-flux="autosave" - This element will become hidden, and any
	 * "change" event on any element within this element's containing form
	 * will trigger a background save by clicking this button
	 * data-flux="submit" - When clicked, this element will submit its
	 * containing form in the background
	 */
	initFluxElement = (fluxElement) => {
		let fluxType = fluxElement.dataset["flux"];

		if(fluxType === "") {
			this.initAutoContainer(fluxElement);
		}
		else if(fluxType === "autosave") {
			this.initAutoSave(fluxElement);
		}
		else if(fluxType.startsWith("update")) {
			let updateType = null;

			if(fluxType === "update" || fluxType === "update-outer") {
				updateType = "outer";
			}
			else if(fluxType === "update-inner") {
				updateType = "inner";
			}

			this.storeUpdateElement(fluxElement, updateType);
		}
		else if(fluxType === "submit") {
			this.initAutoSubmit(fluxElement);
		}
		else if(fluxType === "link") {
			this.initAutoLink(fluxElement);
		}
		else {
			throw new TypeError(`Unknown flux element type: ${fluxType}`);
		}
	}

	initAutoContainer = (fluxElement) => {
		if(fluxElement instanceof HTMLFormElement) {
			fluxElement.addEventListener("submit", this.formSubmitAutoSave);
		}
// TODO: Hook up any links within the container, or other sub forms, or that kind of thing.
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
		Flux.DEBUG && console.debug("initAutoSave completed", fluxElement);
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

	initAutoLink = (fluxElement) => {
		if(!(fluxElement instanceof HTMLAnchorElement)) {
			throw new TypeError("data-type type \"link\" must be applied to an anchor element.");
		}

		fluxElement.addEventListener("click", this.autoClick);
	}

	/**
	 * Store a DOM element that should be refreshed when Flux processes
	 * a new HTML document after an interaction.
	 */
	storeUpdateElement = (element, updateType) => {
		this.updateTargetRegistry.add(element, updateType);
		Flux.DEBUG && console.debug("storeUpdateElement completed", `Pushing into ${updateType}: `, element);
	}

	autoSubmit = (e) => {
		e.preventDefault();

// A 0 timeout is used here to ensure the code inside the setTimeout
// is executed asynchronously and after the current execution context
// (i.e., the main event loop completes any ongoing operations).
// This guarantees that the form submission logic is properly executed after any
// other immediate synchronous operations tied to the event.
		setTimeout(() => {
			this.submitForm(e.target, e.submitter);
		}, 0);
	}

	autoClick = (e) => {
		e.preventDefault();
		let link = e.currentTarget;

		setTimeout(() => {
			this.clickLink(link);
		}, 0);
	}

	submitForm = (form, submitter) => {
		let formData = this.getFormDataForButton(
			form,
			"autoSave",
			submitter,
		);
		return this.navigationController.submitForm(
			form,
			formData,
			this.completeAutoSave,
		);
	}

	clickLink = (link) => {
		return this.navigationController.clickLink(
			link,
			this.completeAutoSave,
		);
	}

	getFormDataForButton = (form, type, submitter) => {
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

	completeAutoSave = (newDocument) => {
		if(newDocument.head.children.length === 0) {
			if(Flux.DEBUG) {
				alert("Error processing new document!");
			}

			console.error("Error processing new document!");
			location.reload();
		}

// The setTimeout with 0 delay doesn't mean it would execute immediately, it
// schedules the execution immediately after the running script to strive to
// execute as soon as possible. This is also known as yielding to the browser.
// It's necessary to allow for click events to be processed before updating the
// DOM mid-click and causing clicks to be missed on children of updated elements.
		setTimeout(() => {
			this.documentUpdater.apply(newDocument);
		}, 0);
	}

	formChangeAutoSave = (e) => {
		let form = e.target;
		if(form.form instanceof HTMLFormElement) {
			let element = form;
			element.classList.add("input-changed");
			element.setAttribute("data-flux-active", "");
			(function(c_element) {
				setTimeout(function() {
					c_element.classList.remove("input-changed");
				}, 100);
			})(element);

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

		let recentlyChangedInput = form.querySelectorAll(".input-changed");
		if(recentlyChangedInput.length > 0) {
			return;
		}

		let submitter = null;
		if(e.submitter instanceof HTMLButtonElement) {
			submitter = e.submitter;
		}

		this.submitForm(form, submitter);
	}

	prepareElementUpdate = (oldElement, newElement) => {
		if(!newElement) {
			return;
		}

		this.reattachEventListeners(oldElement, newElement);
		this.reattachFluxElements(oldElement, newElement);
	}

	reattachEventListeners = (oldElement, newElement) => {
		if(!newElement) {
			return;
		}

		this.reattachElementListeners(oldElement, newElement);

		oldElement.querySelectorAll("*").forEach(oldChild => {
			let xPath = DomPath.getXPathForElement(oldChild, oldElement);
			let newChild = DomPath.findInContext(newElement, xPath);

			if(newChild instanceof Element) {
				this.reattachElementListeners(oldChild, newChild);
			}
		});
	}

	reattachElementListeners = (oldElement, newElement) => {
		if(!this.elementEventMapper.has(oldElement)) {
			return;
		}

		let mapObj = this.elementEventMapper.get(oldElement);
		for(let type of Object.keys(mapObj)) {
			for(let listener of mapObj[type]) {
				newElement.addEventListener(type, listener);
				Flux.DEBUG && console.debug("Reattached listener to element:", newElement, listener);
			}
		}
	}

	reattachFluxElements = (oldElement, newElement) => {
		if(!newElement) {
			return;
		}

		newElement.querySelectorAll("[data-flux]").forEach(this.initFluxElement);
		oldElement.querySelectorAll("[data-flux-obj]").forEach(fluxElement => {
			let xPath = DomPath.getXPathForElement(fluxElement, oldElement);
			let newFluxElement = DomPath.findInContext(newElement, xPath);
			if(newFluxElement) {
				newFluxElement.fluxObj = fluxElement.fluxObj;
				newFluxElement.dataset["fluxObj"] = "";
			}
		});
	}
}

/**
 * This is required for when the user presses the back button in their browser.
 * Because we're pushing a history state, the back button would break. Adding
 * this simple function reloads the page when the back button is pressed.
 */
function handleWindowPopState() {
	window.addEventListener("popstate", e => {
		location.href = document.location;
	});
}
