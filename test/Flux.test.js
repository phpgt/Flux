import { vi, describe, it, expect, beforeEach } from "vitest";
import { Flux } from "../src/Flux.es6";
import {ElementEventMapper} from "../src/ElementEventMapper.es6";
import {DomPath} from "../src/DomPath.es6";
import {UpdateTargetRegistry} from "../src/UpdateTargetRegistry.es6";
import {FocusStateManager} from "../src/FocusStateManager.es6";
import {NavigationController} from "../src/NavigationController.es6";
import {DocumentUpdater} from "../src/DocumentUpdater.es6";
import {FluxDirectiveRegistry} from "../src/FluxDirectiveRegistry.es6";
import {FluxDomBridge} from "../src/FluxDomBridge.es6";
import {FluxFormHandler} from "../src/FluxFormHandler.es6";
import {FluxLinkHandler} from "../src/FluxLinkHandler.es6";
import {FluxResponseHandler} from "../src/FluxResponseHandler.es6";

beforeEach(() => {
	document.body.innerHTML = "";
	document.head.innerHTML = "";
});

describe("Flux", () => {
	it("attaches event listeners to form elements marked with data-flux", () => {
		document.body.innerHTML = `
		<h1>This is a test!</h1>
		<form method="post" data-flux>
			<output>0</output>
			<button name="do" value="increment">Increment</button>
			<button name="do" value="decrement">Decrement</button>
		</form>
		`;

		let form = document.forms[0];
		const spy = vi.spyOn(form, "addEventListener");
		new Flux();
		expect(spy).toHaveBeenCalledWith("submit", expect.any(Function));
	});

	it("treats data-flux on anchors as shorthand for data-flux=link", () => {
		document.body.innerHTML = `
		<h1>This is a test!</h1>
		<a href="/next" data-flux>Next</a>
		`;

		let link = document.querySelector("a");
		const spy = vi.spyOn(link, "addEventListener");
		new Flux();
		expect(spy).toHaveBeenCalledWith("click", expect.any(Function));
	});

	it("attaches event listeners to buttons with data-flux=submit", () => {
		document.body.innerHTML = `
		<h1>This is a test!</h1>
		<form method="post" data-flux="update-inner">
			<output>0</output>
			<button name="do" value="increment" data-flux="submit">Increment</button>
			<button name="do" value="decrement" data-flux="submit">Decrement</button>
		</form>
		`;
// TODO: Actually test something real here... first we need to see what's happening in a real browser, and compare accordingly.

		let form = document.forms[0];
		let elementEventMapper = new ElementEventMapper();
		const spy = vi.spyOn(elementEventMapper, "addToMapType");
		let flux = new Flux(undefined, elementEventMapper);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(
			expect.any(HTMLElement),
			"submit",
			expect.any(Function),
		);
	});

	it("logs unknown directives without halting other flux initialisation", () => {
		document.body.innerHTML = `
		<div data-flux="unknown"></div>
		<form method="post" data-flux>
			<button name="do" value="increment">Increment</button>
		</form>
		`;

		let form = document.forms[0];
		let addEventListenerSpy = vi.spyOn(form, "addEventListener");
		let errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		new Flux();

		expect(errorSpy).toHaveBeenCalledWith(
			"Error initialising flux element: unknown",
			expect.any(HTMLElement),
			expect.any(TypeError),
		);
		expect(addEventListenerSpy).toHaveBeenCalledWith("submit", expect.any(Function));

		errorSpy.mockRestore();
	});
});

describe("DomPath", () => {
	it("locates the same element in a parsed document", () => {
		document.body.innerHTML = `
		<main>
			<section>
				<input name="title" value="Example">
			</section>
		</main>
		`;

		let input = document.querySelector("input");
		let path = DomPath.getXPathForElement(input);
		let parser = new DOMParser();
		let newDocument = parser.parseFromString(`
			<html>
				<body>
					<main>
						<section>
							<input name="title" value="Example updated">
						</section>
					</main>
				</body>
			</html>
		`, "text/html");

		let matched = DomPath.findInDocument(newDocument, path);
		expect(matched.getAttribute("value")).toBe("Example updated");
	});
});

