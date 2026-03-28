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
    if (!path) {
      return null;
    }
    return document2.evaluate(
      path,
      document2.documentElement,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  }
  static findInContext(context, path) {
    if (!path) {
      return null;
    }
    return context.ownerDocument.evaluate(
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

// src/Flux.es6
var Flux = class _Flux {
  static DEBUG = false;
  style;
  elementEventMapper;
  parser;
  updateTargetRegistry;
  focusStateManager;
  constructor(style = void 0, elementEventMapper = void 0, parser = void 0, updateTargetRegistry = void 0, focusStateManager = void 0) {
    handleWindowPopState();
    style = style ?? new Style();
    style.addToDocument();
    this.elementEventMapper = elementEventMapper ?? new ElementEventMapper();
    this.parser = parser ?? new DOMParser();
    this.updateTargetRegistry = updateTargetRegistry ?? new UpdateTargetRegistry();
    this.focusStateManager = focusStateManager ?? new FocusStateManager();
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
    if (fluxType === "") {
      this.initAutoContainer(fluxElement);
    } else if (fluxType === "autosave") {
      this.initAutoSave(fluxElement);
    } else if (fluxType.startsWith("update")) {
      let updateType = null;
      if (fluxType === "update" || fluxType === "update-outer") {
        updateType = "outer";
      } else if (fluxType === "update-inner") {
        updateType = "inner";
      }
      this.storeUpdateElement(fluxElement, updateType);
    } else if (fluxType === "submit") {
      this.initAutoSubmit(fluxElement);
    } else if (fluxType === "link") {
      this.initAutoLink(fluxElement);
    } else {
      throw new TypeError(`Unknown flux element type: ${fluxType}`);
    }
  };
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
    _Flux.DEBUG && console.debug("initAutoSave completed", fluxElement);
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
  initAutoLink = (fluxElement) => {
    if (!(fluxElement instanceof HTMLAnchorElement)) {
      throw new TypeError('data-type type "link" must be applied to an anchor element.');
    }
    fluxElement.addEventListener("click", this.autoClick);
  };
  /**
   * Store a DOM element that should be refreshed when Flux processes
   * a new HTML document after an interaction.
   */
  storeUpdateElement = (element, updateType) => {
    this.updateTargetRegistry.add(element, updateType);
    _Flux.DEBUG && console.debug("storeUpdateElement completed", `Pushing into ${updateType}: `, element);
  };
  autoSubmit = (e) => {
    e.preventDefault();
    setTimeout(() => {
      this.submitForm(e.target, this.completeAutoSave, e.submitter);
    }, 0);
  };
  autoClick = (e) => {
    e.preventDefault();
    let link = e.currentTarget;
    setTimeout(() => {
      this.clickLink(link, this.completeAutoSave);
    }, 0);
  };
  submitForm = (form, callback, submitter) => {
    let formData = this.getFormDataForButton(
      form,
      "autoSave",
      submitter
    );
    form.classList.add("submitting");
    fetch(form.action, {
      method: form.getAttribute("method"),
      credentials: "same-origin",
      body: formData
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Form submission error: ${response.status} ${response.statusText}`);
      }
      history.pushState({
        "action": "submitForm"
      }, "", response.url);
      return response.text();
    }).then((html) => {
      callback(this.parser.parseFromString(
        html,
        "text/html"
      ));
      form.classList.remove("submitting");
    }).catch((error) => {
      form.classList.remove("submitting");
      console.error(error);
    });
  };
  clickLink = (link, callback) => {
    let url = link.href;
    link.classList.add("submitting");
    fetch(url, {
      credentials: "same-origin"
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Link fetch error: ${response.status} ${response.statusText}`);
      }
      history.pushState({
        "action": "clickLink"
      }, "", response.url);
      return response.text();
    }).then((html) => {
      callback(this.parser.parseFromString(
        html,
        "text/html"
      ));
      link.classList.remove("submitting");
    }).catch((error) => {
      link.classList.remove("submitting");
      console.error(error);
    });
  };
  getFormDataForButton = (form, type, submitter) => {
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
  };
  completeAutoSave = (newDocument) => {
    if (newDocument.head.children.length === 0) {
      if (_Flux.DEBUG) {
        alert("Error processing new document!");
      }
      console.error("Error processing new document!");
      location.reload();
    }
    setTimeout(() => {
      this.processUpdateElements(newDocument);
    }, 0);
  };
  formChangeAutoSave = (e) => {
    let form = e.target;
    if (form.form instanceof HTMLFormElement) {
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
    this.submitForm(form, this.completeAutoSave);
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
    let recentlyChangedInput = form.querySelectorAll(".input-changed");
    if (recentlyChangedInput.length > 0) {
      return;
    }
    let submitter = null;
    if (e.submitter instanceof HTMLButtonElement) {
      submitter = e.submitter;
    }
    this.submitForm(form, this.completeAutoSave, submitter);
  };
  /**
   * Apply the relevant pieces of a newly fetched document onto the
   * current page using the registered update targets.
   */
  processUpdateElements = (newDocument) => {
    this.focusStateManager.markAutofocus(newDocument);
    let newActiveElement = this.focusStateManager.capturePendingActiveElement(newDocument);
    for (let type of this.updateTargetRegistry.getTypes()) {
      this.updateTargetRegistry.getElements(type).forEach((existingElement) => {
        if (!existingElement) {
          return;
        }
        let activeElementState = this.focusStateManager.captureElementState(existingElement);
        let xPath = DomPath.getXPathForElement(existingElement, document);
        let newElement = DomPath.findInDocument(newDocument, xPath);
        if (type === "outer") {
          this.updateTargetRegistry.replace(type, existingElement, newElement);
          if (newElement) {
            this.reattachEventListeners(existingElement, newElement);
            this.reattachFluxElements(existingElement, newElement);
            existingElement.replaceWith(newElement);
          }
        } else if (type === "inner") {
          this.reattachEventListeners(existingElement, newElement);
          this.reattachFluxElements(existingElement, newElement);
          while (existingElement.firstChild) {
            existingElement.removeChild(existingElement.firstChild);
          }
          while (newElement && newElement.firstChild) {
            existingElement.appendChild(newElement.firstChild);
          }
        }
        if (activeElementState) {
          _Flux.DEBUG && console.debug("Active element", activeElementState.path);
          this.focusStateManager.restoreElementState(activeElementState);
        }
      });
    }
    this.focusStateManager.restorePendingActiveElement(newActiveElement);
    _Flux.DEBUG && newActiveElement && console.debug("Focussed and blurred", newActiveElement);
    this.focusStateManager.focusMarkedAutofocusElements();
  };
  reattachEventListeners = (oldElement, newElement) => {
    if (!newElement) {
      return;
    }
    this.reattachElementListeners(oldElement, newElement);
    oldElement.querySelectorAll("*").forEach((oldChild) => {
      let xPath = DomPath.getXPathForElement(oldChild, oldElement);
      let newChild = DomPath.findInContext(newElement, xPath);
      if (newChild instanceof Element) {
        this.reattachElementListeners(oldChild, newChild);
      }
    });
  };
  reattachElementListeners = (oldElement, newElement) => {
    if (!this.elementEventMapper.has(oldElement)) {
      return;
    }
    let mapObj = this.elementEventMapper.get(oldElement);
    for (let type of Object.keys(mapObj)) {
      for (let listener of mapObj[type]) {
        newElement.addEventListener(type, listener);
        _Flux.DEBUG && console.debug("Reattached listener to element:", newElement, listener);
      }
    }
  };
  reattachFluxElements = (oldElement, newElement) => {
    if (!newElement) {
      return;
    }
    newElement.querySelectorAll("[data-flux]").forEach(this.initFluxElement);
    oldElement.querySelectorAll("[data-flux-obj]").forEach((fluxElement) => {
      let xPath = DomPath.getXPathForElement(fluxElement, oldElement);
      let newFluxElement = DomPath.findInContext(newElement, xPath);
      if (newFluxElement) {
        newFluxElement.fluxObj = fluxElement.fluxObj;
        newFluxElement.dataset["fluxObj"] = "";
      }
    });
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
