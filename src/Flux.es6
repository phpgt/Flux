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
		configureFromDocumentAttributes();
		takeControlOfNativeScrollRestoration();
		handleWindowPopState();
		restoreScrollPositionAfterReload();
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
			element => this.domBridge.reviveScripts(element),
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
		this.responseHandler.onLiveDocumentUsed = this.liveHandler.markAllTargetsRefreshed;
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
			this.storeOuterUpdateElement(fluxElement);
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
 * Because we're pushing a history state, the back button would break. Reload
 * the target URL and bridge the saved scroll position through sessionStorage.
 */
function handleWindowPopState() {
	if(window.__fluxPopStateHandlerAttached) {
		return;
	}

	window.__fluxPopStateHandlerAttached = true;
	window.addEventListener("popstate", e => {
		storePopStateScrollPosition(e.state);
		location.href = document.location;
	});
}

function configureFromDocumentAttributes() {
	let scrollBehavior = document.body?.dataset?.fluxScroll
		?? document.documentElement?.dataset?.fluxScroll;

	RuntimeConfig.configure({
		scrollBehavior,
	});
}

function takeControlOfNativeScrollRestoration() {
	if("scrollRestoration" in history) {
		history.scrollRestoration = "manual";
	}
}

function storePopStateScrollPosition(state) {
	let scrollPosition = getScrollPositionFromState(state);
	if(!scrollPosition) {
		return;
	}

	try {
		sessionStorage.setItem(getScrollStorageKey(location.href), JSON.stringify(scrollPosition));
	}
	catch(error) {
		// Ignore storage failures; back navigation still works without restoration.
	}
}

function getScrollPositionFromState(state) {
	if(!state || typeof state !== "object") {
		return null;
	}

	if(Number.isFinite(state.fluxScrollY)) {
		return {
			x: Number.isFinite(state.fluxScrollX) ? state.fluxScrollX : 0,
			y: state.fluxScrollY,
			behavior: state.fluxScrollBehavior,
			path: state.fluxScrollPath,
		};
	}

	if(state.action === "clickLink") {
		return {
			x: 0,
			y: 0,
		};
	}

	return null;
}

function restoreScrollPositionAfterReload() {
	let scrollPosition = readStoredScrollPosition();
	if(!scrollPosition) {
		return;
	}

	let restore = () => window.scrollTo({
		top: scrollPosition.y,
		left: scrollPosition.x,
		behavior: scrollPosition.behavior ?? RuntimeConfig.restoreScrollBehavior,
	});

	let scrollTarget = getScrollTarget(scrollPosition);
	if(scrollTarget) {
		restore = () => scrollElementTo(
			scrollTarget,
			scrollPosition.y,
			scrollPosition.x,
			scrollPosition.behavior ?? RuntimeConfig.restoreScrollBehavior,
		);
	}

	if(typeof requestAnimationFrame !== "function") {
		setTimeout(restore, 0);
		return;
	}

	requestAnimationFrame(() => {
		requestAnimationFrame(restore);
	});
	setTimeout(restore, 50);
}

function getScrollTarget(scrollPosition) {
	if(!scrollPosition.path) {
		return null;
	}

	return DomPath.findInDocument(document, scrollPosition.path);
}

function scrollElementTo(element, top, left, behavior) {
	if(typeof element.scrollTo === "function") {
		element.scrollTo({
			top,
			left,
			behavior,
		});
		return;
	}

	element.scrollTop = top;
	element.scrollLeft = left;
}

function readStoredScrollPosition() {
	let key = getScrollStorageKey(location.href);

	try {
		let value = sessionStorage.getItem(key);
		sessionStorage.removeItem(key);
		if(!value) {
			return null;
		}

		let scrollPosition = JSON.parse(value);
		if(!Number.isFinite(scrollPosition?.y)) {
			return null;
		}

		return {
			x: Number.isFinite(scrollPosition.x) ? scrollPosition.x : 0,
			y: scrollPosition.y,
			behavior: scrollPosition.behavior,
			path: scrollPosition.path,
		};
	}
	catch(error) {
		return null;
	}
}

function getScrollStorageKey(url) {
	return `flux-scroll:${url}`;
}
