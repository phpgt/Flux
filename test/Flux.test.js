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
import {FluxLiveHandler} from "../src/FluxLiveHandler.es6";

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

	it("treats data-flux on buttons as shorthand for data-flux=submit", () => {
		document.body.innerHTML = `
		<form method="post" data-flux="update-inner">
			<button name="do" value="increment" data-flux>Increment</button>
		</form>
		`;

		let form = document.forms[0];
		const spy = vi.spyOn(form, "addEventListener");
		new Flux();
		expect(spy).toHaveBeenCalledWith("submit", expect.any(Function));
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

	it("logs unsupported bare data-flux elements without halting other flux initialisation", () => {
		document.body.innerHTML = `
		<div data-flux></div>
		<form method="post" data-flux>
			<button name="do" value="increment">Increment</button>
		</form>
		`;

		let form = document.forms[0];
		let addEventListenerSpy = vi.spyOn(form, "addEventListener");
		let errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		new Flux();

		expect(errorSpy).toHaveBeenCalledWith(
			"Error initialising flux element: ",
			expect.any(HTMLElement),
			expect.objectContaining({
				message: "Bare data-flux must be applied to a form, button, or anchor element.",
			}),
		);
		expect(addEventListenerSpy).toHaveBeenCalledWith("submit", expect.any(Function));

		errorSpy.mockRestore();
	});

	it("starts a single live polling loop even when multiple live elements exist", () => {
		document.body.innerHTML = `
		<section data-flux="live"></section>
		<section data-flux="live-inner"></section>
		`;

		let liveHandler = {
			register: vi.fn(),
		};
		new Flux(
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			liveHandler,
		);

		expect(liveHandler.register).toHaveBeenCalledTimes(2);
		expect(liveHandler.register).toHaveBeenNthCalledWith(1, "live-outer", document.querySelectorAll("section")[0]);
		expect(liveHandler.register).toHaveBeenNthCalledWith(2, "live-inner", document.querySelectorAll("section")[1]);
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
	it("adds flux-form-waiting to the body and form while a form request is pending", async () => {
		document.body.innerHTML = `
		<form action="/submit" method="post">
			<input name="title" value="One">
			<button name="save" value="publish">Save</button>
		</form>
		`;

		let resolveFetch;
		let callback = vi.fn();
		let fetcher = vi.fn().mockImplementation(() => new Promise(resolve => {
			resolveFetch = resolve;
		}));
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState: vi.fn()},
			{error: vi.fn()},
		);
		let form = document.querySelector("form");
		let button = document.querySelector("button");

		let pendingRequest = navigationController.submitForm(form, new FormData(form), callback, button);

		expect(document.body.classList.contains("flux-form-waiting")).toBe(true);
		expect(form.classList.contains("flux-form-waiting")).toBe(true);
		expect(button.classList.contains("flux-button-waiting")).toBe(true);

		resolveFetch({
			ok: true,
			url: "https://example.com/next",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Next</main></body></html>"),
		});
		await pendingRequest;

		expect(document.body.classList.contains("flux-form-waiting")).toBe(false);
		expect(form.classList.contains("flux-form-waiting")).toBe(false);
		expect(button.classList.contains("flux-button-waiting")).toBe(false);
	});

	it("adds flux-link-waiting to the body and link while a link request is pending", async () => {
		document.body.innerHTML = `<a href="/next">Next</a>`;

		let resolveFetch;
		let callback = vi.fn();
		let fetcher = vi.fn().mockImplementation(() => new Promise(resolve => {
			resolveFetch = resolve;
		}));
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState: vi.fn()},
			{error: vi.fn()},
		);
		let link = document.querySelector("a");

		let pendingRequest = navigationController.clickLink(link, callback);

		expect(document.body.classList.contains("flux-link-waiting")).toBe(true);
		expect(link.classList.contains("flux-link-waiting")).toBe(true);

		resolveFetch({
			ok: true,
			url: "https://example.com/next",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Next</main></body></html>"),
		});
		await pendingRequest;

		expect(document.body.classList.contains("flux-link-waiting")).toBe(false);
		expect(link.classList.contains("flux-link-waiting")).toBe(false);
	});

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
		expect(form.classList.contains("flux-form-waiting")).toBe(false);
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

	it("logs request errors and clears waiting state classes", async () => {
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
		expect(link.classList.contains("flux-link-waiting")).toBe(false);
		expect(document.body.classList.contains("flux-link-waiting")).toBe(false);
	});

	it("polls the current document without pushing history state", async () => {
		let callback = vi.fn();
		let pushState = vi.fn();
		let fetcher = vi.fn().mockResolvedValue({
			ok: true,
			url: "https://example.com/live",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Tick</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState},
			{error: vi.fn()},
		);

		await navigationController.pollDocument("https://example.com/live", callback);

		expect(fetcher).toHaveBeenCalledWith("https://example.com/live", {
			credentials: "same-origin",
			method: "get",
		});
		expect(pushState).not.toHaveBeenCalled();
		expect(callback).toHaveBeenCalledWith(expect.any(Document));
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

	it("prefers id matching over DOM position for outer updates", () => {
		document.body.innerHTML = `
		<div class="layout-a">
			<main id="target" data-flux="update"><span>Old</span></main>
		</div>
		`;

		let existingElement = document.querySelector("#target");
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingElement, "outer");
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
					<header>Moved above</header>
					<section class="layout-b">
						<main id="target" data-flux="update"><span>New</span></main>
					</section>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument);

		expect(document.querySelector("#target").textContent).toBe("New");
		expect(updateTargetRegistry.getElements("outer")[0]).toBe(document.querySelector("#target"));
	});

	it("prefers id matching over DOM position for inner updates", () => {
		document.body.innerHTML = `
		<div class="layout-a">
			<section id="target" data-flux="update-inner"><span>Old</span></section>
		</div>
		`;

		let existingElement = document.querySelector("#target");
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
					<header>Moved above</header>
					<div class="layout-b">
						<section id="target" data-flux="update-inner"><strong>New</strong></section>
					</div>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument);

		expect(document.querySelector("#target")).toBe(existingElement);
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

	it("applies live targets only when the live update types are allowed", () => {
		document.body.innerHTML = `
		<main data-flux="live"><span>Old outer</span></main>
		<section data-flux="live-inner"><span>Old inner</span></section>
		`;

		let existingOuter = document.querySelector("main");
		let existingInner = document.querySelector("section");
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingOuter, "live-outer");
		updateTargetRegistry.add(existingInner, "live-inner");
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
					<main data-flux="live"><span>New outer</span></main>
					<section data-flux="live-inner"><strong>New inner</strong></section>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument, ["outer", "inner"]);

		expect(document.querySelector("main")).toBe(existingOuter);
		expect(existingInner.innerHTML).toBe("<span>Old inner</span>");

		documentUpdater.apply(newDocument, ["live-outer", "live-inner"]);

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
			"live": expect.objectContaining({handler: "liveOuter"}),
			"live-outer": expect.objectContaining({handler: "liveOuter"}),
			"live-inner": expect.objectContaining({handler: "liveInner"}),
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
			liveOuter: vi.fn(),
			liveInner: vi.fn(),
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
			liveOuter: vi.fn(),
			liveInner: vi.fn(),
			updateAttributes: vi.fn(),
			autoSubmit: vi.fn(),
			autoLink: vi.fn(),
		});

		registry.initElement(document.querySelector("a"));

		expect(autoContainer).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
	});

	it("uses the autoSubmit handler for empty data-flux values on buttons", () => {
		document.body.innerHTML = `<form><button data-flux>Save</button></form>`;

		let autoSubmit = vi.fn();
		let registry = new FluxDirectiveRegistry({
			autoContainer: vi.fn(),
			autoSave: vi.fn(),
			updateOuter: vi.fn(),
			updateInner: vi.fn(),
			updateLinkOuter: vi.fn(),
			updateLinkInner: vi.fn(),
			liveOuter: vi.fn(),
			liveInner: vi.fn(),
			updateAttributes: vi.fn(),
			autoSubmit,
			autoLink: vi.fn(),
		});

		registry.initElement(document.querySelector("button"));

		expect(autoSubmit).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
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
			liveOuter: vi.fn(),
			liveInner: vi.fn(),
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

	it("includes the clicked submit button name and value in form data", () => {
		document.body.innerHTML = `
		<form>
			<input name="title" value="One">
			<button name="save" value="publish" data-flux="submit"></button>
		</form>
		`;

		let form = document.querySelector("form");
		let button = document.querySelector("button");
		let handler = new FluxFormHandler(
			{submitForm: vi.fn()},
			{storeFormState: vi.fn()},
			vi.fn(),
		);

		let formData = handler.getFormDataForButton(form, "autoSave", button);

		expect(formData.get("save")).toBe("publish");
		expect(formData.get("title")).toBe("One");
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
			undefined,
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
			undefined,
		);
	});

	it("rate limits submitter buttons when data-flux-rate is present", () => {
		let now = 1000;
		document.body.innerHTML = `
		<form method="post">
			<button data-flux="submit" data-flux-rate="1.5">Save</button>
		</form>
		`;

		let form = document.querySelector("form");
		let button = document.querySelector("button");
		let navigationController = {submitForm: vi.fn()};
		let handler = new FluxFormHandler(
			navigationController,
			{storeFormState: vi.fn()},
			vi.fn(),
			vi.fn(),
			console,
			false,
			() => now,
		);

		handler.submitForm(form, button);
		now = 2000;
		handler.submitForm(form, button);
		now = 2600;
		handler.submitForm(form, button);

		expect(navigationController.submitForm).toHaveBeenCalledTimes(2);
	});

	it("keeps submitter rate limiting after the button is replaced", () => {
		let now = 1000;
		document.body.innerHTML = `
		<main>
			<form method="post">
				<button data-flux="submit" data-flux-rate="1">Save</button>
			</form>
		</main>
		`;

		let navigationController = {submitForm: vi.fn()};
		let handler = new FluxFormHandler(
			navigationController,
			{storeFormState: vi.fn()},
			vi.fn(),
			vi.fn(),
			console,
			false,
			() => now,
		);

		handler.submitForm(document.querySelector("form"), document.querySelector("button"));

		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<main>
						<form method="post">
							<button data-flux="submit" data-flux-rate="1">Save</button>
						</form>
					</main>
				</body>
			</html>
		`, "text/html");
		document.querySelector("main").replaceWith(newDocument.querySelector("main"));

		now = 1500;
		handler.submitForm(document.querySelector("form"), document.querySelector("button"));
		now = 2001;
		handler.submitForm(document.querySelector("form"), document.querySelector("button"));

		expect(navigationController.submitForm).toHaveBeenCalledTimes(2);
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

	it("routes live refresh documents to the live update types only", () => {
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

		handler.handleLiveDocument(newDocument);

		expect(apply).toHaveBeenCalledWith(newDocument, ["live-outer", "live-inner"], undefined);
	});

	it("can apply a live response to only the due live targets", () => {
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

		handler.handleLiveDocument(newDocument, ["live-outer:./BODY[1]/MAIN[1]"]);

		expect(apply).toHaveBeenCalledWith(
			newDocument,
			["live-outer", "live-inner"],
			["live-outer:./BODY[1]/MAIN[1]"],
		);
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

	it("rate limits links when data-flux-rate is present", () => {
		let now = 1000;
		let navigationController = {clickLink: vi.fn()};
		let handler = new FluxLinkHandler(
			navigationController,
			vi.fn(),
			{scrollTo: vi.fn()},
			() => now,
		);
		document.body.innerHTML = `<a href="/next" data-flux="link" data-flux-rate="1">Next</a>`;
		let link = document.querySelector("a");

		handler.clickLink(link);
		now = 1500;
		handler.clickLink(link);
		now = 2001;
		handler.clickLink(link);

		expect(navigationController.clickLink).toHaveBeenCalledTimes(2);
	});

	it("keeps link rate limiting after the link element is replaced", () => {
		let now = 1000;
		let navigationController = {clickLink: vi.fn()};
		let handler = new FluxLinkHandler(
			navigationController,
			vi.fn(),
			{scrollTo: vi.fn()},
			() => now,
		);
		document.body.innerHTML = `<main><a href="/next" data-flux="link" data-flux-rate="1">Next</a></main>`;

		handler.clickLink(document.querySelector("a"));

		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<main><a href="/next" data-flux="link" data-flux-rate="1">Next</a></main>
				</body>
			</html>
		`, "text/html");
		document.querySelector("main").replaceWith(newDocument.querySelector("main"));

		now = 1500;
		handler.clickLink(document.querySelector("a"));
		now = 2001;
		handler.clickLink(document.querySelector("a"));

		expect(navigationController.clickLink).toHaveBeenCalledTimes(2);
	});
});