describe("UpdateTargetRegistry", () => {
	it("tracks and replaces registered update targets by type", () => {
		let registry = new UpdateTargetRegistry();
		let existingElement = document.createElement("div");
		let newElement = document.createElement("div");

		registry.add(existingElement, "outer");
		registry.replace("outer", existingElement, newElement);

		expect(registry.getTypes()).toEqual(["outer"]);
		expect(registry.getElements("outer")).toEqual([newElement]);
	});

	it("removes registered update targets by type", () => {
		let registry = new UpdateTargetRegistry();
		let existingElement = document.createElement("div");

		registry.add(existingElement, "outer");
		registry.remove("outer", existingElement);

		expect(registry.getElements("outer")).toEqual([]);
	});
});

describe("FocusStateManager", () => {
	it("stores form state and resolves the equivalent active element in a new document", () => {
		document.body.innerHTML = `
		<form>
			<input name="title" value="One">
		</form>
		`;

		let form = document.querySelector("form");
		let input = document.querySelector("input");
		let focusStateManager = new FocusStateManager();
		focusStateManager.storeFormState(form, input);

		let parser = new DOMParser();
		let newDocument = parser.parseFromString(`
			<html>
				<body>
					<form>
						<input name="title" value="Two">
					</form>
				</body>
			</html>
		`, "text/html");

		let matched = focusStateManager.capturePendingActiveElement(newDocument);
		expect(matched.getAttribute("value")).toBe("Two");
	});
});

describe("NavigationController", () => {
	it("submits a form, pushes history and parses the response document", async () => {
		document.body.innerHTML = `
		<form action="/submit" method="post">
			<input name="title" value="One">
		</form>
		`;

		let form = document.querySelector("form");
		let callback = vi.fn();
		let pushState = vi.fn();
		let fetcher = vi.fn().mockResolvedValue({
			ok: true,
			url: "https://example.com/next",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Next</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState},
			{error: vi.fn()},
		);

		await navigationController.submitForm(form, new FormData(form), callback);

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher.mock.calls[0][0]).toBe(form.action);
		expect(fetcher.mock.calls[0][1]).toMatchObject({
			method: "post",
			credentials: "same-origin",
		});
		expect(fetcher.mock.calls[0][1].body).toBeInstanceOf(FormData);
		expect(pushState).toHaveBeenCalledWith({action: "submitForm"}, "", "https://example.com/next");
		expect(callback).toHaveBeenCalledWith(expect.any(Document));
		expect(form.classList.contains("submitting")).toBe(false);
	});

	it("submits GET forms by encoding form data into the URL query string", async () => {
		document.body.innerHTML = `
		<form action="/search?scope=docs" method="get">
			<input name="title" value="One">
		</form>
		`;

		let form = document.querySelector("form");
		let callback = vi.fn();
		let fetcher = vi.fn().mockResolvedValue({
			ok: true,
			url: "https://example.com/search?scope=docs&title=One",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Next</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState: vi.fn()},
			{error: vi.fn()},
		);

		await navigationController.submitForm(form, new FormData(form), callback);

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher.mock.calls[0][0]).toBe("http://localhost:3000/search?scope=docs&title=One");
		expect(fetcher.mock.calls[0][1]).toEqual({
			method: "get",
			credentials: "same-origin",
		});
	});

	it("logs request errors and clears the submitting state", async () => {
		document.body.innerHTML = `<a href="/next">Next</a>`;

		let link = document.querySelector("a");
		let logger = {error: vi.fn()};
		let fetcher = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Server Error",
			url: "https://example.com/next",
			text: vi.fn(),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState: vi.fn()},
			logger,
		);

		let result = await navigationController.clickLink(link, vi.fn());

		expect(result).toBeNull();
		expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
		expect(link.classList.contains("submitting")).toBe(false);
	});
});

