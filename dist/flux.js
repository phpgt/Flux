// src/Style.es6
var Style = class {
  element;
  constructor(documentObject = globalThis.document) {
    this.documentObject = documentObject;
    this.setupElement();
  }
  setupElement() {
    this.element = this.documentObject.createElement("style");
    this.element.id = "flux-style";
    this.element.innerHTML = CSS_CONTENT;
  }
  addToDocument() {
    this.documentObject.head.append(this.element);
  }
};
var CSS_CONTENT = `
[data-flux="autosave"] {
	display: none;
}

.drag-handle {
	cursor: move;
	user-select: none;
	touch-action: none;
}

.drag-handle::before {
	content: attr(data-flux-title);
}

.flux-drag-order-dragging {
	opacity: 0;
}

.flux-drag-order-floating {
	box-sizing: border-box;
	position: fixed;
	z-index: 2147483647;
	pointer-events: none;
	opacity: 0.85;
	transform-origin: top left;
}
`;

// src/ElementEventMapper.es6
var ElementEventMapper = class {
  map;
  addEventListenerOriginal;
  constructor(logger = console, debug = false) {
    this.map = /* @__PURE__ */ new WeakMap();
    this.addEventListenerOriginal = EventTarget.prototype.addEventListener;
    this.logger = logger;
    this.debug = debug;
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
    if (this.debug) {
      this.logger.debug(`Event ${type} added to element:`, element);
    }
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
    if (!element) {
      return null;
    }
    let xpath = "";
    if (context instanceof Document) {
      context = context.documentElement;
    }
    if (!context) {
      context = element.ownerDocument?.documentElement;
    }
    if (!context) {
      return null;
    }
    while (element && element !== context) {
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
    if (element !== context) {
      return null;
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
    if (this.collection[type].includes(element)) {
      return;
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
  remove(type, existingElement) {
    let index = this.getElements(type).indexOf(existingElement);
    if (index < 0) {
      return;
    }
    this.collection[type].splice(index, 1);
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
    let elementState = {
      path: this.domPath.getXPathForElement(activeElement),
      selection
    };
    if (activeElement instanceof HTMLInputElement) {
      if (activeElement.type !== "file") {
        elementState.value = activeElement.value;
      }
      if (activeElement.type === "checkbox" || activeElement.type === "radio") {
        elementState.checked = activeElement.checked;
      }
    } else if (activeElement instanceof HTMLTextAreaElement) {
      elementState.value = activeElement.value;
    } else if (activeElement instanceof HTMLSelectElement) {
      elementState.value = activeElement.value;
      if (activeElement.multiple) {
        elementState.selectedValues = Array.from(activeElement.options).filter((option) => option.selected).map((option) => option.value);
      }
    }
    return elementState;
  }
  restoreElementState(elementState) {
    if (!elementState) {
      return;
    }
    let elementToActivate = this.domPath.findInDocument(document, elementState.path);
    if (!elementToActivate) {
      return;
    }
    if ("selectedValues" in elementState && elementToActivate instanceof HTMLSelectElement) {
      let selectedValueSet = new Set(elementState.selectedValues);
      Array.from(elementToActivate.options).forEach((option) => {
        option.selected = selectedValueSet.has(option.value);
      });
    } else if ("value" in elementState && "value" in elementToActivate) {
      elementToActivate.value = elementState.value;
    }
    if ("checked" in elementState && elementToActivate instanceof HTMLInputElement) {
      elementToActivate.checked = elementState.checked;
    }
    elementToActivate.focus();
    if (elementState.selection && elementToActivate.setSelectionRange) {
      elementToActivate.setSelectionRange(
        elementState.selection[0],
        elementState.selection[1]
      );
    }
  }
  withoutUnchangedRequestValues(elementState, requestElementState) {
    if (!elementState || !requestElementState) {
      return elementState;
    }
    if (elementState.path !== requestElementState.path) {
      return elementState;
    }
    let restoreState = { ...elementState };
    if ("value" in restoreState && "value" in requestElementState && restoreState.value === requestElementState.value) {
      delete restoreState.value;
      delete restoreState.selection;
    }
    if ("selectedValues" in restoreState && "selectedValues" in requestElementState && this.arraysMatch(restoreState.selectedValues, requestElementState.selectedValues)) {
      delete restoreState.selectedValues;
    }
    if ("checked" in restoreState && "checked" in requestElementState && restoreState.checked === requestElementState.checked) {
      delete restoreState.checked;
    }
    return restoreState;
  }
  arraysMatch(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => value === right[index]);
  }
  restorePendingActiveElement(newActiveElement) {
    if (!newActiveElement) {
      return;
    }
    newActiveElement.focus();
  }
  focusMarkedAutofocusElements() {
    document.querySelectorAll("[data-flux-autofocus]").forEach((autofocusElement) => {
      autofocusElement.focus();
    });
  }
  storeFormState(form, activeElement) {
    let formPath = this.domPath.getXPathForElement(form);
    if (formPath) {
      form.dataset["fluxPath"] = formPath;
    }
    let activePath = this.domPath.getXPathForElement(
      activeElement,
      form
    );
    if (activePath) {
      form.dataset["fluxActive"] = activePath;
    } else {
      delete form.dataset["fluxActive"];
    }
  }
};

// src/NavigationController.es6
var NavigationController = class {
  constructor(parser = new DOMParser(), fetcher = globalThis.fetch.bind(globalThis), historyObject = globalThis.history, logger = console, documentObject = globalThis.document, windowObject = globalThis.window, domPath = DomPath) {
    this.parser = parser;
    this.fetcher = fetcher;
    this.historyObject = historyObject;
    this.logger = logger;
    this.documentObject = documentObject;
    this.windowObject = windowObject;
    this.domPath = domPath;
  }
  submitForm(form, formData, onDocument, submitter = null) {
    return this.requestForm(form, formData, onDocument, submitter, "submitForm");
  }
  fetchForm(form, formData, onDocument, submitter = null) {
    return this.requestForm(form, formData, onDocument, submitter, null);
  }
  requestForm(form, formData, onDocument, submitter = null, historyAction = "submitForm") {
    let method = (form.getAttribute("method") ?? "get").toLowerCase();
    let url = form.action;
    let requestOptions = {
      method,
      credentials: "same-origin"
    };
    if (method === "get") {
      url = this.appendFormDataToUrl(url, formData);
    } else {
      requestOptions.body = formData;
    }
    return this.navigate(
      form,
      url,
      requestOptions,
      {
        action: historyAction,
        errorPrefix: "Form submission error"
      },
      onDocument,
      this.getFormWaitingTargets(form, submitter)
    );
  }
  appendFormDataToUrl(url, formData) {
    let urlObject = new URL(url, globalThis.location?.href);
    let searchParams = new URLSearchParams();
    for (let [key, value] of formData.entries()) {
      searchParams.append(key, value);
    }
    urlObject.search = searchParams.toString();
    return urlObject.toString();
  }
  clickLink(link, onDocument) {
    let scrollState = this.getScrollStateForElement(link);
    return this.navigate(
      link,
      link.href,
      {
        credentials: "same-origin"
      },
      {
        action: "clickLink",
        errorPrefix: "Link fetch error",
        scrollX: 0,
        scrollY: 0,
        scrollBehavior: scrollState.behavior,
        scrollPath: scrollState.path
      },
      onDocument,
      this.getLinkWaitingTargets(link)
    );
  }
  pollDocument(url, onDocument) {
    return this.requestDocument(
      url,
      {
        credentials: "same-origin"
      },
      {
        action: null,
        errorPrefix: "Live update error"
      },
      onDocument,
      false
    );
  }
  async navigate(element, url, requestOptions, historyState, onDocument, waitingTargets = []) {
    for (let { element: waitingElement, className } of waitingTargets) {
      waitingElement?.classList?.add(className);
    }
    try {
      return await this.requestDocument(url, requestOptions, historyState, onDocument, true);
    } catch (error) {
      return null;
    } finally {
      for (let { element: waitingElement, className } of waitingTargets) {
        waitingElement?.classList?.remove(className);
      }
    }
  }
  getFormWaitingTargets(form, submitter) {
    let waitingTargets = [
      { element: form, className: "flux-form-waiting" }
    ];
    if (this.documentObject?.body) {
      waitingTargets.push({
        element: this.documentObject.body,
        className: "flux-form-waiting"
      });
    }
    if (submitter instanceof HTMLButtonElement) {
      waitingTargets.push({
        element: submitter,
        className: "flux-button-waiting"
      });
    }
    return waitingTargets;
  }
  getLinkWaitingTargets(link) {
    let waitingTargets = [
      { element: link, className: "flux-link-waiting" }
    ];
    if (this.documentObject?.body) {
      waitingTargets.push({
        element: this.documentObject.body,
        className: "flux-link-waiting"
      });
    }
    return waitingTargets;
  }
  async requestDocument(url, requestOptions, historyState, onDocument, allowErrorDocument = false) {
    let method = (requestOptions.method ?? "get").toLowerCase();
    try {
      let absoluteUrl = new URL(url, globalThis.location?.href).toString();
      let requestDetail = {
        url: absoluteUrl,
        requestOptions: {
          ...requestOptions,
          method
        },
        method,
        historyState
      };
      this.dispatchFluxEvent("flux:before-request", requestDetail);
      let response = await this.fetcher(requestDetail.url, {
        ...requestOptions,
        ...requestDetail.requestOptions
      });
      if (response.status === 304) {
        return null;
      }
      if (!response.ok && !allowErrorDocument) {
        throw new Error(`${historyState.errorPrefix}: ${response.status} ${response.statusText}`);
      }
      let html = await response.text();
      let document2 = this.parser.parseFromString(html, "text/html");
      if (historyState.action) {
        this.storeScrollPositionForCurrentEntry(historyState);
        this.historyObject.pushState(
          this.createHistoryState(historyState),
          "",
          response.url
        );
      }
      if (historyState.action === "clickLink") {
        onDocument(document2, this.createHistoryState(historyState));
      } else {
        onDocument(document2);
      }
      return document2;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }
  createHistoryState(historyState) {
    let state = {
      action: historyState.action
    };
    if (Number.isFinite(historyState.scrollY)) {
      state.fluxScrollX = Number.isFinite(historyState.scrollX) ? historyState.scrollX : 0;
      state.fluxScrollY = historyState.scrollY;
      if (historyState.scrollBehavior) {
        state.fluxScrollBehavior = historyState.scrollBehavior;
      }
      if (historyState.scrollPath) {
        state.fluxScrollPath = historyState.scrollPath;
      }
    }
    return state;
  }
  storeScrollPositionForCurrentEntry(historyState = {}) {
    if (typeof this.historyObject?.replaceState !== "function") {
      return;
    }
    let currentState = this.historyObject.state;
    if (!currentState || typeof currentState !== "object") {
      currentState = {};
    }
    this.historyObject.replaceState({
      ...currentState,
      ...this.getCurrentScrollStateFromHistoryState(historyState, currentState)
    }, "");
  }
  getCurrentScrollStateFromHistoryState(historyState, currentState) {
    let scrollPath = historyState.scrollPath ?? currentState.fluxScrollPath;
    let scrollElement = this.getScrollElementFromPath(scrollPath);
    let state = this.getScrollStateForElement(scrollElement ?? this.documentObject?.body);
    return {
      fluxScrollX: state.x,
      fluxScrollY: state.y,
      ...state.behavior ? { fluxScrollBehavior: state.behavior } : {},
      ...state.path ? { fluxScrollPath: state.path } : {}
    };
  }
  getScrollStateForElement(element) {
    let scrollElement = element?.closest?.("[data-flux-scroll]");
    let behavior = scrollElement?.dataset?.fluxScroll;
    if (behavior !== "smooth" && behavior !== "auto") {
      behavior = null;
    }
    if (scrollElement && scrollElement !== this.documentObject?.body && scrollElement !== this.documentObject?.documentElement) {
      return {
        x: scrollElement.scrollLeft,
        y: scrollElement.scrollTop,
        behavior,
        path: this.domPath.getXPathForElement(scrollElement, this.documentObject)
      };
    }
    return {
      x: this.windowObject?.scrollX ?? 0,
      y: this.windowObject?.scrollY ?? 0,
      behavior,
      path: null
    };
  }
  getScrollElementFromPath(path) {
    if (!path || !this.documentObject) {
      return null;
    }
    return this.domPath.findInDocument(this.documentObject, path);
  }
  dispatchFluxEvent(name, detail) {
    this.documentObject?.dispatchEvent?.(new CustomEvent(name, {
      bubbles: true,
      detail
    }));
  }
};

// src/DocumentUpdater.es6
var DocumentUpdater = class {
  constructor(updateTargetRegistry, focusStateManager, prepareElementUpdate = () => {
  }, completeElementUpdate = () => {
  }, domPath = DomPath, logger = console, debug = false) {
    this.updateTargetRegistry = updateTargetRegistry;
    this.focusStateManager = focusStateManager;
    this.prepareElementUpdate = prepareElementUpdate;
    this.completeElementUpdate = completeElementUpdate;
    this.domPath = domPath;
    this.logger = logger;
    this.debug = debug;
  }
  apply(newDocument, allowedTypes = void 0, allowedTargetKeys = void 0, requestElementState = null) {
    this.focusStateManager.markAutofocus(newDocument);
    let newActiveElement = this.focusStateManager.capturePendingActiveElement(newDocument);
    let allowedTypeSet = allowedTypes ? new Set(allowedTypes) : null;
    let allowedTargetKeySet = allowedTargetKeys ? new Set(allowedTargetKeys) : null;
    let updateTypeSnapshot = /* @__PURE__ */ new Map();
    let updates = [];
    for (let type of this.updateTargetRegistry.getTypes()) {
      if (allowedTypeSet && !allowedTypeSet.has(type)) {
        continue;
      }
      updateTypeSnapshot.set(type, Array.from(this.updateTargetRegistry.getElements(type)));
    }
    for (let [type, elements] of updateTypeSnapshot) {
      elements.forEach((existingElement) => {
        if (allowedTargetKeySet) {
          let targetKey = this.getTargetKey(type, existingElement);
          if (!allowedTargetKeySet.has(targetKey)) {
            return;
          }
        }
        let update = this.createUpdateTarget(type, existingElement, newDocument);
        if (update) {
          updates.push(update);
        }
      });
    }
    updates = this.withoutTargetsDisconnectedByOuterUpdates(updates);
    if (updates.length > 0) {
      this.dispatchFluxEvent("flux:before-render", { updates });
      updates.forEach((update) => this.applyUpdate(update, requestElementState));
      this.dispatchFluxEvent("flux:after-render", { updates });
    }
    this.focusStateManager.restorePendingActiveElement(newActiveElement);
    if (this.debug && newActiveElement) {
      this.logger.debug("Focussed and blurred", newActiveElement);
    }
    this.focusStateManager.focusMarkedAutofocusElements();
    return updates;
  }
  applyUpdateTarget(type, existingElement, newDocument, requestElementState = null) {
    let update = this.createUpdateTarget(type, existingElement, newDocument);
    if (!update) {
      return null;
    }
    this.dispatchFluxEvent("flux:before-render", { updates: [update] });
    this.applyUpdate(update, requestElementState);
    this.dispatchFluxEvent("flux:after-render", { updates: [update] });
    return update;
  }
  createUpdateTarget(type, existingElement, newDocument) {
    if (!existingElement) {
      return null;
    }
    if (!existingElement.isConnected) {
      this.updateTargetRegistry.remove(type, existingElement);
      return null;
    }
    let newElement = this.findMatchingElement(existingElement, newDocument);
    return {
      type,
      mode: this.getUpdateMode(type),
      existingElement,
      newElement
    };
  }
  applyUpdate(update, requestElementState = null) {
    let { type, existingElement, newElement } = update;
    let activeElementState = this.focusStateManager.captureElementState(existingElement);
    if (activeElementState && requestElementState) {
      activeElementState = this.focusStateManager.withoutUnchangedRequestValues(
        activeElementState,
        requestElementState
      );
    }
    if (type === "outer" || type === "link-outer" || type === "live-outer") {
      update.element = this.applyOuterUpdate(type, existingElement, newElement);
    } else if (type === "inner" || type === "link-inner" || type === "live-inner") {
      update.element = this.applyInnerUpdate(existingElement, newElement);
    } else if (type === "attributes") {
      update.element = this.applyAttributesUpdate(existingElement, newElement);
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
      return null;
    }
    this.prepareElementUpdate(existingElement, newElement);
    existingElement.replaceWith(newElement);
    this.completeElementUpdate(newElement);
    return newElement;
  }
  applyInnerUpdate(existingElement, newElement) {
    this.prepareElementUpdate(existingElement, newElement);
    while (existingElement.firstChild) {
      existingElement.removeChild(existingElement.firstChild);
    }
    while (newElement && newElement.firstChild) {
      existingElement.appendChild(newElement.firstChild);
    }
    this.completeElementUpdate(existingElement);
    return existingElement;
  }
  applyAttributesUpdate(existingElement, newElement) {
    if (!newElement) {
      return null;
    }
    Array.from(existingElement.attributes).forEach((attribute) => {
      if (!newElement.hasAttribute(attribute.name)) {
        existingElement.removeAttribute(attribute.name);
      }
    });
    Array.from(newElement.attributes).forEach((attribute) => {
      existingElement.setAttribute(attribute.name, attribute.value);
    });
    return existingElement;
  }
  findMatchingElement(existingElement, newDocument) {
    if (existingElement.id) {
      return newDocument.getElementById(existingElement.id);
    }
    let xPath = this.domPath.getXPathForElement(existingElement, document);
    return this.domPath.findInDocument(newDocument, xPath);
  }
  getTargetKey(type, element) {
    if (element?.id) {
      return `${type}:#${element.id}`;
    }
    return `${type}:${this.domPath.getXPathForElement(element, document)}`;
  }
  getUpdateMode(type) {
    if (type === "outer" || type === "link-outer" || type === "live-outer") {
      return "outer";
    }
    if (type === "inner" || type === "link-inner" || type === "live-inner") {
      return "inner";
    }
    if (type === "attributes") {
      return "attributes";
    }
    return type;
  }
  withoutTargetsDisconnectedByOuterUpdates(updates) {
    let outerUpdates = updates.filter((update) => update.mode === "outer");
    return updates.filter((update) => {
      let containingOuterUpdate = outerUpdates.find(
        (outerUpdate) => outerUpdate.existingElement !== update.existingElement && outerUpdate.existingElement.contains(update.existingElement)
      );
      if (containingOuterUpdate) {
        this.updateTargetRegistry.remove(update.type, update.existingElement);
        return false;
      }
      return true;
    });
  }
  dispatchFluxEvent(name, detail) {
    globalThis.document?.dispatchEvent?.(new CustomEvent(name, {
      bubbles: true,
      detail
    }));
  }
};

// src/DirectiveRegistry.es6
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
  "update-link": {
    handler: "updateLinkOuter",
    description: "Register the element for outerHTML replacement on link updates only."
  },
  "update-link-inner": {
    handler: "updateLinkInner",
    description: "Register the element for innerHTML replacement on link updates only."
  },
  "live": {
    handler: "liveOuter",
    description: "Register the element for recurring outerHTML replacement using background polling."
  },
  "live-outer": {
    handler: "liveOuter",
    description: "Register the element for recurring outerHTML replacement using background polling."
  },
  "live-inner": {
    handler: "liveInner",
    description: "Register the element for recurring innerHTML replacement using background polling."
  },
  "update-attributes": {
    handler: "updateAttributes",
    description: "Register the element for attribute-only updates on refresh."
  },
  "submit": {
    handler: "autoSubmit",
    description: "Submit the containing form in the background."
  },
  "autocomplete": {
    handler: "autocomplete",
    description: "Fetch form results in the background as the user types."
  },
  "autocomplete-results": {
    handler: "autocompleteResults",
    description: "Mark the response element used by autocomplete forms."
  },
  "link": {
    handler: "autoLink",
    description: "Follow the link in the background."
  },
  "drag-order": {
    handler: "dragOrder",
    description: "Turn a server-ordered form into a draggable ordering control."
  }
});
var DirectiveRegistry = class _DirectiveRegistry {
  static DEFINITIONS = DIRECTIVE_DEFINITIONS;
  constructor(handlers) {
    this.handlers = handlers;
  }
  initElement(fluxElement) {
    let fluxType = fluxElement.dataset["flux"];
    if (fluxType === "") {
      if (fluxElement instanceof HTMLButtonElement) {
        fluxType = "submit";
      }
    }
    let definition = _DirectiveRegistry.DEFINITIONS[fluxType];
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
    return _DirectiveRegistry.DEFINITIONS;
  }
};

// src/DomBridge.es6
var DomBridge = class {
  constructor(elementEventMapper, initFluxElement, domPath = DomPath, logger = console, debug = false, documentObject = globalThis.document) {
    this.elementEventMapper = elementEventMapper;
    this.initFluxElement = initFluxElement;
    this.domPath = domPath;
    this.logger = logger;
    this.debug = debug;
    this.documentObject = documentObject;
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
    if (newElement.matches?.("[data-flux]")) {
      this.initFluxElement(newElement);
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
  reviveScripts(newElement) {
    let scripts = newElement.matches?.("script") ? [newElement, ...newElement.querySelectorAll("script")] : newElement.querySelectorAll("script");
    scripts.forEach((script) => {
      let freshScript = this.documentObject.createElement("script");
      Array.from(script.attributes).forEach((attribute) => {
        freshScript.setAttribute(attribute.name, attribute.value);
      });
      freshScript.textContent = script.textContent;
      script.replaceWith(freshScript);
    });
  }
};

// src/FormHandler.es6
var FormHandler = class {
  constructor(navigationController, focusStateManager, onDocument, onNavigationDocument = onDocument, logger = console, debug = false, now = () => Date.now(), domPath = DomPath) {
    this.navigationController = navigationController;
    this.focusStateManager = focusStateManager;
    this.onDocument = onDocument;
    this.onNavigationDocument = onNavigationDocument;
    this.logger = logger;
    this.debug = debug;
    this.now = now;
    this.domPath = domPath;
    this.rateLimitState = /* @__PURE__ */ new Map();
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
    if (this.isRateLimited(submitter)) {
      return Promise.resolve(null);
    }
    let requestElementState = this.focusStateManager.captureElementState(form);
    let formData = this.getFormDataForButton(form, "autoSave", submitter);
    let responseHandler = form.hasAttribute("action") ? (newDocument) => this.onNavigationDocument(newDocument, requestElementState) : (newDocument) => this.onDocument(newDocument, requestElementState);
    return this.navigationController.submitForm(form, formData, responseHandler, submitter);
  }
  isRateLimited(submitter) {
    if (!(submitter instanceof HTMLElement)) {
      return false;
    }
    let rate = Number.parseFloat(submitter.dataset["fluxRate"] ?? "");
    if (!Number.isFinite(rate) || rate <= 0) {
      return false;
    }
    let now = this.now();
    let rateLimitKey = this.getRateLimitKey(submitter);
    let lastSubmittedAt = this.rateLimitState.get(rateLimitKey) ?? -Infinity;
    if (now - lastSubmittedAt < rate * 1e3) {
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

// src/LinkHandler.es6
var LinkHandler = class {
  constructor(navigationController, onDocument, windowObject = globalThis.window, now = () => Date.now(), domPath = DomPath) {
    this.navigationController = navigationController;
    this.onDocument = onDocument;
    this.windowObject = windowObject;
    this.now = now;
    this.domPath = domPath;
    this.rateLimitState = /* @__PURE__ */ new Map();
  }
  initAutoLink = (fluxElement) => {
    if (!(fluxElement instanceof HTMLAnchorElement)) {
      throw new TypeError('data-flux type "link" must be applied to an anchor element.');
    }
    fluxElement.addEventListener("click", this.autoClick);
  };
  autoClick = (e) => {
    e.preventDefault();
    let link = e.currentTarget;
    setTimeout(() => {
      this.clickLink(link);
    }, 0);
  };
  clickLink(link) {
    if (this.isRateLimited(link)) {
      return Promise.resolve(null);
    }
    return this.navigationController.clickLink(link, this.onDocument);
  }
  isRateLimited(link) {
    let rate = Number.parseFloat(link.dataset["fluxRate"] ?? "");
    if (!Number.isFinite(rate) || rate <= 0) {
      return false;
    }
    let now = this.now();
    let rateLimitKey = this.getRateLimitKey(link);
    let lastClickedAt = this.rateLimitState.get(rateLimitKey) ?? -Infinity;
    if (now - lastClickedAt < rate * 1e3) {
      return true;
    }
    this.rateLimitState.set(rateLimitKey, now);
    return false;
  }
  getRateLimitKey(link) {
    let path = this.domPath.getXPathForElement(link, document);
    return `link:${path}`;
  }
};

// src/RuntimeConfig.es6
var VALID_SCROLL_BEHAVIOURS = /* @__PURE__ */ new Set(["auto", "smooth"]);
var RuntimeConfig = {
  debug: false,
  scrollToTopBehavior: "auto",
  restoreScrollBehavior: "auto",
  configure(config = {}) {
    if (!config || typeof config !== "object") {
      return;
    }
    if ("debug" in config) {
      this.debug = Boolean(config.debug);
    }
    if (VALID_SCROLL_BEHAVIOURS.has(config.scrollBehavior)) {
      this.scrollToTopBehavior = config.scrollBehavior;
      this.restoreScrollBehavior = config.scrollBehavior;
    }
    if (VALID_SCROLL_BEHAVIOURS.has(config.scrollToTopBehavior)) {
      this.scrollToTopBehavior = config.scrollToTopBehavior;
    }
    if (VALID_SCROLL_BEHAVIOURS.has(config.restoreScrollBehavior)) {
      this.restoreScrollBehavior = config.restoreScrollBehavior;
    }
  }
};

// src/ResponseHandler.es6
var ResponseHandler = class _ResponseHandler {
  static DEFAULT_UPDATE_TYPES = Object.freeze([
    "outer",
    "inner",
    "attributes",
    "live-outer",
    "live-inner"
  ]);
  static LINK_UPDATE_TYPES = Object.freeze([
    ..._ResponseHandler.DEFAULT_UPDATE_TYPES,
    "link-outer",
    "link-inner"
  ]);
  static LIVE_UPDATE_TYPES = Object.freeze([
    "live-outer",
    "live-inner"
  ]);
  constructor(documentUpdater, logger = console, debug = false, scheduler = globalThis.setTimeout.bind(globalThis), reload = () => location.reload(), alerter = globalThis.alert?.bind(globalThis), windowObject = globalThis.window, animationFrame = globalThis.requestAnimationFrame?.bind(globalThis), onLiveDocumentUsed = () => {
  }) {
    this.documentUpdater = documentUpdater;
    this.logger = logger;
    this.debug = debug;
    this.scheduler = scheduler;
    this.reload = reload;
    this.alerter = alerter;
    this.windowObject = windowObject;
    this.animationFrame = animationFrame;
    this.onLiveDocumentUsed = onLiveDocumentUsed;
  }
  handleDocument = (newDocument, requestElementState = null) => {
    if (!this.isProcessableDocument(newDocument)) {
      return;
    }
    this.scheduler(() => {
      this.documentUpdater.apply(
        newDocument,
        _ResponseHandler.DEFAULT_UPDATE_TYPES,
        void 0,
        requestElementState
      );
      this.onLiveDocumentUsed();
    }, 0);
  };
  handleLinkDocument = (newDocument, requestElementState = null) => {
    if (!this.isProcessableDocument(newDocument)) {
      return;
    }
    let scrollState = this.isScrollState(requestElementState) ? requestElementState : null;
    let elementState = scrollState ? null : requestElementState;
    this.scheduler(() => {
      this.documentUpdater.apply(
        newDocument,
        _ResponseHandler.LINK_UPDATE_TYPES,
        void 0,
        elementState
      );
      this.onLiveDocumentUsed();
      this.scrollToTopAfterPaint(scrollState);
    }, 0);
  };
  handleLiveDocument = (newDocument, allowedTargetKeys = void 0) => {
    if (!this.isProcessableDocument(newDocument)) {
      return;
    }
    this.scheduler(() => {
      this.documentUpdater.apply(newDocument, _ResponseHandler.LIVE_UPDATE_TYPES, allowedTargetKeys);
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
  isScrollState(state) {
    return !!state && typeof state === "object" && (Number.isFinite(state.fluxScrollY) || state.action === "clickLink");
  }
  scrollToTopImmediately(scrollState = null) {
    let scrollTarget = this.getScrollTarget(scrollState);
    let behavior = scrollState?.fluxScrollBehavior ?? RuntimeConfig.scrollToTopBehavior;
    if (scrollTarget?.element) {
      this.scrollElementTo(scrollTarget.element, 0, 0, behavior);
      return;
    }
    if (!this.windowObject || typeof this.windowObject.scrollTo !== "function") {
      return;
    }
    this.windowObject.scrollTo({
      top: 0,
      left: 0,
      behavior
    });
  }
  scrollElementTo(element, top, left, behavior) {
    if (typeof element.scrollTo === "function") {
      element.scrollTo({
        top,
        left,
        behavior
      });
      return;
    }
    element.scrollTop = top;
    element.scrollLeft = left;
  }
  getScrollTarget(scrollState) {
    if (!scrollState?.fluxScrollPath) {
      return { element: null };
    }
    return {
      element: DomPath.findInDocument(globalThis.document, scrollState.fluxScrollPath)
    };
  }
  scrollToTopAfterPaint(scrollState = null) {
    if (typeof this.animationFrame !== "function") {
      this.scheduler(() => {
        this.scrollToTopImmediately(scrollState);
      }, 0);
      return;
    }
    this.animationFrame(() => {
      this.animationFrame(() => {
        this.scrollToTopImmediately(scrollState);
      });
    });
  }
};

// src/LiveHandler.es6
var LiveHandler = class _LiveHandler {
  static UPDATE_TYPES = Object.freeze([
    "live-outer",
    "live-inner"
  ]);
  constructor(navigationController, updateTargetRegistry, onDocument, logger = console, debug = false, scheduler = globalThis.setTimeout.bind(globalThis), clearScheduler = globalThis.clearTimeout.bind(globalThis), locationObject = globalThis.location, intervalMs = 1e3, now = () => Date.now(), domPath = null) {
    this.navigationController = navigationController;
    this.updateTargetRegistry = updateTargetRegistry;
    this.onDocument = onDocument;
    this.logger = logger;
    this.debug = debug;
    this.scheduler = scheduler;
    this.clearScheduler = clearScheduler;
    this.locationObject = locationObject;
    this.intervalMs = intervalMs;
    this.now = now;
    this.domPath = domPath;
    this.timerId = null;
    this.inFlight = false;
    this.lastRefreshMap = /* @__PURE__ */ new Map();
  }
  register(updateType, element) {
    this.updateTargetRegistry.add(element, updateType);
    let key = this.getTargetKey(updateType, element);
    element.fluxLiveKey = key;
    if (!this.lastRefreshMap.has(key)) {
      this.lastRefreshMap.set(key, this.now());
    }
    this.ensureRunning();
  }
  ensureRunning() {
    let nextDelay = this.getNextPollDelay();
    if (this.timerId !== null || nextDelay === null) {
      return;
    }
    this.timerId = this.scheduler(this.pollDocument, nextDelay);
  }
  stop() {
    if (this.timerId === null) {
      return;
    }
    this.clearScheduler(this.timerId);
    this.timerId = null;
  }
  pollDocument = async () => {
    this.timerId = null;
    let dueTargets = this.getDueTargets();
    if (dueTargets.length === 0) {
      this.ensureRunning();
      return;
    }
    if (this.inFlight) {
      this.ensureRunning();
      return;
    }
    this.inFlight = true;
    try {
      let targetsRefreshed = false;
      await this.navigationController.pollDocument(
        this.locationObject.href,
        (newDocument) => {
          this.markTargetsRefreshed(dueTargets);
          targetsRefreshed = true;
          this.onDocument(newDocument, dueTargets.map((target) => target.key));
        }
      );
      if (!targetsRefreshed) {
        this.markTargetsRefreshed(dueTargets);
      }
    } finally {
      this.inFlight = false;
      this.ensureRunning();
    }
  };
  markTargetsRefreshed(targets) {
    let refreshedAt = this.now();
    for (let target of targets) {
      this.lastRefreshMap.set(target.key, refreshedAt);
    }
  }
  markAllTargetsRefreshed = () => {
    let refreshedAt = this.now();
    for (let type of _LiveHandler.UPDATE_TYPES) {
      for (let element of this.getConnectedElements(type)) {
        this.lastRefreshMap.set(this.getTargetKey(type, element), refreshedAt);
      }
    }
  };
  hasLiveElements() {
    let hasLiveElements = false;
    for (let type of _LiveHandler.UPDATE_TYPES) {
      for (let element of this.getConnectedElements(type)) {
        hasLiveElements = true;
      }
    }
    if (this.debug) {
      this.logger.debug("Flux live target count", hasLiveElements);
    }
    return hasLiveElements;
  }
  getDueTargets() {
    let now = this.now();
    let dueTargets = [];
    for (let type of _LiveHandler.UPDATE_TYPES) {
      for (let element of this.getConnectedElements(type)) {
        let key = this.getTargetKey(type, element);
        let rateMs = this.getRateMs(element);
        let lastRefresh = this.lastRefreshMap.get(key) ?? -Infinity;
        if (now - lastRefresh >= rateMs) {
          dueTargets.push({ type, element, key });
        }
      }
    }
    return dueTargets;
  }
  getNextPollDelay() {
    let hasTargets = false;
    let now = this.now();
    let minDelay = Infinity;
    for (let type of _LiveHandler.UPDATE_TYPES) {
      for (let element of this.getConnectedElements(type)) {
        hasTargets = true;
        let key = this.getTargetKey(type, element);
        let rateMs = this.getRateMs(element);
        let lastRefresh = this.lastRefreshMap.get(key) ?? -Infinity;
        let remaining = rateMs - (now - lastRefresh);
        minDelay = Math.min(minDelay, Math.max(0, remaining));
      }
    }
    if (!hasTargets) {
      return null;
    }
    return Number.isFinite(minDelay) ? minDelay : this.intervalMs;
  }
  getConnectedElements(type) {
    let connected = [];
    for (let element of [...this.updateTargetRegistry.getElements(type)]) {
      if (element?.isConnected) {
        connected.push(element);
        continue;
      }
      this.updateTargetRegistry.remove(type, element);
      this.lastRefreshMap.delete(this.getTargetKey(type, element));
    }
    return connected;
  }
  getRateMs(element) {
    let rateSeconds = Number.parseFloat(element.dataset["fluxRate"] ?? "");
    if (!Number.isFinite(rateSeconds) || rateSeconds <= 0) {
      return this.intervalMs;
    }
    return rateSeconds * 1e3;
  }
  getTargetKey(type, element) {
    if (element?.fluxLiveKey) {
      return element.fluxLiveKey;
    }
    if (element?.id) {
      let key = `${type}:#${element.id}`;
      element.fluxLiveKey = key;
      return key;
    }
    if (this.domPath?.getXPathForElement) {
      let key = `${type}:${this.domPath.getXPathForElement(element)}`;
      if (element) {
        element.fluxLiveKey = key;
      }
      return key;
    }
    return `${type}:${type}`;
  }
};

// src/AutocompleteHandler.es6
var AutocompleteHandler = class {
  constructor(navigationController, logger = console, debug = false, scheduler = globalThis.setTimeout.bind(globalThis), clearScheduler = globalThis.clearTimeout.bind(globalThis), delay = 200) {
    this.navigationController = navigationController;
    this.logger = logger;
    this.debug = debug;
    this.scheduler = scheduler;
    this.clearScheduler = clearScheduler;
    this.delay = delay;
    this.state = /* @__PURE__ */ new WeakMap();
  }
  initAutocomplete = (fluxElement) => {
    if (!(fluxElement instanceof HTMLFormElement)) {
      throw new TypeError('data-flux type "autocomplete" must be applied to a form element.');
    }
    if (this.state.has(fluxElement)) {
      return;
    }
    this.state.set(fluxElement, {
      timer: null,
      minLength: this.getMinLength(fluxElement),
      requestId: 0,
      resultsElement: null
    });
    this.hideSubmitControls(fluxElement);
    fluxElement.addEventListener("input", this.onInput);
    fluxElement.addEventListener("keydown", this.onKeyDown);
  };
  initAutocompleteResults = () => {
  };
  onInput = (e) => {
    let form = e.currentTarget;
    let state = this.state.get(form);
    if (!state) {
      return;
    }
    if (state.timer) {
      this.clearScheduler(state.timer);
    }
    state.timer = this.scheduler(() => {
      state.timer = null;
      this.updateResults(form);
    }, this.delay);
  };
  onKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") {
      return;
    }
    let form = e.currentTarget;
    let state = this.state.get(form);
    let focusableElements = this.getFocusableElements(form, state?.resultsElement);
    if (focusableElements.length === 0) {
      return;
    }
    e.preventDefault();
    this.moveFocus(focusableElements, e.key === "ArrowDown" ? 1 : -1);
  };
  updateResults(form) {
    let formData = new FormData(form);
    let state = this.state.get(form);
    if (!state) {
      return Promise.resolve(null);
    }
    if (!this.hasMinimumValue(formData, state.minLength)) {
      this.removeResults(form, state);
      return Promise.resolve(null);
    }
    let requestId = ++state.requestId;
    return this.navigationController.fetchForm(
      form,
      formData,
      (newDocument) => {
        if (state.requestId !== requestId) {
          return;
        }
        this.applyResults(form, state, newDocument);
      }
    );
  }
  getMinLength(form) {
    let minLength = Number.parseInt(form.dataset["fluxMinLength"] ?? "", 10);
    if (Number.isFinite(minLength) && minLength >= 0) {
      return minLength;
    }
    return 3;
  }
  hideSubmitControls(form) {
    form.querySelectorAll("button, input[type='submit'], input[type='image']").forEach((element) => {
      if (element instanceof HTMLButtonElement && element.type !== "submit") {
        return;
      }
      element.hidden = true;
      element.dataset["fluxAutocompleteButton"] = "";
    });
  }
  hasMinimumValue(formData, minLength) {
    for (let value of formData.values()) {
      if (typeof value === "string" && value.trim().length >= minLength) {
        return true;
      }
      if (typeof File !== "undefined" && value instanceof File && value.name !== "") {
        return true;
      }
    }
    return false;
  }
  applyResults(form, state, newDocument) {
    let newResultsElement = newDocument.querySelector('[data-flux="autocomplete-results"]');
    if (!newResultsElement) {
      this.removeResults(form, state);
      if (this.debug) {
        this.logger.debug("No autocomplete results element found in response", form);
      }
      return;
    }
    newResultsElement.dataset["fluxAutocompleteMounted"] = "";
    newResultsElement.addEventListener("keydown", this.onResultsKeyDown);
    if (state.resultsElement?.isConnected) {
      state.resultsElement.replaceWith(newResultsElement);
    } else {
      form.after(newResultsElement);
    }
    state.resultsElement = newResultsElement;
  }
  onResultsKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") {
      return;
    }
    let resultsElement = e.currentTarget;
    let form = this.findOwningForm(resultsElement);
    if (!form) {
      return;
    }
    let focusableElements = this.getFocusableElements(form, resultsElement);
    if (focusableElements.length === 0) {
      return;
    }
    e.preventDefault();
    this.moveFocus(focusableElements, e.key === "ArrowDown" ? 1 : -1);
  };
  findOwningForm(resultsElement) {
    let previousElement = resultsElement.previousElementSibling;
    while (previousElement) {
      if (previousElement instanceof HTMLFormElement && this.state.has(previousElement)) {
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
      '[tabindex]:not([tabindex="-1"])'
    ].join(",");
    let elements = [
      ...form.querySelectorAll(selectors)
    ];
    if (resultsElement?.isConnected) {
      elements.push(...resultsElement.querySelectorAll(selectors));
    }
    return elements.filter((element) => !element.hidden);
  }
  moveFocus(focusableElements, direction) {
    let currentIndex = focusableElements.indexOf(document.activeElement);
    let nextIndex = currentIndex + direction;
    if (currentIndex === -1) {
      nextIndex = direction > 0 ? 0 : focusableElements.length - 1;
    }
    nextIndex = Math.max(0, Math.min(focusableElements.length - 1, nextIndex));
    focusableElements[nextIndex].focus();
  }
  removeResults(form, state) {
    if (state.resultsElement?.isConnected) {
      state.resultsElement.remove();
    }
    state.resultsElement = null;
    let adjacentResultsElement = form.nextElementSibling;
    if (adjacentResultsElement?.dataset["fluxAutocompleteMounted"] !== void 0) {
      adjacentResultsElement.remove();
    }
  }
};

// src/DragOrder/DropTargetResolver.es6
var DropTargetResolver = class {
  constructor(documentObject = globalThis.document) {
    this.documentObject = documentObject;
  }
  getContainer(event, dragState) {
    if (typeof this.documentObject.elementFromPoint !== "function" || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
      return dragState.container;
    }
    let element = this.documentObject.elementFromPoint(event.clientX, event.clientY);
    let container = element ? this.getNestedContainer(element, event.clientX, event.clientY, dragState) : null;
    container ??= element?.closest("[data-flux-drag-parent]") ?? this.getParentContainerAtPoint(event.clientX, event.clientY) ?? dragState.container;
    return this.getCompatibleContainer(container, dragState);
  }
  getCompatibleContainer(container, dragState) {
    let { initialContainer } = dragState;
    if (container !== initialContainer && (initialContainer.contains(container) || container.contains(initialContainer))) {
      return dragState.container;
    }
    return container;
  }
  getNestedContainer(element, clientX, clientY, dragState) {
    let outerContainer = element.closest("[data-flux-drag-parent]");
    if (!outerContainer?.contains(dragState.initialContainer)) {
      return null;
    }
    let host = element.closest("[data-flux='drag-order']");
    if (!host || host === dragState.item) {
      return null;
    }
    let candidates = [...host.querySelectorAll("[data-flux-drag-parent]")];
    return candidates.find((container) => {
      let rect = container.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }) ?? candidates[0] ?? null;
  }
  getParentContainerAtPoint(clientX, clientY) {
    let containers = this.documentObject.querySelectorAll("[data-flux-drag-parent]");
    return [...containers].reverse().find((container) => {
      let rect = container.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    });
  }
};

// src/DragOrder/FormControls.es6
var FormControls = class {
  getForm(dragElement) {
    if (dragElement instanceof HTMLFormElement) {
      return dragElement;
    }
    let form = dragElement.querySelector("form");
    if (!(form instanceof HTMLFormElement)) {
      throw new TypeError('data-flux type "drag-order" requires a form element.');
    }
    return form;
  }
  getOrderInput(form) {
    let orderInput = form.querySelector("input[name='order']");
    if (!(orderInput instanceof HTMLInputElement)) {
      throw new TypeError('data-flux type "drag-order" requires an input named "order".');
    }
    return orderInput;
  }
  getSubmitButton(form) {
    let submitButton = form.querySelector("button[name='do']");
    if (!(submitButton instanceof HTMLButtonElement)) {
      throw new TypeError('data-flux type "drag-order" requires a button named "do".');
    }
    return submitButton;
  }
  getParentInput(form) {
    return form.querySelector("input[name='parent']");
  }
  getParentValue(container) {
    return container.dataset["fluxDragParent"] ?? "";
  }
  getItem(dragElement, form = dragElement instanceof HTMLFormElement ? dragElement : null) {
    let item = dragElement instanceof HTMLFormElement ? form?.parentElement : dragElement;
    if (!item?.parentElement) {
      throw new TypeError('data-flux type "drag-order" requires the sortable element to be inside a container.');
    }
    return item;
  }
  hideControls(form, ...controls) {
    let hiddenElements = /* @__PURE__ */ new Set();
    for (let control of controls) {
      if (!control) {
        continue;
      }
      hiddenElements.add(control);
      let label = control.closest("label");
      if (label && form.contains(label)) {
        hiddenElements.add(label);
      }
    }
    for (let element of hiddenElements) {
      element.hidden = true;
    }
  }
};

// src/DragOrder/Preview.es6
var Preview = class {
  constructor(documentObject = globalThis.document, styleReader = void 0) {
    this.documentObject = documentObject;
    this.styleReader = styleReader ?? globalThis.getComputedStyle?.bind(globalThis);
    this.canReadPseudoElements = Boolean(styleReader) || !this.documentObject.defaultView?.navigator?.userAgent.includes("jsdom");
  }
  create(item, rect) {
    let floatingItem = item.cloneNode(true);
    this.copyComputedStyles(item, floatingItem);
    floatingItem.classList.add("flux-drag-order-floating");
    floatingItem.setAttribute("aria-hidden", "true");
    floatingItem.style.setProperty("box-sizing", "border-box");
    floatingItem.style.setProperty("position", "fixed");
    floatingItem.style.setProperty("z-index", "2147483647");
    floatingItem.style.setProperty("pointer-events", "none");
    floatingItem.style.setProperty("opacity", "0.85");
    floatingItem.style.setProperty("transform-origin", "top left");
    floatingItem.style.setProperty("width", `${rect.width}px`);
    floatingItem.style.setProperty("height", `${rect.height}px`);
    floatingItem.style.setProperty("left", "0");
    floatingItem.style.setProperty("top", "0");
    this.documentObject.body.append(floatingItem);
    return floatingItem;
  }
  move(dragState, clientX, clientY) {
    if (!dragState?.floatingItem || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return;
    }
    let {
      floatingItem,
      pointerOffsetX,
      pointerOffsetY,
      itemWidth,
      itemHeight
    } = dragState;
    let left = clientX + pointerOffsetX - itemWidth / 2;
    let top = clientY + pointerOffsetY - itemHeight / 2;
    floatingItem.style.transform = `translate(${left}px, ${top}px)`;
  }
  copyComputedStyles(source, target) {
    this.copyStyleDeclaration(this.readStyles(source), target);
    [...source.children].forEach((sourceChild, index) => {
      let targetChild = target.children[index];
      if (targetChild) {
        this.copyComputedStyles(sourceChild, targetChild);
      }
    });
    this.copyPseudoElement(source, target, "::before", "afterbegin");
    this.copyPseudoElement(source, target, "::after", "beforeend");
  }
  copyPseudoElement(source, target, pseudoElement, position) {
    if (!this.canReadPseudoElements) {
      return;
    }
    let styles = this.readStyles(source, pseudoElement);
    if (!this.hasPseudoElementContent(styles)) {
      return;
    }
    let pseudoClone = this.documentObject.createElement("span");
    pseudoClone.setAttribute("aria-hidden", "true");
    pseudoClone.dataset["fluxPseudo"] = pseudoElement.slice(2);
    pseudoClone.textContent = this.getPseudoElementText(styles);
    this.copyStyleDeclaration(styles, pseudoClone);
    target.insertAdjacentElement(position, pseudoClone);
  }
  hasPseudoElementContent(styles) {
    let content = styles?.getPropertyValue?.("content");
    return content !== void 0 && content !== "" && content !== "normal" && content !== "none";
  }
  getPseudoElementText(styles) {
    let content = styles.getPropertyValue("content");
    if (content === '""' || content === "''") {
      return "";
    }
    let match = content.match(/^(['"])(.*)\1$/);
    return match ? match[2] : "";
  }
  copyStyleDeclaration(styles, target) {
    for (let i = 0; i < styles.length; i++) {
      let property = styles.item(i);
      target.style.setProperty(
        property,
        styles.getPropertyValue(property),
        styles.getPropertyPriority(property)
      );
    }
  }
  readStyles(element, pseudoElement = void 0) {
    return this.styleReader(element, pseudoElement);
  }
};

// src/DragOrder/SortableItems.es6
var LEGACY_SORTABLE_ITEM_ATTRIBUTE = "data-flux-drag-order-item";
var SortableItems = class {
  getSiblings(container) {
    return [...container.children].filter((child) => this.isSortable(child));
  }
  isSortable(child) {
    return child.dataset["flux"] === "drag-order" || child.hasAttribute(LEGACY_SORTABLE_ITEM_ATTRIBUTE);
  }
  isHorizontal(siblings) {
    if (siblings.length < 2) {
      return false;
    }
    let rects = siblings.map((child) => child.getBoundingClientRect());
    let lefts = rects.map((rect) => rect.left);
    let tops = rects.map((rect) => rect.top);
    return Math.max(...lefts) - Math.min(...lefts) > Math.max(...tops) - Math.min(...tops);
  }
  getInsertBeforeElement(container, draggedItem, sortableInsertBefore, sortableSiblings) {
    if (sortableInsertBefore) {
      return sortableInsertBefore;
    }
    if (!container.hasAttribute("data-flux-drag-parent")) {
      return null;
    }
    let children = [...container.children].filter((child) => child !== draggedItem);
    let lastSortable = sortableSiblings.at(-1);
    let startIndex = lastSortable ? children.indexOf(lastSortable) + 1 : 0;
    return children.slice(startIndex).find((child) => !this.isSortable(child)) ?? null;
  }
};

// src/DragOrder/Handler.es6
var Handler = class _Handler {
  static LEGACY_SORTABLE_ITEM_ATTRIBUTE = LEGACY_SORTABLE_ITEM_ATTRIBUTE;
  constructor(formHandler, documentObject = globalThis.document, logger = console, debug = false, formControls = new FormControls(), sortableItems = new SortableItems(), preview = new Preview(documentObject), dropTargetResolver = new DropTargetResolver(documentObject)) {
    this.formHandler = formHandler;
    this.documentObject = documentObject;
    this.logger = logger;
    this.debug = debug;
    this.formControls = formControls;
    this.sortableItems = sortableItems;
    this.preview = preview;
    this.dropTargetResolver = dropTargetResolver;
    this.containerState = /* @__PURE__ */ new WeakSet();
    this.dragState = null;
    this.activePointerId = null;
  }
  initDragOrder = (dragElement) => {
    if (!(dragElement instanceof HTMLElement)) {
      throw new TypeError('data-flux type "drag-order" must be applied to an HTML element.');
    }
    if (dragElement.dataset["fluxDragOrderInit"] !== void 0) {
      return;
    }
    let form = this.formControls.getForm(dragElement);
    let orderInput = this.formControls.getOrderInput(form);
    let parentInput = this.formControls.getParentInput(form);
    let submitButton = this.formControls.getSubmitButton(form);
    let item = this.formControls.getItem(dragElement, form);
    let container = item.parentElement;
    let handleTitle = this.getHandleTitle(dragElement, item);
    dragElement.dataset["fluxDragOrderInit"] = "";
    if (dragElement instanceof HTMLFormElement) {
      item.setAttribute(_Handler.LEGACY_SORTABLE_ITEM_ATTRIBUTE, "");
    }
    this.formControls.hideControls(form, orderInput, parentInput, submitButton);
    let handle = this.documentObject.createElement("span");
    handle.className = "drag-handle";
    handle.draggable = false;
    handle.role = "button";
    handle.tabIndex = 0;
    handle.ariaLabel = "Drag to reorder";
    handle.dataset["fluxTitle"] = handleTitle;
    form.prepend(handle);
    handle.addEventListener("dragstart", (e) => this.startNativeDrag(e, form, item));
    handle.addEventListener("dragend", this.endNativeDrag);
    handle.addEventListener("pointerdown", (e) => this.startPointerDrag(e, form, item));
    this.initContainer(container);
    this.initParentContainers();
    if (this.debug) {
      this.logger.debug("initDragOrder completed", dragElement);
    }
  };
  getHandleTitle(dragElement, item) {
    return dragElement.dataset["fluxDragHandle"] ?? dragElement.parentElement?.dataset["fluxDragHandle"] ?? item.parentElement?.dataset["fluxDragHandle"] ?? "Drag";
  }
  initContainer(container) {
    if (this.containerState.has(container)) {
      return;
    }
    this.containerState.add(container);
    container.addEventListener("dragover", this.dragOver);
    container.addEventListener("drop", this.drop);
  }
  initParentContainers() {
    this.documentObject.querySelectorAll("[data-flux-drag-parent]").forEach((container) => {
      this.initContainer(container);
    });
  }
  startNativeDrag(e, form, item = null) {
    this.startDrag(form, e.clientY, item, e.clientX);
    if (e.dataTransfer) {
      if (item) {
        let rect = item.getBoundingClientRect();
        e.dataTransfer.setDragImage(
          item,
          e.clientX - rect.left,
          e.clientY - rect.top
        );
      }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    }
  }
  startPointerDrag(e, form, item = null) {
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    this.startDrag(form, e.clientY, item, e.clientX);
    this.moveItem(e.clientY, void 0, e.clientX);
    this.activePointerId = e.pointerId;
    this.documentObject.addEventListener("pointermove", this.pointerMove, true);
    this.documentObject.addEventListener("pointerup", this.pointerUp, true);
    this.documentObject.addEventListener("pointercancel", this.pointerCancel, true);
  }
  startDrag(form, clientY = null, item = null, clientX = null) {
    this.endDrag();
    item ??= this.formControls.getItem(form);
    let rect = item.getBoundingClientRect();
    let pointerOffsetX = !Number.isFinite(clientX) ? 0 : rect.left + rect.width / 2 - clientX;
    let pointerOffsetY = !Number.isFinite(clientY) ? 0 : rect.top + rect.height / 2 - clientY;
    item.classList.add("flux-drag-order-dragging");
    this.dragState = {
      form,
      item,
      floatingItem: this.preview.create(item, rect),
      initialContainer: item.parentElement,
      container: item.parentElement,
      pointerOffsetX,
      pointerOffsetY,
      itemWidth: rect.width,
      itemHeight: rect.height
    };
    this.preview.move(this.dragState, clientX, clientY);
  }
  dragOver = (e) => {
    if (!this.dragState) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.moveItem(
      e.clientY,
      this.dropTargetResolver.getCompatibleContainer(e.currentTarget, this.dragState),
      e.clientX
    );
  };
  pointerMove = (e) => {
    if (!this.dragState || e.pointerId !== this.activePointerId) {
      return;
    }
    e.preventDefault();
    this.moveItem(e.clientY, this.dropTargetResolver.getContainer(e, this.dragState), e.clientX);
  };
  pointerUp = (e) => {
    if (e.pointerId !== this.activePointerId) {
      return;
    }
    this.removePointerListeners();
    this.submitDrag();
  };
  pointerCancel = (e) => {
    if (e.pointerId !== this.activePointerId) {
      return;
    }
    this.removePointerListeners();
    this.endDrag();
  };
  removePointerListeners() {
    this.documentObject.removeEventListener("pointermove", this.pointerMove, true);
    this.documentObject.removeEventListener("pointerup", this.pointerUp, true);
    this.documentObject.removeEventListener("pointercancel", this.pointerCancel, true);
    this.activePointerId = null;
  }
  moveItem(clientY, container = this.dragState.container, clientX = null) {
    if (!(container instanceof HTMLElement)) {
      container = this.dragState.container;
    }
    let { item, pointerOffsetX, pointerOffsetY } = this.dragState;
    let sortableItems = this.sortableItems.getSiblings(container);
    let siblings = sortableItems.filter((child) => child !== item);
    let horizontal = this.sortableItems.isHorizontal(sortableItems);
    let itemCenter = horizontal ? (clientX ?? 0) + pointerOffsetX : clientY + pointerOffsetY;
    let insertBefore = siblings.find((child) => {
      let rect = child.getBoundingClientRect();
      let childCenter = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      return itemCenter < childCenter;
    });
    this.dragState.container = container;
    container.insertBefore(
      item,
      this.sortableItems.getInsertBeforeElement(container, item, insertBefore, siblings)
    );
    this.preview.move(this.dragState, clientX, clientY);
  }
  drop = (e) => {
    if (!this.dragState) {
      return;
    }
    e.preventDefault();
    this.submitDrag();
  };
  endNativeDrag = () => {
    if (!this.dragState) {
      return;
    }
    this.submitDrag();
  };
  submitDrag() {
    if (!this.dragState) {
      return;
    }
    let { form } = this.dragState;
    let order = this.getItemOrder();
    let container = this.dragState.container;
    this.endDrag();
    let orderInput = this.formControls.getOrderInput(form);
    let parentInput = this.formControls.getParentInput(form);
    let submitButton = this.formControls.getSubmitButton(form);
    orderInput.value = String(order);
    if (parentInput) {
      parentInput.value = this.formControls.getParentValue(container);
    }
    this.formHandler.submitForm(form, submitButton);
  }
  getItemOrder() {
    let { item } = this.dragState;
    let container = item.parentElement ?? this.dragState.container;
    this.dragState.container = container;
    return this.sortableItems.getSiblings(container).indexOf(item);
  }
  endDrag = () => {
    if (!this.dragState) {
      return;
    }
    this.dragState.floatingItem?.remove();
    this.dragState.item.classList.remove("flux-drag-order-dragging");
    this.removePointerListeners();
    this.dragState = null;
  };
};

// src/Flux.es6
var Flux = class _Flux {
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
  constructor(style = void 0, elementEventMapper = void 0, parser = void 0, navigationController = void 0, updateTargetRegistry = void 0, focusStateManager = void 0, documentUpdater = void 0, directiveRegistry = void 0, domBridge = void 0, formHandler = void 0, linkHandler = void 0, responseHandler = void 0, liveHandler = void 0, logger = void 0, dragOrderHandler = void 0, autocompleteHandler = void 0) {
    configureFromDocumentAttributes();
    takeControlOfNativeScrollRestoration();
    handleWindowPopState();
    restoreScrollPositionAfterReload();
    this.logger = logger ?? console;
    style = style ?? new Style();
    style.addToDocument();
    this.elementEventMapper = elementEventMapper ?? new ElementEventMapper(this.logger, _Flux.DEBUG);
    this.navigationController = navigationController ?? new NavigationController(
      parser ?? new DOMParser()
    );
    this.updateTargetRegistry = updateTargetRegistry ?? new UpdateTargetRegistry();
    this.focusStateManager = focusStateManager ?? new FocusStateManager();
    this.domBridge = domBridge ?? new DomBridge(
      this.elementEventMapper,
      this.initFluxElementSafely,
      DomPath,
      this.logger,
      _Flux.DEBUG
    );
    this.documentUpdater = documentUpdater ?? new DocumentUpdater(
      this.updateTargetRegistry,
      this.focusStateManager,
      (oldElement, newElement) => this.domBridge.prepareElementUpdate(oldElement, newElement),
      (element) => this.domBridge.reviveScripts(element),
      DomPath,
      this.logger,
      _Flux.DEBUG
    );
    this.responseHandler = responseHandler ?? new ResponseHandler(
      this.documentUpdater,
      this.logger,
      _Flux.DEBUG
    );
    this.formHandler = formHandler ?? new FormHandler(
      this.navigationController,
      this.focusStateManager,
      this.responseHandler.handleDocument,
      this.responseHandler.handleLinkDocument,
      this.logger,
      _Flux.DEBUG
    );
    this.linkHandler = linkHandler ?? new LinkHandler(
      this.navigationController,
      this.responseHandler.handleLinkDocument
    );
    this.liveHandler = liveHandler ?? new LiveHandler(
      this.navigationController,
      this.updateTargetRegistry,
      this.responseHandler.handleLiveDocument,
      this.logger,
      _Flux.DEBUG,
      globalThis.setTimeout.bind(globalThis),
      globalThis.clearTimeout.bind(globalThis),
      globalThis.location,
      1e3,
      () => Date.now(),
      DomPath
    );
    this.responseHandler.onLiveDocumentUsed = this.liveHandler.markAllTargetsRefreshed;
    this.autocompleteHandler = autocompleteHandler ?? new AutocompleteHandler(
      this.navigationController,
      this.logger,
      _Flux.DEBUG
    );
    this.dragOrderHandler = dragOrderHandler ?? new Handler(
      this.formHandler,
      document,
      this.logger,
      _Flux.DEBUG
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
      dragOrder: this.dragOrderHandler.initDragOrder
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
  initAutoContainer = (fluxElement) => {
    if (fluxElement instanceof HTMLFormElement) {
      this.formHandler.initAutoContainer(fluxElement);
      this.storeOuterUpdateElement(fluxElement);
    } else if (fluxElement instanceof HTMLAnchorElement) {
      this.linkHandler.initAutoLink(fluxElement);
    } else {
      throw new TypeError("Bare data-flux must be applied to a form, button, or anchor element.");
    }
  };
  /**
   * Store a DOM element that should be refreshed when Flux processes
   * a new HTML document after an interaction.
   */
  storeUpdateElement = (element, updateType) => {
    this.updateTargetRegistry.add(element, updateType);
    if (_Flux.DEBUG) {
      this.logger.debug("storeUpdateElement completed", `Pushing into ${updateType}: `, element);
    }
  };
  storeOuterUpdateElement = (element) => {
    this.storeUpdateElement(element, "outer");
  };
  storeInnerUpdateElement = (element) => {
    this.storeUpdateElement(element, "inner");
  };
  storeLinkOuterUpdateElement = (element) => {
    this.storeUpdateElement(element, "link-outer");
  };
  storeLinkInnerUpdateElement = (element) => {
    this.storeUpdateElement(element, "link-inner");
  };
  storeLiveOuterUpdateElement = (element) => {
    this.liveHandler.register("live-outer", element);
  };
  storeLiveInnerUpdateElement = (element) => {
    this.liveHandler.register("live-inner", element);
  };
  storeAttributesUpdateElement = (element) => {
    this.storeUpdateElement(element, "attributes");
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
  if (window.__fluxPopStateHandlerAttached) {
    return;
  }
  window.__fluxPopStateHandlerAttached = true;
  window.addEventListener("popstate", (e) => {
    storePopStateScrollPosition(e.state);
    location.href = document.location;
  });
}
function configureFromDocumentAttributes() {
  let scrollBehavior = document.body?.dataset?.fluxScroll ?? document.documentElement?.dataset?.fluxScroll;
  RuntimeConfig.configure({
    scrollBehavior
  });
}
function takeControlOfNativeScrollRestoration() {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
}
function storePopStateScrollPosition(state) {
  let scrollPosition = getScrollPositionFromState(state);
  if (!scrollPosition) {
    return;
  }
  try {
    sessionStorage.setItem(getScrollStorageKey(location.href), JSON.stringify(scrollPosition));
  } catch (error) {
  }
}
function getScrollPositionFromState(state) {
  if (!state || typeof state !== "object") {
    return null;
  }
  if (Number.isFinite(state.fluxScrollY)) {
    return {
      x: Number.isFinite(state.fluxScrollX) ? state.fluxScrollX : 0,
      y: state.fluxScrollY,
      behavior: state.fluxScrollBehavior,
      path: state.fluxScrollPath
    };
  }
  if (state.action === "clickLink") {
    return {
      x: 0,
      y: 0
    };
  }
  return null;
}
function restoreScrollPositionAfterReload() {
  let scrollPosition = readStoredScrollPosition();
  if (!scrollPosition) {
    return;
  }
  let restore = () => window.scrollTo({
    top: scrollPosition.y,
    left: scrollPosition.x,
    behavior: scrollPosition.behavior ?? RuntimeConfig.restoreScrollBehavior
  });
  let scrollTarget = getScrollTarget(scrollPosition);
  if (scrollTarget) {
    restore = () => scrollElementTo(
      scrollTarget,
      scrollPosition.y,
      scrollPosition.x,
      scrollPosition.behavior ?? RuntimeConfig.restoreScrollBehavior
    );
  }
  if (typeof requestAnimationFrame !== "function") {
    setTimeout(restore, 0);
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(restore);
  });
  setTimeout(restore, 50);
}
function getScrollTarget(scrollPosition) {
  if (!scrollPosition.path) {
    return null;
  }
  return DomPath.findInDocument(document, scrollPosition.path);
}
function scrollElementTo(element, top, left, behavior) {
  if (typeof element.scrollTo === "function") {
    element.scrollTo({
      top,
      left,
      behavior
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
    if (!value) {
      return null;
    }
    let scrollPosition = JSON.parse(value);
    if (!Number.isFinite(scrollPosition?.y)) {
      return null;
    }
    return {
      x: Number.isFinite(scrollPosition.x) ? scrollPosition.x : 0,
      y: scrollPosition.y,
      behavior: scrollPosition.behavior,
      path: scrollPosition.path
    };
  } catch (error) {
    return null;
  }
}
function getScrollStorageKey(url) {
  return `flux-scroll:${url}`;
}

// src/Debug.es6
var Debug = class {
  static {
    RuntimeConfig.debug = true;
  }
};

// src/main.es6
RuntimeConfig.configure(globalThis.FluxConfig);
new Flux();
export {
  Debug,
  Debug as FluxDebug
};
