import {Style} from "./Style.es6";
import {ElementEventMapper} from "./ElementEventMapper.es6";
import {DomPath} from "./DomPath.es6";
import {UpdateTargetRegistry} from "./UpdateTargetRegistry.es6";
import {FocusStateManager} from "./FocusStateManager.es6";
import {NavigationController} from "./NavigationController.es6";
import {DocumentUpdater} from "./DocumentUpdater.es6";
import {DirectiveRegistry} from "./DirectiveRegistry.es6";
import {DomBridge} from "./DomBridge.es6";
import {FormHandler} from "./FormHandler.es6";
import {LinkHandler} from "./LinkHandler.es6";
import {ResponseHandler} from "./ResponseHandler.es6";
import {LiveHandler} from "./LiveHandler.es6";
import {AutocompleteHandler} from "./AutocompleteHandler.es6";
import {Handler as DragOrderHandler} from "./DragOrder/Handler.es6";
import {RuntimeConfig} from "./RuntimeConfig.es6";

/**
 * Main coordinator that boots Flux on the current document.
 * It creates the small handlers, registers data-flux directives,
 * and initialises every element that declares Flux behaviour.
 */
export class Flux {
	static get DEBUG() {
		return RuntimeConfig.debug;
	}

	static set DEBUG(value) {
		RuntimeConfig.debug = Boolean(value);
	}

	style;
	elementEventMapper;
	navigationController;
	updateTargetRegistry;
	focusStateManager;
	documentUpdater;
	directiveRegistry;
	domBridge;
	formHandler;
	linkHandler;
	responseHandler;
	liveHandler;
	autocompleteHandler;
	dragOrderHandler;
	logger;

	constructor(
		style = undefined,
		elementEventMapper = undefined,
		parser = undefined,
		navigationController = undefined,
		updateTargetRegistry = undefined,
		focusStateManager = undefined,
		documentUpdater = undefined,
		directiveRegistry = undefined,
		domBridge = undefined,
		formHandler = undefined,
		linkHandler = undefined,
		responseHandler = undefined,
		liveHandler = undefined,
		logger = undefined,
		dragOrderHandler = undefined,
		autocompleteHandler = undefined,
	) {
		handleWindowPopState();
		this.logger = logger ?? console;
		style = style ?? new Style();
		style.addToDocument();
		this.elementEventMapper = elementEventMapper ?? new ElementEventMapper(this.logger, Flux.DEBUG);
		this.navigationController = navigationController ?? new NavigationController(
			parser ?? new DOMParser(),
		);
		this.updateTargetRegistry = updateTargetRegistry ?? new UpdateTargetRegistry();
		this.focusStateManager = focusStateManager ?? new FocusStateManager();
		this.domBridge = domBridge ?? new DomBridge(
			this.elementEventMapper,
			this.initFluxElementSafely,
			DomPath,
			this.logger,
			Flux.DEBUG,
		);
		this.documentUpdater = documentUpdater ?? new DocumentUpdater(
			this.updateTargetRegistry,
			this.focusStateManager,
			(oldElement, newElement) => this.domBridge.prepareElementUpdate(oldElement, newElement),
			DomPath,
			this.logger,
			Flux.DEBUG,
		);
		this.responseHandler = responseHandler ?? new ResponseHandler(
			this.documentUpdater,
			this.logger,
			Flux.DEBUG,
		);
		this.formHandler = formHandler ?? new FormHandler(
			this.navigationController,
			this.focusStateManager,
			this.responseHandler.handleDocument,
			this.responseHandler.handleLinkDocument,
			this.logger,
			Flux.DEBUG,
		);
		this.linkHandler = linkHandler ?? new LinkHandler(
			this.navigationController,
			this.responseHandler.handleLinkDocument,
		);
		this.liveHandler = liveHandler ?? new LiveHandler(
			this.navigationController,
			this.updateTargetRegistry,
			this.responseHandler.handleLiveDocument,
			this.logger,
			Flux.DEBUG,
			globalThis.setTimeout.bind(globalThis),
			globalThis.clearTimeout.bind(globalThis),
			globalThis.location,
			1000,
			() => Date.now(),
			DomPath,
		);
		this.autocompleteHandler = autocompleteHandler ?? new AutocompleteHandler(
			this.navigationController,
			this.logger,
			Flux.DEBUG,
		);
		this.dragOrderHandler = dragOrderHandler ?? new DragOrderHandler(
			this.formHandler,
			document,
			this.logger,
			Flux.DEBUG,
		);
		this.directiveRegistry = directiveRegistry ?? new DirectiveRegistry({
			autoContainer: this.initAutoContainer,
			autoSave: this.formHandler.initAutoSave,
			updateOuter: this.storeOuterUpdateElement,
			updateInner: this.storeInnerUpdateElement,
			updateLinkOuter: this.storeLinkOuterUpdateElement,
			updateLinkInner: this.storeLinkInnerUpdateElement,
			liveOuter: this.storeLiveOuterUpdateElement,
			liveInner: this.storeLiveInnerUpdateElement,
			updateAttributes: this.storeAttributesUpdateElement,
			autoSubmit: this.formHandler.initAutoSubmit,
			autocomplete: this.autocompleteHandler.initAutocomplete,
			autocompleteResults: this.autocompleteHandler.initAutocompleteResults,
			autoLink: this.linkHandler.initAutoLink,
			dragOrder: this.dragOrderHandler.initDragOrder,
		});

		document.querySelectorAll("[data-flux]").forEach(this.initFluxElementSafely);
	}