describe("DocumentUpdater", () => {
	it("applies outer updates through the registry and preparation hook", () => {
		document.body.innerHTML = `<main data-flux="update-outer"><span>Old</span></main>`;

		let existingElement = document.querySelector("main");
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingElement, "outer");
		let focusStateManager = {
			markAutofocus: vi.fn(),
			capturePendingActiveElement: vi.fn().mockReturnValue(null),
			captureElementState: vi.fn().mockReturnValue(null),
			restoreElementState: vi.fn(),
			restorePendingActiveElement: vi.fn(),
			focusMarkedAutofocusElements: vi.fn(),
		};
		let prepareElementUpdate = vi.fn();
		let documentUpdater = new DocumentUpdater(
			updateTargetRegistry,
			focusStateManager,
			prepareElementUpdate,
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<main data-flux="update-outer"><span>New</span></main>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument);

		expect(prepareElementUpdate).toHaveBeenCalledTimes(1);
		expect(document.querySelector("main").textContent).toBe("New");
		expect(updateTargetRegistry.getElements("outer")[0]).toBe(document.querySelector("main"));
		expect(focusStateManager.markAutofocus).toHaveBeenCalledWith(newDocument);
		expect(focusStateManager.focusMarkedAutofocusElements).toHaveBeenCalled();
	});

	it("applies inner updates without replacing the tracked element", () => {
		document.body.innerHTML = `<section data-flux="update-inner"><span>Old</span></section>`;

		let existingElement = document.querySelector("section");
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingElement, "inner");
		let documentUpdater = new DocumentUpdater(
			updateTargetRegistry,
			{
				markAutofocus: vi.fn(),
				capturePendingActiveElement: vi.fn().mockReturnValue(null),
				captureElementState: vi.fn().mockReturnValue(null),
				restoreElementState: vi.fn(),
				restorePendingActiveElement: vi.fn(),
				focusMarkedAutofocusElements: vi.fn(),
			},
			vi.fn(),
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<section data-flux="update-inner"><strong>New</strong></section>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument);

		expect(document.querySelector("section")).toBe(existingElement);
		expect(existingElement.innerHTML).toBe("<strong>New</strong>");
	});

	it("applies link-only targets only when their types are allowed", () => {
		document.body.innerHTML = `
		<main data-flux="update-link"><span>Old outer</span></main>
		<section data-flux="update-link-inner"><span>Old inner</span></section>
		`;

		let existingOuter = document.querySelector("main");
		let existingInner = document.querySelector("section");
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingOuter, "link-outer");
		updateTargetRegistry.add(existingInner, "link-inner");
		let documentUpdater = new DocumentUpdater(
			updateTargetRegistry,
			{
				markAutofocus: vi.fn(),
				capturePendingActiveElement: vi.fn().mockReturnValue(null),
				captureElementState: vi.fn().mockReturnValue(null),
				restoreElementState: vi.fn(),
				restorePendingActiveElement: vi.fn(),
				focusMarkedAutofocusElements: vi.fn(),
			},
			vi.fn(),
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<main data-flux="update-link"><span>New outer</span></main>
					<section data-flux="update-link-inner"><strong>New inner</strong></section>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument, ["outer", "inner", "attributes"]);

		expect(document.querySelector("main")).toBe(existingOuter);
		expect(existingOuter.textContent).toBe("Old outer");
		expect(existingInner.innerHTML).toBe("<span>Old inner</span>");

		documentUpdater.apply(newDocument, ["link-outer", "link-inner"]);

		expect(document.querySelector("main")).not.toBe(existingOuter);
		expect(document.querySelector("main").textContent).toBe("New outer");
		expect(existingInner.innerHTML).toBe("<strong>New inner</strong>");
	});

	it("drops disconnected nested targets after an outer replacement", () => {
		document.body.innerHTML = `
		<main data-flux="update-link">
			<section data-flux="update-inner"><span>Old inner</span></section>
		</main>
		`;

		let existingOuter = document.querySelector("main");
		let existingInner = document.querySelector("section");
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingOuter, "link-outer");
		updateTargetRegistry.add(existingInner, "inner");
		let documentUpdater = new DocumentUpdater(
			updateTargetRegistry,
			{
				markAutofocus: vi.fn(),
				capturePendingActiveElement: vi.fn().mockReturnValue(null),
				captureElementState: vi.fn().mockReturnValue(null),
				restoreElementState: vi.fn(),
				restorePendingActiveElement: vi.fn(),
				focusMarkedAutofocusElements: vi.fn(),
			},
			vi.fn(),
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<main data-flux="update-link">
						<section data-flux="update-inner"><strong>New inner</strong></section>
					</main>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument, ["inner", "link-outer"]);

		expect(updateTargetRegistry.getElements("inner")).toEqual([]);
		expect(document.querySelector("main").textContent).toContain("New inner");
	});

	it("does not process update targets added during the current apply pass", () => {
		document.body.innerHTML = `<main data-flux="update-link"><section data-flux="update-inner"><span>Old</span></section></main>`;

		let existingOuter = document.querySelector("main");
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingOuter, "link-outer");
		let documentUpdater = new DocumentUpdater(
			updateTargetRegistry,
			{
				markAutofocus: vi.fn(),
				capturePendingActiveElement: vi.fn().mockReturnValue(null),
				captureElementState: vi.fn().mockReturnValue(null),
				restoreElementState: vi.fn(),
				restorePendingActiveElement: vi.fn(),
				focusMarkedAutofocusElements: vi.fn(),
			},
			vi.fn((oldElement, newElement) => {
				if(oldElement.tagName === "MAIN") {
					updateTargetRegistry.add(newElement.querySelector("section"), "inner");
				}
			}),
		);
		let applyInnerUpdateSpy = vi.spyOn(documentUpdater, "applyInnerUpdate");
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<main data-flux="update-link"><section data-flux="update-inner"><strong>New</strong></section></main>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument, ["link-outer", "inner"]);

		expect(applyInnerUpdateSpy).not.toHaveBeenCalled();
		expect(updateTargetRegistry.getElements("inner")).toHaveLength(1);
		expect(document.querySelector("section").innerHTML).toBe("<strong>New</strong>");
	});

	it("updates only the element attributes when using update-attributes", () => {
		document.body.innerHTML = `
		<body class="page-a" data-theme="light" data-flux="update-attributes">
			<main><span>Old content</span></main>
		</body>
		`;

		let existingElement = document.body;
		let originalHtml = existingElement.innerHTML;
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingElement, "attributes");
		let documentUpdater = new DocumentUpdater(
			updateTargetRegistry,
			{
				markAutofocus: vi.fn(),
				capturePendingActiveElement: vi.fn().mockReturnValue(null),
				captureElementState: vi.fn().mockReturnValue(null),
				restoreElementState: vi.fn(),
				restorePendingActiveElement: vi.fn(),
				focusMarkedAutofocusElements: vi.fn(),
			},
			vi.fn(),
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body class="page-b" data-state="loaded" data-flux="update-attributes">
					<main><span>New content</span></main>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument);

		expect(existingElement.getAttribute("class")).toBe("page-b");
		expect(existingElement.getAttribute("data-state")).toBe("loaded");
		expect(existingElement.hasAttribute("data-theme")).toBe(false);
		expect(existingElement.innerHTML).toBe(originalHtml);
	});
});

