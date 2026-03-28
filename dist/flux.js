// src/Style.es6
var Style = class {
  element;
  constructor() {
    this.setupElement();
  }
  setupElement() {
    this.element = document.createElement("style");
    this.element.id = "flux-style";
    this.element.innerHTML = CSS_CONTENT;
  }
  addToDocument() {
    document.head.append(this.element);
  }
};
var CSS_CONTENT = `
[data-flux="autosave"] {
	display: none;
}
`;

// src/ElementEventMapper.es6
var ElementEventMapper = class {
  map;
  addEventListenerOriginal;
  constructor() {
    this.map = /* @__PURE__ */ new WeakMap();
    this.addEventListenerOriginal = EventTarget.prototype.addEventListener;
    const self = this;
    Element.prototype.addEventListener = function(type, listener, options) {
      self.addEventListenerFlux(type, listener, options, this);
    };
  }
  has(element) {
    return this.map.has(element);
  }
  get(element) {
    return this.map.get(element);
  }
  /**
   * This function overrides the Element.addEventListener function. It is
   * required because Flux needs to keep track of all events that are
   * added to individual elements, so that when it updates the DOM and
   * replaces elements in place, it can re-attach any added events to the
   * newly replaced elements.
   *
   * The added functionality here stores a record of all "listener"
   * functions that are added to elements, within the this.map data
   * structure. Once we've kept a record of this, we call the original
   * addEventListener function of the browser.
   */
  addEventListenerFlux = (type, listener, options, element) => {
    if (!this.mapTypeContains(element, type, listener)) {
      this.addToMapType(element, type, listener);
    }
    this.addEventListenerOriginal.call(
      element,
      type,
      listener,
      options
    );
    Flux.DEBUG && console.debug(`Event ${type} added to element:`, element);
  };
  mapTypeContains = (element, type, listener) => {
    let mapObj = this.map.get(element);
    if (!mapObj || !mapObj[type]) {
      return false;
    }
    return mapObj[type].includes(listener);
  };
  addToMapType = (element, type, listener) => {
    let mapObj = this.map.get(element);
    if (!mapObj) {
      mapObj = {};
      this.map.set(element, mapObj);
    }
    if (!mapObj[type]) {
      mapObj[type] = [];
    }
    if (!mapObj[type].includes(listener)) {
      mapObj[type].push(listener);
    }
  };
};