	/**
	 * Initialise a single element using the central Flux directive registry.
	 */
	initFluxElement = (fluxElement) => {
		this.directiveRegistry.initElement(fluxElement);
	}

	initFluxElementSafely = (fluxElement) => {
		try {
			this.initFluxElement(fluxElement);
		}
		catch(error) {
			this.logger.error(
				`Error initialising flux element: ${fluxElement.dataset["flux"]}`,
				fluxElement,
				error,
			);
		}
	}

	initAutoContainer = (fluxElement) => {
		if(fluxElement instanceof HTMLFormElement) {
			this.formHandler.initAutoContainer(fluxElement);
		}
		else if(fluxElement instanceof HTMLAnchorElement) {
			this.linkHandler.initAutoLink(fluxElement);
		}
		else {
			throw new TypeError("Bare data-flux must be applied to a form, button, or anchor element.");
		}
	}

	/**
	 * Store a DOM element that should be refreshed when Flux processes
	 * a new HTML document after an interaction.
	 */
	storeUpdateElement = (element, updateType) => {
		this.updateTargetRegistry.add(element, updateType);
		if(Flux.DEBUG) {
			this.logger.debug("storeUpdateElement completed", `Pushing into ${updateType}: `, element);
		}
	}

	storeOuterUpdateElement = (element) => {
		this.storeUpdateElement(element, "outer");
	}

	storeInnerUpdateElement = (element) => {
		this.storeUpdateElement(element, "inner");
	}

	storeLinkOuterUpdateElement = (element) => {
		this.storeUpdateElement(element, "link-outer");
	}

	storeLinkInnerUpdateElement = (element) => {
		this.storeUpdateElement(element, "link-inner");
	}

	storeLiveOuterUpdateElement = (element) => {
		this.liveHandler.register("live-outer", element);
	}

	storeLiveInnerUpdateElement = (element) => {
		this.liveHandler.register("live-inner", element);
	}

	storeAttributesUpdateElement = (element) => {
		this.storeUpdateElement(element, "attributes");
	}

	submitForm = (form, submitter) => {
		return this.formHandler.submitForm(form, submitter);
	}

	clickLink = (link) => {
		return this.linkHandler.clickLink(link);
	}

	getFormDataForButton = (form, type, submitter) => {
		return this.formHandler.getFormDataForButton(form, type, submitter);
	}

	completeAutoSave = (newDocument) => {
		this.responseHandler.handleDocument(newDocument);
	}

	formChangeAutoSave = (e) => {
		this.formHandler.formChangeAutoSave(e);
	}

	formSubmitAutoSave = (e) => {
		this.formHandler.formSubmitAutoSave(e);
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