describe("FluxDirectiveRegistry", () => {
	it("defines every supported data-flux value in one place", () => {
		expect(FluxDirectiveRegistry.DEFINITIONS).toEqual({
			"": expect.objectContaining({handler: "autoContainer"}),
			"autosave": expect.objectContaining({handler: "autoSave"}),
			"update": expect.objectContaining({handler: "updateOuter"}),
			"update-outer": expect.objectContaining({handler: "updateOuter"}),
			"update-inner": expect.objectContaining({handler: "updateInner"}),
			"update-link": expect.objectContaining({handler: "updateLinkOuter"}),
			"update-link-inner": expect.objectContaining({handler: "updateLinkInner"}),
			"update-attributes": expect.objectContaining({handler: "updateAttributes"}),
			"submit": expect.objectContaining({handler: "autoSubmit"}),
			"link": expect.objectContaining({handler: "autoLink"}),
		});
	});

	it("dispatches an element to the configured directive handler", () => {
		document.body.innerHTML = `<button data-flux="autosave"></button>`;

		let autoSave = vi.fn();
		let registry = new FluxDirectiveRegistry({
			autoContainer: vi.fn(),
			autoSave,
			updateOuter: vi.fn(),
			updateInner: vi.fn(),
			updateLinkOuter: vi.fn(),
			updateLinkInner: vi.fn(),
			updateAttributes: vi.fn(),
			autoSubmit: vi.fn(),
			autoLink: vi.fn(),
		});

		registry.initElement(document.querySelector("button"));

		expect(autoSave).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
	});

	it("uses the autoContainer handler for empty data-flux values", () => {
		document.body.innerHTML = `<a data-flux href="/next">Next</a>`;

		let autoContainer = vi.fn();
		let registry = new FluxDirectiveRegistry({
			autoContainer,
			autoSave: vi.fn(),
			updateOuter: vi.fn(),
			updateInner: vi.fn(),
			updateLinkOuter: vi.fn(),
			updateLinkInner: vi.fn(),
			updateAttributes: vi.fn(),
			autoSubmit: vi.fn(),
			autoLink: vi.fn(),
		});

		registry.initElement(document.querySelector("a"));

		expect(autoContainer).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
	});

	it("throws when a data-flux value is not registered", () => {
		document.body.innerHTML = `<div data-flux="unknown"></div>`;

		let registry = new FluxDirectiveRegistry({
			autoContainer: vi.fn(),
			autoSave: vi.fn(),
			updateOuter: vi.fn(),
			updateInner: vi.fn(),
			updateLinkOuter: vi.fn(),
			updateLinkInner: vi.fn(),
			updateAttributes: vi.fn(),
			autoSubmit: vi.fn(),
			autoLink: vi.fn(),
		});

		expect(() => registry.initElement(document.querySelector("div"))).toThrow(
			"Unknown flux element type: unknown",
		);
	});
});