// src/DomPath.es6
var DomPath = class {
  static getXPathForElement(element, context) {
    let xpath = "";
    if (context instanceof Document) {
      context = context.documentElement;
    }
    if (!context) {
      context = element.ownerDocument.documentElement;
    }
    while (element !== context) {
      let pos = 0;
      let sibling = element;
      while (sibling) {
        if (sibling.nodeName === element.nodeName) {
          pos += 1;
        }
        sibling = sibling.previousElementSibling;
      }
      xpath = `./${element.nodeName}[${pos}]/${xpath}`;
      element = element.parentElement;
    }
    return xpath.replace(/\/$/, "");
  }
  static findInDocument(document2, path) {
    return this.find(document2, document2.documentElement, path);
  }
  static findInContext(context, path) {
    if (!path) {
      return null;
    }
    return this.find(context.ownerDocument, context, path);
  }
  static find(document2, context, path) {
    if (!path) {
      return null;
    }
    return document2.evaluate(
      path,
      context,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  }
};

// src/UpdateTargetRegistry.es6
var UpdateTargetRegistry = class {
  collection = {};
  add(element, updateType) {
    let type = updateType ?? "_none";
    if (this.collection[type] === void 0) {
      this.collection[type] = [];
    }
    this.collection[type].push(element);
  }
  getTypes() {
    return Object.keys(this.collection);
  }
  getElements(type) {
    return this.collection[type] ?? [];
  }
  replace(type, existingElement, newElement) {
    let index = this.getElements(type).indexOf(existingElement);
    if (index < 0) {
      return;
    }
    this.collection[type][index] = newElement;
  }
};

// src/FocusStateManager.es6
var FocusStateManager = class {
  constructor(domPath = DomPath) {
    this.domPath = domPath;
  }
  markAutofocus(newDocument) {
    let autofocusElement = newDocument.querySelector("[autofocus]");
    if (autofocusElement) {
      autofocusElement.dataset["fluxAutofocus"] = "";
    }
  }
  capturePendingActiveElement(newDocument) {
    let activeContainer = document.querySelector("[data-flux-active]");
    if (!activeContainer) {
      return null;
    }
    let activeContainerPath = activeContainer.dataset["fluxPath"];
    let newActiveContainer = this.domPath.findInDocument(newDocument, activeContainerPath);
    if (!newActiveContainer) {
      return null;
    }
    let activeElementPath = activeContainer.dataset["fluxActive"];
    return this.domPath.findInContext(newActiveContainer, activeElementPath);
  }
  captureElementState(existingElement) {
    if (!existingElement.contains(document.activeElement)) {
      return null;
    }
    let activeElement = document.activeElement;
    let selection = null;
    if (activeElement.selectionStart >= 0 && activeElement.selectionEnd >= 0) {
      selection = [activeElement.selectionStart, activeElement.selectionEnd];
    }
    return {
      path: this.domPath.getXPathForElement(activeElement),
      selection
    };
  }
  restoreElementState(elementState) {
    if (!elementState) {
      return;
    }
    let elementToActivate = this.domPath.findInDocument(document, elementState.path);
    if (!elementToActivate) {
      return;
    }
    elementToActivate.focus();
    if (elementState.selection && elementToActivate.setSelectionRange) {
      elementToActivate.setSelectionRange(
        elementState.selection[0],
        elementState.selection[1]
      );
    }
  }
  restorePendingActiveElement(newActiveElement) {
    if (!newActiveElement) {
      return;
    }
    newActiveElement.focus();
    newActiveElement.blur();
  }
  focusMarkedAutofocusElements() {
    document.querySelectorAll("[data-flux-autofocus]").forEach((autofocusElement) => {
      autofocusElement.focus();
    });
  }
  storeFormState(form, activeElement) {
    form.dataset["fluxPath"] = this.domPath.getXPathForElement(form);
    form.dataset["fluxActive"] = this.domPath.getXPathForElement(
      activeElement,
      form
    );
  }
};

// src/NavigationController.es6
var NavigationController = class {
  constructor(parser = new DOMParser(), fetcher = globalThis.fetch.bind(globalThis), historyObject = globalThis.history, logger = console) {
    this.parser = parser;
    this.fetcher = fetcher;
    this.historyObject = historyObject;
    this.logger = logger;
  }
  submitForm(form, formData, onDocument) {
    return this.navigate(
      form,
      form.action,
      {
        method: form.getAttribute("method"),
        credentials: "same-origin",
        body: formData
      },
      {
        action: "submitForm",
        errorPrefix: "Form submission error"
      },
      onDocument
    );
  }
  clickLink(link, onDocument) {
    return this.navigate(
      link,
      link.href,
      {
        credentials: "same-origin"
      },
      {
        action: "clickLink",
        errorPrefix: "Link fetch error"
      },
      onDocument
    );
  }
  async navigate(element, url, requestOptions, historyState, onDocument) {
    element.classList.add("submitting");
    try {
      let response = await this.fetcher(url, requestOptions);
      if (!response.ok) {
        throw new Error(`${historyState.errorPrefix}: ${response.status} ${response.statusText}`);
      }
      this.historyObject.pushState({
        action: historyState.action
      }, "", response.url);
      let html = await response.text();
      let document2 = this.parser.parseFromString(html, "text/html");
      onDocument(document2);
      return document2;
    } catch (error) {
      this.logger.error(error);
      return null;
    } finally {
      element.classList.remove("submitting");
    }
  }
};

// src/DocumentUpdater.es6
var DocumentUpdater = class {
  constructor(updateTargetRegistry, focusStateManager, prepareElementUpdate = () => {
  }, domPath = DomPath, logger = console, debug = false) {
    this.updateTargetRegistry = updateTargetRegistry;
    this.focusStateManager = focusStateManager;
    this.prepareElementUpdate = prepareElementUpdate;
    this.domPath = domPath;
    this.logger = logger;
    this.debug = debug;
  }
  apply(newDocument) {
    this.focusStateManager.markAutofocus(newDocument);
    let newActiveElement = this.focusStateManager.capturePendingActiveElement(newDocument);
    for (let type of this.updateTargetRegistry.getTypes()) {
      this.updateTargetRegistry.getElements(type).forEach((existingElement) => {
        this.applyUpdateTarget(type, existingElement, newDocument);
      });
    }
    this.focusStateManager.restorePendingActiveElement(newActiveElement);
    if (this.debug && newActiveElement) {
      this.logger.debug("Focussed and blurred", newActiveElement);
    }
    this.focusStateManager.focusMarkedAutofocusElements();
  }
  applyUpdateTarget(type, existingElement, newDocument) {
    if (!existingElement) {
      return;
    }
    let activeElementState = this.focusStateManager.captureElementState(existingElement);
    let xPath = this.domPath.getXPathForElement(existingElement, document);
    let newElement = this.domPath.findInDocument(newDocument, xPath);
    if (type === "outer") {
      this.applyOuterUpdate(type, existingElement, newElement);
    } else if (type === "inner") {
      this.applyInnerUpdate(existingElement, newElement);
    }
    if (activeElementState) {
      if (this.debug) {
        this.logger.debug("Active element", activeElementState.path);
      }
      this.focusStateManager.restoreElementState(activeElementState);
    }
  }
  applyOuterUpdate(type, existingElement, newElement) {
    this.updateTargetRegistry.replace(type, existingElement, newElement);
    if (!newElement) {
      return;
    }
    this.prepareElementUpdate(existingElement, newElement);
    existingElement.replaceWith(newElement);
  }
  applyInnerUpdate(existingElement, newElement) {
    this.prepareElementUpdate(existingElement, newElement);
    while (existingElement.firstChild) {
      existingElement.removeChild(existingElement.firstChild);
    }
    while (newElement && newElement.firstChild) {
      existingElement.appendChild(newElement.firstChild);
    }
  }
};

// src/FluxDirectiveRegistry.es6
var DIRECTIVE_DEFINITIONS = Object.freeze({
  "": {
    handler: "autoContainer",
    description: "Initialise a container element for automatic Flux interactions."
  },
  "autosave": {
    handler: "autoSave",
    description: "Enable automatic background form submission on change."
  },
  "update": {
    handler: "updateOuter",
    description: "Register the element for outerHTML replacement on updates."
  },
  "update-outer": {
    handler: "updateOuter",
    description: "Register the element for outerHTML replacement on updates."
  },
  "update-inner": {
    handler: "updateInner",
    description: "Register the element for innerHTML replacement on updates."
  },
  "submit": {
    handler: "autoSubmit",
    description: "Submit the containing form in the background."
  },
  "link": {
    handler: "autoLink",
    description: "Follow the link in the background."
  }
});
var FluxDirectiveRegistry = class _FluxDirectiveRegistry {
  static DEFINITIONS = DIRECTIVE_DEFINITIONS;
  constructor(handlers) {
    this.handlers = handlers;
  }
  initElement(fluxElement) {
    let fluxType = fluxElement.dataset["flux"];
    let definition = _FluxDirectiveRegistry.DEFINITIONS[fluxType];
    if (!definition) {
      throw new TypeError(`Unknown flux element type: ${fluxType}`);
    }
    let handler = this.handlers[definition.handler];
    if (typeof handler !== "function") {
      throw new TypeError(`Missing Flux directive handler: ${definition.handler}`);
    }
    handler(fluxElement);
  }
  getDefinitions() {
    return _FluxDirectiveRegistry.DEFINITIONS;
  }
};

// src/FluxDomBridge.es6
var FluxDomBridge = class {
  constructor(elementEventMapper, initFluxElement, domPath = DomPath, logger = console, debug = false) {
    this.elementEventMapper = elementEventMapper;
    this.initFluxElement = initFluxElement;
    this.domPath = domPath;
    this.logger = logger;
    this.debug = debug;
  }
  prepareElementUpdate = (oldElement, newElement) => {
    if (!newElement) {
      return;
    }
    this.reattachEventListeners(oldElement, newElement);
    this.reattachFluxElements(oldElement, newElement);
  };
  reattachEventListeners(oldElement, newElement) {
    if (!newElement) {
      return;
    }
    this.reattachElementListeners(oldElement, newElement);
    oldElement.querySelectorAll("*").forEach((oldChild) => {
      let xPath = this.domPath.getXPathForElement(oldChild, oldElement);
      let newChild = this.domPath.findInContext(newElement, xPath);
      if (newChild instanceof Element) {
        this.reattachElementListeners(oldChild, newChild);
      }
    });
  }
  reattachElementListeners(oldElement, newElement) {
    if (!this.elementEventMapper.has(oldElement)) {
      return;
    }
    let mapObj = this.elementEventMapper.get(oldElement);
    for (let type of Object.keys(mapObj)) {
      for (let listener of mapObj[type]) {
        newElement.addEventListener(type, listener);
        if (this.debug) {
          this.logger.debug("Reattached listener to element:", newElement, listener);
        }
      }
    }
  }
  reattachFluxElements(oldElement, newElement) {
    if (!newElement) {
      return;
    }
    newElement.querySelectorAll("[data-flux]").forEach(this.initFluxElement);
    oldElement.querySelectorAll("[data-flux-obj]").forEach((fluxElement) => {
      let xPath = this.domPath.getXPathForElement(fluxElement, oldElement);
      let newFluxElement = this.domPath.findInContext(newElement, xPath);
      if (newFluxElement) {
        newFluxElement.fluxObj = fluxElement.fluxObj;
        newFluxElement.dataset["fluxObj"] = "";
      }
    });
  }
};

// src/FluxFormHandler.es6
var FluxFormHandler = class {
  constructor(navigationController, focusStateManager, onDocument, logger = console, debug = false) {
    this.navigationController = navigationController;
    this.focusStateManager = focusStateManager;
    this.onDocument = onDocument;
    this.logger = logger;
    this.debug = debug;
  }
  initAutoContainer = (fluxElement) => {
    if (fluxElement instanceof HTMLFormElement) {
      fluxElement.addEventListener("submit", this.formSubmitAutoSave);
    }
  };
  initAutoSave = (fluxElement) => {
    if (!(fluxElement instanceof HTMLButtonElement)) {
      throw new TypeError('data-flux type "autosave" must be applied to a button element.');
    }
    if (!fluxElement.form) {
      throw new TypeError('data-flux type "autosave" must have a containing form element.');
    }
    if (!fluxElement.form.fluxObj) {
      fluxElement.form.fluxObj = {};
    }
    fluxElement.form.fluxObj.autoSave = {
      key: fluxElement.name,
      value: fluxElement.value
    };
    fluxElement.form.dataset["fluxObj"] = "";
    fluxElement.form.addEventListener("change", this.formChangeAutoSave);
    fluxElement.form.addEventListener("submit", this.formSubmitAutoSave);
    if (this.debug) {
      this.logger.debug("initAutoSave completed", fluxElement);
    }
  };
  initAutoSubmit = (fluxElement) => {
    if (!(fluxElement instanceof HTMLButtonElement)) {
      throw new TypeError('data-flux type "submit" must be applied to a button element.');
    }
    if (!fluxElement.form) {
      throw new TypeError('data-flux type "submit" must have a containing form element.');
    }
    if (fluxElement.form.dataset["fluxSubmitInit"] !== void 0) {
      return;
    }
    fluxElement.form.dataset["fluxSubmitInit"] = "";
    fluxElement.form.addEventListener("submit", this.autoSubmit);
  };
  autoSubmit = (e) => {
    e.preventDefault();
    setTimeout(() => {
      this.submitForm(e.target, e.submitter);
    }, 0);
  };
  formChangeAutoSave = (e) => {
    let form = e.target;
    if (form.form instanceof HTMLFormElement) {
      let element = form;
      element.classList.add("input-changed");
      element.setAttribute("data-flux-active", "");
      setTimeout(() => {
        element.classList.remove("input-changed");
      }, 100);
      form = form.form;
    }
    this.submitForm(form);
  };
  formSubmitAutoSave = (e) => {
    e.preventDefault();
    let currentActiveElement = document.activeElement;
    if (currentActiveElement) {
      currentActiveElement.blur();
    }
    let form = e.target;
    if (form.form instanceof HTMLFormElement) {
      form = form.form;
    }
    this.focusStateManager.storeFormState(form, currentActiveElement);
    if (form.querySelectorAll(".input-changed").length > 0) {
      return;
    }
    let submitter = null;
    if (e.submitter instanceof HTMLButtonElement) {
      submitter = e.submitter;
    }
    this.submitForm(form, submitter);
  };
  submitForm(form, submitter) {
    let formData = this.getFormDataForButton(form, "autoSave", submitter);
    return this.navigationController.submitForm(form, formData, this.onDocument);
  }
  getFormDataForButton(form, type, submitter) {
    let formData = new FormData(form);
    if (submitter) {
      formData.set(submitter.name, submitter.value);
    } else if (form.fluxObj && form.fluxObj[type]) {
      formData.set(
        form.fluxObj[type].key,
        form.fluxObj[type].value
      );
    }
    return formData;
  }
};

// src/FluxLinkHandler.es6
var FluxLinkHandler = class {
  constructor(navigationController, onDocument, windowObject = globalThis.window) {
    this.navigationController = navigationController;
    this.onDocument = onDocument;
    this.windowObject = windowObject;
  }
  initAutoLink = (fluxElement) => {
    if (!(fluxElement instanceof HTMLAnchorElement)) {
      throw new TypeError('data-type type "link" must be applied to an anchor element.');
    }
    fluxElement.addEventListener("click", this.autoClick);
  };
  autoClick = (e) => {
    e.preventDefault();
    let link = e.currentTarget;
    this.scrollToTop();
    setTimeout(() => {
      this.clickLink(link);
    }, 0);
  };
  clickLink(link) {
    return this.navigationController.clickLink(link, this.onDocument);
  }
  scrollToTop() {
    if (!this.windowObject || typeof this.windowObject.scrollTo !== "function") {
      return;
    }
    this.windowObject.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth"
    });
  }
};