describe("FluxLiveHandler", () => {
	it("uses one scheduled polling loop for multiple live elements", () => {
		document.body.innerHTML = `
		<main></main>
		<section></section>
		`;

		let updateTargetRegistry = new UpdateTargetRegistry();
		let scheduler = vi.fn().mockReturnValue(123);
		let clearScheduler = vi.fn();
		let handler = new FluxLiveHandler(
			{pollDocument: vi.fn()},
			updateTargetRegistry,
			vi.fn(),
			{debug: vi.fn()},
			false,
			scheduler,
			clearScheduler,
			{href: "https://example.com/live"},
		);

		handler.register("live-outer", document.querySelector("main"));
		handler.register("live-inner", document.querySelector("section"));

		expect(scheduler).toHaveBeenCalledTimes(1);
		expect(clearScheduler).not.toHaveBeenCalled();
	});

	it("waits until a live target's data-flux-rate is due before polling", () => {
		document.body.innerHTML = `<main data-flux="live" data-flux-rate="10"></main>`;

		let updateTargetRegistry = new UpdateTargetRegistry();
		let now = 0;
		let scheduler = vi.fn().mockReturnValue(123);
		let handler = new FluxLiveHandler(
			{pollDocument: vi.fn()},
			updateTargetRegistry,
			vi.fn(),
			console,
			false,
			scheduler,
			vi.fn(),
			{href: "https://example.com/live"},
			1000,
			() => now,
			DomPath,
		);
		let main = document.querySelector("main");

		handler.register("live-outer", main);

		expect(scheduler).toHaveBeenLastCalledWith(expect.any(Function), 10000);

		handler.lastRefreshMap.set(handler.getTargetKey("live-outer", main), 0);
		handler.timerId = null;
		now = 2000;
		handler.ensureRunning();

		expect(scheduler).toHaveBeenLastCalledWith(expect.any(Function), 8000);
	});

	it("uses id-based keys for live targets when an id is present", () => {
		document.body.innerHTML = `<main id="clock" data-flux="live"></main>`;

		let updateTargetRegistry = new UpdateTargetRegistry();
		let handler = new FluxLiveHandler(
			{pollDocument: vi.fn()},
			updateTargetRegistry,
			vi.fn(),
		);
		let main = document.querySelector("main");

		expect(handler.getTargetKey("live-outer", main)).toBe("live-outer:#clock");
	});

	it("polls once and applies only the due live targets", async() => {
		document.body.innerHTML = `
		<main data-flux="live" data-flux-rate="1"></main>
		<section data-flux="live-inner" data-flux-rate="10"></section>
		`;

		let updateTargetRegistry = new UpdateTargetRegistry();
		let now = 1000;
		let onDocument = vi.fn();
		let pollDocument = vi.fn().mockImplementation(async(url, callback) => {
			let newDocument = new DOMParser().parseFromString(`
				<html>
					<body>
						<main data-flux="live" data-flux-rate="1">Fast</main>
						<section data-flux="live-inner" data-flux-rate="10">Slow</section>
					</body>
				</html>
			`, "text/html");
			callback(newDocument);
		});
		let handler = new FluxLiveHandler(
			{pollDocument},
			updateTargetRegistry,
			onDocument,
			console,
			false,
			vi.fn().mockReturnValue(1),
			vi.fn(),
			{href: "https://example.com/live"},
			1000,
			() => now,
			DomPath,
		);
		let main = document.querySelector("main");
		let section = document.querySelector("section");
		let mainKey = handler.getTargetKey("live-outer", main);
		let sectionKey = handler.getTargetKey("live-inner", section);
		updateTargetRegistry.add(main, "live-outer");
		updateTargetRegistry.add(section, "live-inner");
		handler.lastRefreshMap.set(sectionKey, 0);

		await handler.pollDocument();

		expect(pollDocument).toHaveBeenCalledTimes(1);
		expect(onDocument).toHaveBeenCalledWith(expect.any(Document), [mainKey]);
		expect(handler.lastRefreshMap.get(mainKey)).toBe(1000);
		expect(handler.lastRefreshMap.get(sectionKey)).toBe(0);
	});

	it("continues polling after a live outer element is replaced", async () => {
		document.body.innerHTML = `<main data-flux="live">Old</main>`;

		let existingElement = document.querySelector("main");
		let updateTargetRegistry = new UpdateTargetRegistry();
		let pollDocument = vi.fn().mockResolvedValue(null);
		let onDocument = vi.fn((newDocument) => {
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
			documentUpdater.apply(newDocument, ["live-outer"]);
		});
		let scheduler = vi.fn().mockReturnValue(1);
		let handler = new FluxLiveHandler(
			{pollDocument},
			updateTargetRegistry,
			onDocument,
			{debug: vi.fn()},
			false,
			scheduler,
			vi.fn(),
			{href: "https://example.com/live"},
		);
		updateTargetRegistry.add(existingElement, "live-outer");

		pollDocument.mockImplementation(async(url, callback) => {
			let newDocument = new DOMParser().parseFromString(`
				<html>
					<body>
						<main data-flux="live">New</main>
					</body>
				</html>
			`, "text/html");
			callback(newDocument);
		});

		await handler.pollDocument();

		expect(pollDocument).toHaveBeenCalledWith("https://example.com/live", expect.any(Function));
		expect(updateTargetRegistry.getElements("live-outer")[0]).toBe(document.querySelector("main"));
		expect(document.querySelector("main").textContent).toBe("New");
		expect(scheduler).toHaveBeenCalled();
	});
});