describe("FluxFormHandler", () => {
	it("prepares autosave form data using the configured button fallback", () => {
		document.body.innerHTML = `
		<form>
			<input name="title" value="One">
			<button name="save" value="draft" data-flux="autosave"></button>
		</form>
		`;

		let form = document.querySelector("form");
		let button = document.querySelector("button");
		let handler = new FluxFormHandler(
			{submitForm: vi.fn()},
			{storeFormState: vi.fn()},
			vi.fn(),
		);

		handler.initAutoSave(button);
		let formData = handler.getFormDataForButton(form, "autoSave");

		expect(formData.get("save")).toBe("draft");
	});

	it("uses link-style document handling for forms with an explicit action attribute", () => {
		document.body.innerHTML = `
		<form action="/next" method="get">
			<input name="title" value="One">
		</form>
		`;

		let form = document.querySelector("form");
		let onDocument = vi.fn();
		let onNavigationDocument = vi.fn();
		let navigationController = {submitForm: vi.fn()};
		let handler = new FluxFormHandler(
			navigationController,
			{storeFormState: vi.fn()},
			onDocument,
			onNavigationDocument,
		);

		handler.submitForm(form);

		expect(navigationController.submitForm).toHaveBeenCalledWith(
			form,
			expect.any(FormData),
			onNavigationDocument,
		);
	});

	it("keeps in-place document handling for forms without an explicit action attribute", () => {
		document.body.innerHTML = `
		<form method="post">
			<input name="title" value="One">
		</form>
		`;

		let form = document.querySelector("form");
		let onDocument = vi.fn();
		let onNavigationDocument = vi.fn();
		let navigationController = {submitForm: vi.fn()};
		let handler = new FluxFormHandler(
			navigationController,
			{storeFormState: vi.fn()},
			onDocument,
			onNavigationDocument,
		);

		handler.submitForm(form);

		expect(navigationController.submitForm).toHaveBeenCalledWith(
			form,
			expect.any(FormData),
			onDocument,
		);
	});
});