// src/FluxResponseHandler.es6
var FluxResponseHandler = class {
  constructor(documentUpdater, logger = console, debug = false, scheduler = globalThis.setTimeout.bind(globalThis), reload = () => location.reload(), alerter = globalThis.alert?.bind(globalThis), windowObject = globalThis.window, animationFrame = globalThis.requestAnimationFrame?.bind(globalThis)) {
    this.documentUpdater = documentUpdater;
    this.logger = logger;
    this.debug = debug;
    this.scheduler = scheduler;
    this.reload = reload;
    this.alerter = alerter;
    this.windowObject = windowObject;
    this.animationFrame = animationFrame;
  }
  handleDocument = (newDocument) => {
    if (!this.isProcessableDocument(newDocument)) {
      return;
    }
    this.scheduler(() => {
      this.documentUpdater.apply(newDocument);
    }, 0);
  };
  handleLinkDocument = (newDocument) => {
    if (!this.isProcessableDocument(newDocument)) {
      return;
    }
    this.scheduler(() => {
      this.documentUpdater.apply(newDocument);
      this.scrollToTopAfterPaint();
    }, 0);
  };
  isProcessableDocument(newDocument) {
    if (newDocument.head.children.length === 0) {
      if (this.debug && this.alerter) {
        this.alerter("Error processing new document!");
      }
      this.logger.error("Error processing new document!");
      this.reload();
      return false;
    }
    return true;
  }
  scrollToTopImmediately() {
    if (!this.windowObject || typeof this.windowObject.scrollTo !== "function") {
      return;
    }
    this.windowObject.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto"
    });
  }
  scrollToTopAfterPaint() {
    if (typeof this.animationFrame !== "function") {
      this.scheduler(() => {
        this.scrollToTopImmediately();
      }, 0);
      return;
    }
    this.animationFrame(() => {
      this.animationFrame(() => {
        this.scrollToTopImmediately();
      });
    });
  }
};

