import {Style} from "./Style.es6";
import {ElementEventMapper} from "./ElementEventMapper.es6";
import {DomPath} from "./DomPath.es6";
import {UpdateTargetRegistry} from "./UpdateTargetRegistry.es6";
import {FocusStateManager} from "./FocusStateManager.es6";
import {NavigationController} from "./NavigationController.es6";
import {DocumentUpdater} from "./DocumentUpdater.es6";
import {FluxDirectiveRegistry} from "./FluxDirectiveRegistry.es6";
import {FluxDomBridge} from "./FluxDomBridge.es6";
import {FluxFormHandler} from "./FluxFormHandler.es6";
import {FluxLinkHandler} from "./FluxLinkHandler.es6";
import {FluxResponseHandler} from "./FluxResponseHandler.es6";

export class Flux {
	static DEBUG = false;
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
		logger = undefined,
	) {
		handleWindowPopState();
		this.logger = logger ?? console;
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
			(oldElement, newElement) => this.domBridge.prepareElementUpdate(oldElement, newElement),
			DomPath,
			console,
			Flux.DEBUG,
		);
		this.responseHandler = responseHandler ?? new FluxResponseHandler(
			this.documentUpdater,
			console,
			Flux.DEBUG,
		);
		this.formHandler = formHandler ?? new FluxFormHandler(
			this.navigationController,
			this.focusStateManager,
			this.responseHandler.handleDocument,
			console,
			Flux.DEBUG,
		);
		this.linkHandler = linkHandler ?? new FluxLinkHandler(
			this.navigationController,
			this.responseHandler.handleLinkDocument,
		);
		this.domBridge = domBridge ?? new FluxDomBridge(
			this.elementEventMapper,
			this.initFluxElementSafely,
			DomPath,
			this.logger,
			Flux.DEBUG,
		);
		this.directiveRegistry = directiveRegistry ?? new FluxDirectiveRegistry({
			autoContainer: this.formHandler.initAutoContainer,
			autoSave: this.formHandler.initAutoSave,
			updateOuter: this.storeOuterUpdateElement,
			updateInner: this.storeInnerUpdateElement,
			autoSubmit: this.formHandler.initAutoSubmit,
			autoLink: this.linkHandler.initAutoLink,
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

	/**
	 * Store a DOM element that should be refreshed when Flux processes
	 * a new HTML document after an interaction.
	 */
	storeUpdateElement = (element, updateType) => {
		this.updateTargetRegistry.add(element, updateType);
		Flux.DEBUG && console.debug("storeUpdateElement completed", `Pushing into ${updateType}: `, element);
	}

	storeOuterUpdateElement = (element) => {
		this.storeUpdateElement(element, "outer");
	}

	storeInnerUpdateElement = (element) => {
		this.storeUpdateElement(element, "inner");
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