describe("FluxDomBridge", () => {
	it("reinitialises flux elements and transfers fluxObj during element replacement", () => {
		document.body.innerHTML = `
		<div>
			<form data-flux-obj="">
				<button data-flux="submit">Save</button>
			</form>
		</div>
		`;

		let oldElement = document.querySelector("div");
		let oldForm = document.querySelector("form");
		oldForm.fluxObj = {autoSave: {key: "save", value: "draft"}};
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<div>
						<form>
							<button data-flux="submit">Save</button>
						</form>
					</div>
				</body>
			</html>
		`, "text/html");
		let newElement = newDocument.querySelector("div");
		let initFluxElement = vi.fn();
		let bridge = new FluxDomBridge(
			{has: vi.fn().mockReturnValue(false), get: vi.fn()},
			initFluxElement,
		);

		bridge.prepareElementUpdate(oldElement, newElement);

		expect(initFluxElement).toHaveBeenCalledTimes(1);
		expect(initFluxElement.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
		expect(newElement.querySelector("form").fluxObj).toEqual(oldForm.fluxObj);
	});
});

describe("FluxResponseHandler", () => {
	it("schedules document updates when the response document is valid", () => {
		let apply = vi.fn();
		let scheduler = vi.fn((callback) => callback());
		let handler = new FluxResponseHandler(
			{apply},
			{error: vi.fn()},
			false,
			scheduler,
			vi.fn(),
			vi.fn(),
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<head><title>Ok</title></head>
				<body></body>
			</html>
		`, "text/html");

		handler.handleDocument(newDocument);

		expect(scheduler).toHaveBeenCalledWith(expect.any(Function), 0);
		expect(apply).toHaveBeenCalledWith(newDocument, ["outer", "inner", "attributes"]);
	});

	it("forces the page to the top after link-driven document updates complete", () => {
		let apply = vi.fn();
		let scrollTo = vi.fn();
		let scheduler = vi.fn((callback) => callback());
		let animationFrame = vi.fn((callback) => callback());
		let handler = new FluxResponseHandler(
			{apply},
			{error: vi.fn()},
			false,
			scheduler,
			vi.fn(),
			vi.fn(),
			{scrollTo},
			animationFrame,
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<head><title>Ok</title></head>
				<body></body>
			</html>
		`, "text/html");

		handler.handleLinkDocument(newDocument);

		expect(apply).toHaveBeenCalledWith(newDocument, ["outer", "inner", "attributes", "link-outer", "link-inner"]);
		expect(animationFrame).toHaveBeenCalledTimes(2);
		expect(scrollTo).toHaveBeenCalledWith({
			top: 0,
			left: 0,
			behavior: "auto",
		});
	});
});

describe("FluxLinkHandler", () => {
	it("scrolls to the top smoothly as soon as a flux link is clicked", () => {
		let scrollTo = vi.fn();
		let navigationController = {clickLink: vi.fn()};
		let handler = new FluxLinkHandler(
			navigationController,
			vi.fn(),
			{scrollTo},
		);
		let preventDefault = vi.fn();
		document.body.innerHTML = `<a href="/next" data-flux="link">Next</a>`;
		let link = document.querySelector("a");

		handler.autoClick({
			preventDefault,
			currentTarget: link,
		});

		expect(preventDefault).toHaveBeenCalled();
		expect(scrollTo).toHaveBeenCalledWith({
			top: 0,
			left: 0,
			behavior: "smooth",
		});
		expect(navigationController.clickLink).not.toHaveBeenCalled();
	});
});