// src/Flux.es6
var Flux = class _Flux {
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
  constructor(style = void 0, elementEventMapper = void 0, parser = void 0, navigationController = void 0, updateTargetRegistry = void 0, focusStateManager = void 0, documentUpdater = void 0, directiveRegistry = void 0, domBridge = void 0, formHandler = void 0, linkHandler = void 0, responseHandler = void 0, logger = void 0) {
    console.log("GREG WAS HERE");
    handleWindowPopState();
    this.logger = logger ?? console;
    style = style ?? new Style();
    style.addToDocument();
    this.elementEventMapper = elementEventMapper ?? new ElementEventMapper();
    this.navigationController = navigationController ?? new NavigationController(
      parser ?? new DOMParser()
    );
    this.updateTargetRegistry = updateTargetRegistry ?? new UpdateTargetRegistry();
    this.focusStateManager = focusStateManager ?? new FocusStateManager();
    this.documentUpdater = documentUpdater ?? new DocumentUpdater(
      this.updateTargetRegistry,
      this.focusStateManager,
      (oldElement, newElement) => this.domBridge.prepareElementUpdate(oldElement, newElement),
      DomPath,
      console,
      _Flux.DEBUG
    );
    this.responseHandler = responseHandler ?? new FluxResponseHandler(
      this.documentUpdater,
      console,
      _Flux.DEBUG
    );
    this.formHandler = formHandler ?? new FluxFormHandler(
      this.navigationController,
      this.focusStateManager,
      this.responseHandler.handleDocument,
      console,
      _Flux.DEBUG
    );
    this.linkHandler = linkHandler ?? new FluxLinkHandler(
      this.navigationController,
      this.responseHandler.handleLinkDocument
    );
    this.domBridge = domBridge ?? new FluxDomBridge(
      this.elementEventMapper,
      this.initFluxElementSafely,
      DomPath,
      this.logger,
      _Flux.DEBUG
    );
    this.directiveRegistry = directiveRegistry ?? new FluxDirectiveRegistry({
      autoContainer: this.formHandler.initAutoContainer,
      autoSave: this.formHandler.initAutoSave,
      updateOuter: this.storeOuterUpdateElement,
      updateInner: this.storeInnerUpdateElement,
      autoSubmit: this.formHandler.initAutoSubmit,
      autoLink: this.linkHandler.initAutoLink
    });
    document.querySelectorAll("[data-flux]").forEach(this.initFluxElementSafely);
  }
  /**
   * Initialise a single element using the central Flux directive registry.
   */
  initFluxElement = (fluxElement) => {
    this.directiveRegistry.initElement(fluxElement);
  };
  initFluxElementSafely = (fluxElement) => {
    try {
      this.initFluxElement(fluxElement);
    } catch (error) {
      this.logger.error(
        `Error initialising flux element: ${fluxElement.dataset["flux"]}`,
        fluxElement,
        error
      );
    }
  };
  /**
   * Store a DOM element that should be refreshed when Flux processes
   * a new HTML document after an interaction.
   */
  storeUpdateElement = (element, updateType) => {
    this.updateTargetRegistry.add(element, updateType);
    _Flux.DEBUG && console.debug("storeUpdateElement completed", `Pushing into ${updateType}: `, element);
  };
  storeOuterUpdateElement = (element) => {
    this.storeUpdateElement(element, "outer");
  };
  storeInnerUpdateElement = (element) => {
    this.storeUpdateElement(element, "inner");
  };
  submitForm = (form, submitter) => {
    return this.formHandler.submitForm(form, submitter);
  };
  clickLink = (link) => {
    return this.linkHandler.clickLink(link);
  };
  getFormDataForButton = (form, type, submitter) => {
    return this.formHandler.getFormDataForButton(form, type, submitter);
  };
  completeAutoSave = (newDocument) => {
    this.responseHandler.handleDocument(newDocument);
  };
  formChangeAutoSave = (e) => {
    this.formHandler.formChangeAutoSave(e);
  };
  formSubmitAutoSave = (e) => {
    this.formHandler.formSubmitAutoSave(e);
  };
};
function handleWindowPopState() {
  window.addEventListener("popstate", (e) => {
    location.href = document.location;
  });
}

// src/FluxDebug.es6
var FluxDebug = class {
  static {
    Flux.DEBUG = true;
  }
};

// src/main.es6
new Flux();
export {
  FluxDebug
};
