import { vi, describe, it, expect, beforeEach } from "vitest";
import { Flux } from "../src/Flux.es6";
import {ElementEventMapper} from "../src/ElementEventMapper.es6";
import {DomPath} from "../src/DomPath.es6";
import {UpdateTargetRegistry} from "../src/UpdateTargetRegistry.es6";
import {FocusStateManager} from "../src/FocusStateManager.es6";
import {NavigationController} from "../src/NavigationController.es6";
import {DocumentUpdater} from "../src/DocumentUpdater.es6";
import {DirectiveRegistry} from "../src/DirectiveRegistry.es6";
import {DomBridge} from "../src/DomBridge.es6";
import {FormHandler} from "../src/FormHandler.es6";
import {LinkHandler} from "../src/LinkHandler.es6";
import {ResponseHandler} from "../src/ResponseHandler.es6";
import {LiveHandler} from "../src/LiveHandler.es6";
import {AutocompleteHandler} from "../src/AutocompleteHandler.es6";
import {Handler as DragOrderHandler} from "../src/DragOrder/Handler.es6";
import {Preview} from "../src/DragOrder/Preview.es6";
import {RuntimeConfig} from "../src/RuntimeConfig.es6";

beforeEach(() => {
	document.body.innerHTML = "";
	document.head.innerHTML = "";
	document.body.removeAttribute("data-flux-scroll");
	document.documentElement.removeAttribute("data-flux-scroll");
	delete window.__fluxPopStateHandlerAttached;
	sessionStorage.clear();
	RuntimeConfig.debug = false;
	RuntimeConfig.scrollToTopBehavior = "auto";
	RuntimeConfig.restoreScrollBehavior = "auto";
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

	it("configures scroll behaviour from data-flux-scroll on the html element", () => {
		document.documentElement.dataset.fluxScroll = "smooth";

		new Flux();

		expect(RuntimeConfig.scrollToTopBehavior).toBe("smooth");
		expect(RuntimeConfig.restoreScrollBehavior).toBe("smooth");
	});

	it("prefers data-flux-scroll on the body element over the html element", () => {
		document.documentElement.dataset.fluxScroll = "smooth";
		document.body.dataset.fluxScroll = "auto";

		new Flux();

		expect(RuntimeConfig.scrollToTopBehavior).toBe("auto");
		expect(RuntimeConfig.restoreScrollBehavior).toBe("auto");
	});
});

describe("RuntimeConfig", () => {
	it("defaults scroll behaviours to auto", () => {
		expect(RuntimeConfig.scrollToTopBehavior).toBe("auto");
		expect(RuntimeConfig.restoreScrollBehavior).toBe("auto");
	});

	it("configures scroll behaviours with a shared shorthand or per-action values", () => {
		RuntimeConfig.configure({
			scrollBehavior: "smooth",
		});

		expect(RuntimeConfig.scrollToTopBehavior).toBe("smooth");
		expect(RuntimeConfig.restoreScrollBehavior).toBe("smooth");

		RuntimeConfig.configure({
			scrollToTopBehavior: "auto",
			restoreScrollBehavior: "smooth",
		});

		expect(RuntimeConfig.scrollToTopBehavior).toBe("auto");
		expect(RuntimeConfig.restoreScrollBehavior).toBe("smooth");
	});

	it("ignores unsupported scroll behaviours", () => {
		RuntimeConfig.configure({
			scrollBehavior: "sideways",
			scrollToTopBehavior: "quickly",
			restoreScrollBehavior: "eventually",
		});

		expect(RuntimeConfig.scrollToTopBehavior).toBe("auto");
		expect(RuntimeConfig.restoreScrollBehavior).toBe("auto");
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

	it("returns null when no element is provided", () => {
		expect(DomPath.getXPathForElement(null)).toBe(null);
	});

	it("returns null when the context is not an ancestor", () => {
		document.body.innerHTML = `
		<main>
			<section><input name="title"></section>
			<form></form>
		</main>
		`;

		let input = document.querySelector("input");
		let form = document.querySelector("form");

		expect(DomPath.getXPathForElement(input, form)).toBe(null);
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

	it("does not store an invalid active path", () => {
		document.body.innerHTML = `
		<form>
			<input name="title" value="One">
		</form>
		`;

		let form = document.querySelector("form");
		let focusStateManager = new FocusStateManager();
		focusStateManager.storeFormState(form, null);

		expect(form.dataset["fluxPath"]).toBeTruthy();
		expect("fluxActive" in form.dataset).toBe(false);
	});

	it("restores focus to the pending active element without blurring it", () => {
		document.body.innerHTML = `
		<form>
			<input name="title" value="One">
		</form>
		`;

		let form = document.querySelector("form");
		let input = document.querySelector("input");
		let focusStateManager = new FocusStateManager();
		focusStateManager.storeFormState(form, input);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<form>
						<input name="title" value="Two">
					</form>
				</body>
			</html>
		`, "text/html");

		let matched = focusStateManager.capturePendingActiveElement(newDocument);
		document.body.replaceWith(newDocument.body);
		focusStateManager.restorePendingActiveElement(document.querySelector("input"));

		expect(document.activeElement).toBe(document.querySelector("input"));
		expect(matched.getAttribute("value")).toBe("Two");
	});

	it("restores the active input value and selection after replacement", () => {
		document.body.innerHTML = `
		<form>
			<input name="title" value="One">
		</form>
		`;

		let input = document.querySelector("input");
		let focusStateManager = new FocusStateManager();
		input.focus();
		input.value = "One updated";
		input.setSelectionRange(4, 11);

		let elementState = focusStateManager.captureElementState(document.querySelector("form"));

		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<form>
						<input name="title" value="One">
					</form>
				</body>
			</html>
		`, "text/html");
		document.body.replaceWith(newDocument.body);

		focusStateManager.restoreElementState(elementState);

		let restoredInput = document.querySelector("input");
		expect(restoredInput.value).toBe("One updated");
		expect(document.activeElement).toBe(restoredInput);
		expect(restoredInput.selectionStart).toBe(4);
		expect(restoredInput.selectionEnd).toBe(11);
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

	it("stores current scroll before pushing a link entry that restores to the top", async () => {
		document.body.innerHTML = `<a href="/next">Next</a>`;

		let link = document.querySelector("a");
		let callback = vi.fn();
		let replaceState = vi.fn();
		let pushState = vi.fn();
		let fetcher = vi.fn().mockResolvedValue({
			ok: true,
			url: "https://example.com/next",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Next</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{
				state: {existing: true},
				replaceState,
				pushState,
			},
			{error: vi.fn()},
			document,
			{
				scrollX: 12,
				scrollY: 345,
			},
		);

		await navigationController.clickLink(link, callback);

		expect(replaceState).toHaveBeenCalledWith({
			existing: true,
			fluxScrollX: 12,
			fluxScrollY: 345,
		}, "");
		expect(pushState).toHaveBeenCalledWith({
			action: "clickLink",
			fluxScrollX: 0,
			fluxScrollY: 0,
		}, "", "https://example.com/next");
		expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan(pushState.mock.invocationCallOrder[0]);
	});

	it("stores scoped scroll positions for links inside a data-flux-scroll element", async () => {
		document.body.innerHTML = `
		<section data-flux-scroll="smooth">
			<a href="/next">Next</a>
		</section>
		`;

		let section = document.querySelector("section");
		Object.defineProperty(section, "scrollLeft", {
			configurable: true,
			value: 8,
		});
		Object.defineProperty(section, "scrollTop", {
			configurable: true,
			value: 123,
		});
		let link = document.querySelector("a");
		let callback = vi.fn();
		let replaceState = vi.fn();
		let pushState = vi.fn();
		let fetcher = vi.fn().mockResolvedValue({
			ok: true,
			url: "https://example.com/next",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Next</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{
				state: {},
				replaceState,
				pushState,
			},
			{error: vi.fn()},
			document,
			{
				scrollX: 12,
				scrollY: 345,
			},
		);

		await navigationController.clickLink(link, callback);

		expect(replaceState).toHaveBeenCalledWith({
			fluxScrollX: 8,
			fluxScrollY: 123,
			fluxScrollBehavior: "smooth",
			fluxScrollPath: "./BODY[1]/./SECTION[1]",
		}, "");
		expect(pushState).toHaveBeenCalledWith({
			action: "clickLink",
			fluxScrollX: 0,
			fluxScrollY: 0,
			fluxScrollBehavior: "smooth",
			fluxScrollPath: "./BODY[1]/./SECTION[1]",
		}, "", "https://example.com/next");
	});

	it("parses and applies HTML error responses for form submissions", async () => {
		document.body.innerHTML = `
		<form action="/submit" method="post">
			<input name="title" value="One">
		</form>
		`;

		let form = document.querySelector("form");
		let callback = vi.fn();
		let pushState = vi.fn();
		let logger = {error: vi.fn()};
		let fetcher = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Server Error",
			url: "https://example.com/error",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Error page</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState},
			logger,
		);

		let result = await navigationController.submitForm(form, new FormData(form), callback);

		expect(result).toBeInstanceOf(Document);
		expect(callback).toHaveBeenCalledWith(expect.any(Document));
		expect(pushState).toHaveBeenCalledWith({action: "submitForm"}, "", "https://example.com/error");
		expect(logger.error).not.toHaveBeenCalled();
	});

	it("submits GET forms by replacing the URL query string with encoded form data", async () => {
		document.body.innerHTML = `
		<form action="/search?scope=docs" method="get">
			<input name="title" value="One">
		</form>
		`;

		let form = document.querySelector("form");
		let callback = vi.fn();
		let fetcher = vi.fn().mockResolvedValue({
			ok: true,
			url: "https://example.com/search?title=One",
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
		expect(fetcher.mock.calls[0][0]).toBe("http://localhost:3000/search?title=One");
		expect(fetcher.mock.calls[0][1]).toEqual({
			method: "get",
			credentials: "same-origin",
		});
	});

	it("does not accumulate previous query parameters when resubmitting a GET form", async () => {
		window.history.replaceState({}, "", "/?name=Ada+Lovelace&do=greet");
		document.body.innerHTML = `
		<form method="get">
			<input name="name" value="Grace Hopper">
			<button name="do" value="greet">Greet</button>
		</form>
		`;

		let form = document.querySelector("form");
		let button = document.querySelector("button");
		let callback = vi.fn();
		let fetcher = vi.fn().mockResolvedValue({
			ok: true,
			url: "https://example.com/?name=Grace+Hopper&do=greet",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Next</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState: vi.fn()},
			{error: vi.fn()},
		);

		let formData = new FormData(form);
		formData.set(button.name, button.value);
		await navigationController.submitForm(form, formData, callback, button);

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher.mock.calls[0][0]).toBe("http://localhost:3000/?name=Grace+Hopper&do=greet");
	});

	it("logs network request errors and clears waiting state classes", async () => {
		document.body.innerHTML = `<a href="/next">Next</a>`;

		let link = document.querySelector("a");
		let logger = {error: vi.fn()};
		let fetcher = vi.fn().mockRejectedValue(new TypeError("Network error"));
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

	it("parses and applies HTML error responses for link navigation", async () => {
		document.body.innerHTML = `<a href="/missing">Missing</a>`;

		let link = document.querySelector("a");
		let callback = vi.fn();
		let pushState = vi.fn();
		let logger = {error: vi.fn()};
		let fetcher = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			statusText: "Not Found",
			url: "https://example.com/missing",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Not found</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState},
			logger,
		);

		let result = await navigationController.clickLink(link, callback);

		expect(result).toBeInstanceOf(Document);
		expect(callback).toHaveBeenCalledWith(expect.any(Document), expect.objectContaining({
			action: "clickLink",
			fluxScrollY: 0,
		}));
		expect(pushState).toHaveBeenCalledWith({
			action: "clickLink",
			fluxScrollX: 0,
			fluxScrollY: 0,
		}, "", "https://example.com/missing");
		expect(logger.error).not.toHaveBeenCalled();
	});

	it("keeps logging live polling HTTP errors without applying them", async () => {
		let callback = vi.fn();
		let logger = {error: vi.fn()};
		let fetcher = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Server Error",
			url: "https://example.com/live",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Error</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState: vi.fn()},
			logger,
		);

		let result = await navigationController.pollDocument("https://example.com/live", callback);

		expect(result).toBeNull();
		expect(callback).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
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

	it("fetches a form document without pushing history state", async () => {
		document.body.innerHTML = `
		<form action="/search" method="get">
			<input name="query" value="London">
		</form>
		`;

		let form = document.querySelector("form");
		let callback = vi.fn();
		let pushState = vi.fn();
		let fetcher = vi.fn().mockResolvedValue({
			ok: true,
			url: "https://example.com/search?query=London",
			text: vi.fn().mockResolvedValue("<html><head></head><body><main>Results</main></body></html>"),
		});
		let navigationController = new NavigationController(
			new DOMParser(),
			fetcher,
			{pushState},
			{error: vi.fn()},
		);

		await navigationController.fetchForm(form, new FormData(form), callback);

		expect(fetcher).toHaveBeenCalledWith("http://localhost:3000/search?query=London", {
			method: "get",
			credentials: "same-origin",
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

	it("runs the completion hook after an outer update element is inserted", () => {
		document.body.innerHTML = `<main data-flux="update-outer"><span>Old</span></main>`;

		let existingElement = document.querySelector("main");
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingElement, "outer");
		let completeElementUpdate = vi.fn(element => {
			expect(element.isConnected).toBe(true);
			expect(document.querySelector("main")).toBe(element);
		});
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
			completeElementUpdate,
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<main data-flux="update-outer"><script>window.fluxScriptRan = true;</script></main>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument);

		expect(completeElementUpdate).toHaveBeenCalledTimes(1);
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

	it("runs the completion hook after inner update children are inserted", () => {
		document.body.innerHTML = `<section data-flux="update-inner"><span>Old</span></section>`;

		let existingElement = document.querySelector("section");
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingElement, "inner");
		let completeElementUpdate = vi.fn(element => {
			expect(element).toBe(existingElement);
			expect(element.isConnected).toBe(true);
			expect(element.querySelector("script")).toBeInstanceOf(HTMLScriptElement);
		});
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
			completeElementUpdate,
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<section data-flux="update-inner"><script>window.fluxScriptRan = true;</script></section>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument);

		expect(completeElementUpdate).toHaveBeenCalledTimes(1);
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

	it("preserves the active input value during an outer update", () => {
		document.body.innerHTML = `
		<main data-flux="update-outer">
			<form>
				<input name="first" value="One">
				<input name="second" value="Two">
			</form>
		</main>
		`;

		let existingElement = document.querySelector("main");
		let activeInput = document.querySelectorAll("input")[1];
		let updateTargetRegistry = new UpdateTargetRegistry();
		updateTargetRegistry.add(existingElement, "outer");
		let documentUpdater = new DocumentUpdater(
			updateTargetRegistry,
			new FocusStateManager(),
			vi.fn(),
		);
		activeInput.focus();
		activeInput.value = "TwoXYZ";
		activeInput.setSelectionRange(6, 6);

		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<main data-flux="update-outer">
						<form>
							<input name="first" value="One">
							<input name="second" value="Two">
						</form>
					</main>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument);

		let updatedInput = document.querySelectorAll("input")[1];
		expect(updatedInput.value).toBe("TwoXYZ");
		expect(document.activeElement).toBe(updatedInput);
		expect(updatedInput.selectionStart).toBe(6);
		expect(updatedInput.selectionEnd).toBe(6);
	});

	it("uses the response value when an active input has not changed since the request started", () => {
		document.body.innerHTML = `
		<form data-flux="update-inner">
			<ul></ul>
			<input name="new-item">
		</form>
		`;

		let form = document.querySelector("form");
		let input = document.querySelector("input");
		let updateTargetRegistry = new UpdateTargetRegistry();
		let focusStateManager = new FocusStateManager();
		updateTargetRegistry.add(form, "inner");
		let documentUpdater = new DocumentUpdater(
			updateTargetRegistry,
			focusStateManager,
			vi.fn(),
		);
		input.focus();
		input.value = "Milk";
		let requestElementState = focusStateManager.captureElementState(form);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<form data-flux="update-inner">
						<ul><li>Milk</li></ul>
						<input name="new-item">
					</form>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument, ["inner"], undefined, requestElementState);

		let updatedInput = document.querySelector("input");
		expect(updatedInput.value).toBe("");
		expect(document.activeElement).toBe(updatedInput);
	});

	it("preserves the active input value when it changes after the request starts", () => {
		document.body.innerHTML = `
		<form data-flux="update-inner">
			<ul></ul>
			<input name="new-item">
		</form>
		`;

		let form = document.querySelector("form");
		let input = document.querySelector("input");
		let updateTargetRegistry = new UpdateTargetRegistry();
		let focusStateManager = new FocusStateManager();
		updateTargetRegistry.add(form, "inner");
		let documentUpdater = new DocumentUpdater(
			updateTargetRegistry,
			focusStateManager,
			vi.fn(),
		);
		input.focus();
		input.value = "Milk";
		let requestElementState = focusStateManager.captureElementState(form);
		input.value = "Milk and bread";
		input.setSelectionRange(14, 14);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<form data-flux="update-inner">
						<ul><li>Milk</li></ul>
						<input name="new-item">
					</form>
				</body>
			</html>
		`, "text/html");

		documentUpdater.apply(newDocument, ["inner"], undefined, requestElementState);

		let updatedInput = document.querySelector("input");
		expect(updatedInput.value).toBe("Milk and bread");
		expect(document.activeElement).toBe(updatedInput);
		expect(updatedInput.selectionStart).toBe(14);
		expect(updatedInput.selectionEnd).toBe(14);
	});
});

describe("DirectiveRegistry", () => {
	it("defines every supported data-flux value in one place", () => {
		expect(DirectiveRegistry.DEFINITIONS).toEqual({
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
			"autocomplete": expect.objectContaining({handler: "autocomplete"}),
			"autocomplete-results": expect.objectContaining({handler: "autocompleteResults"}),
			"link": expect.objectContaining({handler: "autoLink"}),
			"drag-order": expect.objectContaining({handler: "dragOrder"}),
		});
	});

	it("dispatches an element to the configured directive handler", () => {
		document.body.innerHTML = `<button data-flux="autosave"></button>`;

		let autoSave = vi.fn();
		let registry = new DirectiveRegistry({
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
			dragOrder: vi.fn(),
		});

		registry.initElement(document.querySelector("button"));

		expect(autoSave).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
	});

	it("uses the autoContainer handler for empty data-flux values", () => {
		document.body.innerHTML = `<a data-flux href="/next">Next</a>`;

		let autoContainer = vi.fn();
		let registry = new DirectiveRegistry({
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
			dragOrder: vi.fn(),
		});

		registry.initElement(document.querySelector("a"));

		expect(autoContainer).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
	});

	it("uses the autoSubmit handler for empty data-flux values on buttons", () => {
		document.body.innerHTML = `<form><button data-flux>Save</button></form>`;

		let autoSubmit = vi.fn();
		let registry = new DirectiveRegistry({
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
			dragOrder: vi.fn(),
		});

		registry.initElement(document.querySelector("button"));

		expect(autoSubmit).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
	});

	it("throws when a data-flux value is not registered", () => {
		document.body.innerHTML = `<div data-flux="unknown"></div>`;

		let registry = new DirectiveRegistry({
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
			dragOrder: vi.fn(),
		});

		expect(() => registry.initElement(document.querySelector("div"))).toThrow(
			"Unknown flux element type: unknown",
		);
	});
});

describe("FormHandler", () => {
	it("prepares autosave form data using the configured button fallback", () => {
		document.body.innerHTML = `
		<form>
			<input name="title" value="One">
			<button name="save" value="draft" data-flux="autosave"></button>
		</form>
		`;

		let form = document.querySelector("form");
		let button = document.querySelector("button");
		let handler = new FormHandler(
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
		let handler = new FormHandler(
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
			let requestElementState = {path: "/HTML/BODY/FORM[1]/INPUT[1]", value: "One"};
			let handler = new FormHandler(
				navigationController,
				{
					storeFormState: vi.fn(),
					captureElementState: vi.fn().mockReturnValue(requestElementState),
				},
				onDocument,
				onNavigationDocument,
			);

			handler.submitForm(form);
			let responseHandler = navigationController.submitForm.mock.calls[0][2];
			let newDocument = new DOMParser().parseFromString("<html><head><title>Ok</title></head><body></body></html>", "text/html");
			responseHandler(newDocument);

			expect(navigationController.submitForm).toHaveBeenCalledWith(
				form,
				expect.any(FormData),
				expect.any(Function),
				undefined,
			);
			expect(onNavigationDocument).toHaveBeenCalledWith(newDocument, requestElementState);
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
			let requestElementState = {path: "/HTML/BODY/FORM[1]/INPUT[1]", value: "One"};
			let handler = new FormHandler(
				navigationController,
				{
					storeFormState: vi.fn(),
					captureElementState: vi.fn().mockReturnValue(requestElementState),
				},
				onDocument,
				onNavigationDocument,
			);

			handler.submitForm(form);
			let responseHandler = navigationController.submitForm.mock.calls[0][2];
			let newDocument = new DOMParser().parseFromString("<html><head><title>Ok</title></head><body></body></html>", "text/html");
			responseHandler(newDocument);

			expect(navigationController.submitForm).toHaveBeenCalledWith(
				form,
				expect.any(FormData),
				expect.any(Function),
				undefined,
			);
			expect(onDocument).toHaveBeenCalledWith(newDocument, requestElementState);
		});

	it("stores the newly focused field during autosave submit without blurring it", () => {
		document.body.innerHTML = `
		<form method="post">
			<input name="first" value="One">
			<input name="second" value="Two">
		</form>
		`;

		let form = document.querySelector("form");
		let secondInput = document.querySelectorAll("input")[1];
			let focusStateManager = {
				storeFormState: vi.fn(),
				captureElementState: vi.fn().mockReturnValue(null),
			};
		let handler = new FormHandler(
			{submitForm: vi.fn()},
			focusStateManager,
			vi.fn(),
		);
		secondInput.focus();

		handler.formSubmitAutoSave({
			preventDefault: vi.fn(),
			target: form,
			submitter: null,
		});

		expect(document.activeElement).toBe(secondInput);
		expect(focusStateManager.storeFormState).toHaveBeenCalledWith(form, secondInput);
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
			let handler = new FormHandler(
				navigationController,
				{
					storeFormState: vi.fn(),
					captureElementState: vi.fn().mockReturnValue(null),
				},
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
			let handler = new FormHandler(
				navigationController,
				{
					storeFormState: vi.fn(),
					captureElementState: vi.fn().mockReturnValue(null),
				},
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

describe("AutocompleteHandler", () => {
	it("fetches and mounts marked results after input changes", async () => {
		vi.useFakeTimers();
		document.body.innerHTML = `
		<form action="/search" method="get">
			<input name="query" value="">
		</form>
		`;

		let parser = new DOMParser();
		let navigationController = {
			fetchForm: vi.fn((form, formData, onDocument) => {
				let newDocument = parser.parseFromString(`
					<html>
						<body>
							<section data-flux="autocomplete-results">
								<p>London result</p>
							</section>
						</body>
					</html>
				`, "text/html");
				onDocument(newDocument);
				return Promise.resolve(newDocument);
			}),
		};
		let handler = new AutocompleteHandler(navigationController);
		let form = document.querySelector("form");
		let input = document.querySelector("input");

		handler.initAutocomplete(form);
		input.value = "London";
		input.dispatchEvent(new Event("input", {bubbles: true}));
		await vi.advanceTimersByTimeAsync(200);

		expect(navigationController.fetchForm).toHaveBeenCalledTimes(1);
		expect(navigationController.fetchForm.mock.calls[0][1].get("query")).toBe("London");
		expect(form.nextElementSibling.matches('[data-flux="autocomplete-results"]')).toBe(true);
		expect(form.nextElementSibling.textContent).toContain("London result");

		vi.useRealTimers();
	});

	it("removes mounted results when the form value is below the minimum length", async () => {
		document.body.innerHTML = `
		<form action="/search" method="get">
			<input name="query" value="London">
		</form>
		`;

		let parser = new DOMParser();
		let navigationController = {
			fetchForm: vi.fn((form, formData, onDocument) => {
				let newDocument = parser.parseFromString(`
					<html>
						<body>
							<section data-flux="autocomplete-results">
								<p>London result</p>
							</section>
						</body>
					</html>
				`, "text/html");
				onDocument(newDocument);
				return Promise.resolve(newDocument);
			}),
		};
		let handler = new AutocompleteHandler(navigationController);
		let form = document.querySelector("form");
		let input = document.querySelector("input");

		handler.initAutocomplete(form);
		await handler.updateResults(form);
		expect(form.nextElementSibling).not.toBeNull();

		input.value = "Lo";
		await handler.updateResults(form);

		expect(form.nextElementSibling).toBeNull();
		expect(navigationController.fetchForm).toHaveBeenCalledTimes(1);
	});

	it("hides submit controls when autocomplete is initialised", () => {
		document.body.innerHTML = `
		<form action="/search" method="get">
			<input name="query" value="London">
			<button>Search</button>
			<button type="button">Help</button>
			<input type="submit" value="Go">
		</form>
		`;

		let handler = new AutocompleteHandler({fetchForm: vi.fn()});
		let form = document.querySelector("form");
		let buttons = document.querySelectorAll("button");
		let submitInput = document.querySelector("input[type='submit']");

		handler.initAutocomplete(form);

		expect(buttons[0].hidden).toBe(true);
		expect(buttons[0].dataset["fluxAutocompleteButton"]).toBe("");
		expect(buttons[1].hidden).toBe(false);
		expect(submitInput.hidden).toBe(true);
	});

	it("ignores stale autocomplete responses", async () => {
		document.body.innerHTML = `
		<form action="/search" method="get">
			<input name="query" value="Lon">
		</form>
		`;

		let parser = new DOMParser();
		let callbacks = [];
		let navigationController = {
			fetchForm: vi.fn((form, formData, onDocument) => {
				callbacks.push({
					query: formData.get("query"),
					onDocument,
				});
				return Promise.resolve(null);
			}),
		};
		let handler = new AutocompleteHandler(navigationController);
		let form = document.querySelector("form");
		let input = document.querySelector("input");

		handler.initAutocomplete(form);
		handler.updateResults(form);
		input.value = "London";
		handler.updateResults(form);

		callbacks[1].onDocument(parser.parseFromString(`
			<html><body><section data-flux="autocomplete-results">London</section></body></html>
		`, "text/html"));
		callbacks[0].onDocument(parser.parseFromString(`
			<html><body><section data-flux="autocomplete-results">Lon stale</section></body></html>
		`, "text/html"));

		expect(callbacks.map(callback => callback.query)).toEqual(["Lon", "London"]);
		expect(form.nextElementSibling.textContent).toBe("London");
	});

	it("moves through form controls and mounted result links with arrow keys", async () => {
		document.body.innerHTML = `
		<form action="/search" method="get">
			<input name="query" value="London">
			<button>Search</button>
		</form>
		`;

		let parser = new DOMParser();
		let navigationController = {
			fetchForm: vi.fn((form, formData, onDocument) => {
				let newDocument = parser.parseFromString(`
					<html>
						<body>
							<section data-flux="autocomplete-results">
								<a href="#one">One</a>
								<a href="#two">Two</a>
							</section>
						</body>
					</html>
				`, "text/html");
				onDocument(newDocument);
				return Promise.resolve(newDocument);
			}),
		};
		let handler = new AutocompleteHandler(navigationController);
		let form = document.querySelector("form");
		let input = document.querySelector("input");
		let button = document.querySelector("button");

		handler.initAutocomplete(form);
		await handler.updateResults(form);
		let links = form.nextElementSibling.querySelectorAll("a");
		input.focus();

		document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {
			key: "ArrowDown",
			bubbles: true,
			cancelable: true,
		}));
		expect(document.activeElement).toBe(links[0]);
		expect(button.hidden).toBe(true);

		document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {
			key: "ArrowDown",
			bubbles: true,
			cancelable: true,
		}));
		expect(document.activeElement).toBe(links[1]);

		document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {
			key: "ArrowUp",
			bubbles: true,
			cancelable: true,
		}));
		expect(document.activeElement).toBe(links[0]);

		document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {
			key: "ArrowUp",
			bubbles: true,
			cancelable: true,
		}));
		expect(document.activeElement).toBe(input);
	});

	it("requires autocomplete to be applied to a form", () => {
		let handler = new AutocompleteHandler({fetchForm: vi.fn()});
		let element = document.createElement("div");

		expect(() => handler.initAutocomplete(element)).toThrow(
			'data-flux type "autocomplete" must be applied to a form element.',
		);
	});
});

describe("DragOrderHandler", () => {
		it("hides the order controls and adds a draggable handle to the form", () => {
		document.body.innerHTML = `
		<ul>
			<li>
				<form method="post" data-flux="drag-order">
					<input type="hidden" name="id" value="1">
					<label>
						<span>Move to order</span>
						<input name="order">
						<button name="do" value="move">Move</button>
					</label>
				</form>
				<span>one</span>
			</li>
		</ul>
		`;

		let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
		let form = document.querySelector("form");

		handler.initDragOrder(form);

			let handle = form.querySelector(".drag-handle");
			expect(handle).toBeInstanceOf(HTMLElement);
			expect(handle.draggable).toBe(false);
			expect(handle.dataset["fluxTitle"]).toBe("Drag");
			expect(form.querySelector("input[name='order']").hidden).toBe(true);
			expect(form.querySelector("button[name='do']").hidden).toBe(true);
			expect(form.querySelector("label").hidden).toBe(true);
		});

		it("uses the drag element handle title when provided", () => {
			document.body.innerHTML = `
			<ul>
				<li data-flux="drag-order" data-flux-drag-handle="Move card">
					<form method="post">
						<input name="order">
						<button name="do" value="move">Move</button>
					</form>
				</li>
			</ul>
			`;

			let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
			let item = document.querySelector("li");

			handler.initDragOrder(item);

			expect(item.querySelector(".drag-handle").dataset["fluxTitle"]).toBe("Move card");
		});

		it("uses the parent handle title when the drag element does not provide one", () => {
			document.body.innerHTML = `
			<ul data-flux-drag-handle="Move task">
				<li data-flux="drag-order">
					<form method="post">
						<input name="order">
						<button name="do" value="move">Move</button>
					</form>
				</li>
			</ul>
			`;

			let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
			let item = document.querySelector("li");

			handler.initDragOrder(item);

			expect(item.querySelector(".drag-handle").dataset["fluxTitle"]).toBe("Move task");
		});

		it("allows drag-order on a parent element and drags that element", () => {
			document.body.innerHTML = `
			<ul>
				<li data-id="1" data-flux="drag-order">
					<article>
						<header>one</header>
						<div>
							<form method="post">
								<input name="id" value="1">
								<label><input name="order"><button name="do" value="move">Move</button></label>
							</form>
						</div>
					</article>
				</li>
				<li data-id="2" data-flux="drag-order"><article><form method="post"><input name="id" value="2"><label><input name="order"><button name="do" value="move">Move</button></label></form></article></li>
				<li data-id="3" data-flux="drag-order"><article><form method="post"><input name="id" value="3"><label><input name="order"><button name="do" value="move">Move</button></label></form></article></li>
			</ul>
			`;

			let formHandler = {submitForm: vi.fn()};
			let handler = new DragOrderHandler(formHandler, document);
			let items = [...document.querySelectorAll("[data-id]")];
			items.forEach(item => handler.initDragOrder(item));
			let item = document.querySelector("[data-id='1']");
			let form = item.querySelector("form");

			handler.startDrag(form, null, item);
			document.querySelector("ul").append(item);
			handler.submitDrag();

			expect(form.querySelector(".drag-handle")).toBeInstanceOf(HTMLElement);
			expect(form.querySelector("input[name='order']").value).toBe("2");
			expect(formHandler.submitForm).toHaveBeenCalledWith(
				form,
				form.querySelector("button[name='do']"),
			);
			expect([...document.querySelectorAll("li")].map(li => li.dataset["id"])).toEqual(["2", "3", "1"]);
		});

		it("calculates order among sortable siblings only", () => {
			document.body.innerHTML = `
			<menu>
				<li class="fixed">Secrets</li>
				<li class="fixed">New request</li>
				<li data-id="1" data-flux="drag-order">
					<a href="/one">one</a>
					<form method="post">
						<input name="id" value="1">
						<label><input name="order"><button name="do" value="order">Order</button></label>
					</form>
				</li>
				<li data-id="2" data-flux="drag-order">
					<a href="/two">two</a>
					<form method="post">
						<input name="id" value="2">
						<label><input name="order"><button name="do" value="order">Order</button></label>
					</form>
				</li>
				<li data-id="3" data-flux="drag-order">
					<a href="/three">three</a>
					<form method="post">
						<input name="id" value="3">
						<label><input name="order"><button name="do" value="order">Order</button></label>
					</form>
				</li>
			</menu>
			`;

			let formHandler = {submitForm: vi.fn()};
			let handler = new DragOrderHandler(formHandler, document);
			let items = [...document.querySelectorAll("[data-flux='drag-order']")];
			items.forEach(item => handler.initDragOrder(item));

			let item = document.querySelector("[data-id='3']");
			let form = item.querySelector("form");
			let firstSortable = document.querySelector("[data-id='1']");

			handler.startDrag(form, null, item);
			document.querySelector("menu").insertBefore(item, firstSortable);
			handler.submitDrag();

			expect(form.querySelector("input[name='order']").value).toBe("0");
			expect(formHandler.submitForm).toHaveBeenCalledWith(
				form,
				form.querySelector("button[name='do']"),
			);
			expect([...document.querySelectorAll("menu > li")].map(li => li.dataset["id"] ?? li.textContent.trim()))
				.toEqual(["Secrets", "New request", "3", "1", "2"]);
		});

		it("moves items across parent containers and submits the new parent", () => {
			document.body.innerHTML = `
			<div class="board">
				<ul data-flux-drag-parent="todo">
					<li data-id="1" data-flux="drag-order">
						<form method="post">
							<input name="id" value="1">
							<input name="parent">
							<label><input name="order"><button name="do" value="move">Move</button></label>
						</form>
					</li>
					<li data-id="2" data-flux="drag-order">
						<form method="post">
							<input name="id" value="2">
							<input name="parent">
							<label><input name="order"><button name="do" value="move">Move</button></label>
						</form>
					</li>
				</ul>
				<ul data-flux-drag-parent="doing">
					<li data-id="3" data-flux="drag-order">
						<form method="post">
							<input name="id" value="3">
							<input name="parent">
							<label><input name="order"><button name="do" value="move">Move</button></label>
						</form>
					</li>
				</ul>
			</div>
			`;

			let formHandler = {submitForm: vi.fn()};
			let handler = new DragOrderHandler(formHandler, document);
			let items = [...document.querySelectorAll("[data-flux='drag-order']")];
			items.forEach(item => handler.initDragOrder(item));
			let item = document.querySelector("[data-id='1']");
			let form = item.querySelector("form");
			let doing = document.querySelector("[data-flux-drag-parent='doing']");
			document.querySelector("[data-id='3']").getBoundingClientRect = () => ({
				top: 100,
				height: 100,
			});

			handler.startDrag(form, null, item);
			handler.moveItem(100, doing);
			handler.submitDrag();

			expect(form.querySelector("input[name='order']").value).toBe("0");
			expect(form.querySelector("input[name='parent']").value).toBe("doing");
			expect([...document.querySelectorAll("[data-flux-drag-parent='todo'] > li")].map(li => li.dataset["id"]))
				.toEqual(["2"]);
			expect([...document.querySelectorAll("[data-flux-drag-parent='doing'] > li")].map(li => li.dataset["id"]))
				.toEqual(["1", "3"]);
			expect(formHandler.submitForm).toHaveBeenCalledWith(
				form,
				form.querySelector("button[name='do']"),
			);
		});

		it("inserts before non-sortable controls when dragging into a parent container", () => {
			document.body.innerHTML = `
			<div class="board">
				<ul data-flux-drag-parent="todo">
					<li data-id="1" data-flux="drag-order">
						<form method="post">
							<input name="id" value="1">
							<input name="parent">
							<input name="order">
							<button name="do" value="move">Move</button>
						</form>
					</li>
				</ul>
				<ul data-flux-drag-parent="done">
					<li data-id="2" data-flux="drag-order">
						<form method="post">
							<input name="id" value="2">
							<input name="parent">
							<input name="order">
							<button name="do" value="move">Move</button>
						</form>
					</li>
					<li class="new-card"><form><input name="title"></form></li>
				</ul>
			</div>
			`;

			let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
			let items = [...document.querySelectorAll("[data-flux='drag-order']")];
			items.forEach(item => handler.initDragOrder(item));
			let item = document.querySelector("[data-id='1']");
			let form = item.querySelector("form");
			let done = document.querySelector("[data-flux-drag-parent='done']");
			document.querySelector("[data-id='2']").getBoundingClientRect = () => ({
				top: 0,
				height: 100,
			});

			handler.startDrag(form, null, item);
			handler.moveItem(200, done);

			expect([...done.children].map(child => child.dataset["id"] ?? child.className))
				.toEqual(["2", "1", "new-card"]);
		});

		it("moves into an empty parent container with only non-sortable controls", () => {
			document.body.innerHTML = `
			<div class="board">
				<section class="column">
					<ul data-flux-drag-parent="todo">
						<li data-id="1" data-flux="drag-order">
							<form method="post">
								<input name="id" value="1">
								<input name="parent">
								<input name="order">
								<button name="do" value="move">Move</button>
							</form>
						</li>
					</ul>
				</section>
				<section class="column">
					<ul data-flux-drag-parent="done">
						<li class="new-card"><form><input name="title"></form></li>
					</ul>
				</section>
			</div>
			`;

			let formHandler = {submitForm: vi.fn()};
			let handler = new DragOrderHandler(formHandler, document);
			let item = document.querySelector("[data-id='1']");
			let form = item.querySelector("form");
			handler.initDragOrder(item);
			let done = document.querySelector("[data-flux-drag-parent='done']");
			let column = document.querySelectorAll(".column")[1];
			done.getBoundingClientRect = () => ({
				left: 100,
				right: 300,
				top: 0,
				bottom: 300,
			});
			document.elementFromPoint = () => column;

			handler.startDrag(form, null, item);
			handler.pointerMove({
				pointerId: null,
				clientX: 150,
				clientY: 150,
				preventDefault: vi.fn(),
			});
			handler.submitDrag();

			expect(form.querySelector("input[name='order']").value).toBe("0");
			expect(form.querySelector("input[name='parent']").value).toBe("done");
			expect([...done.children].map(child => child.dataset["id"] ?? child.className))
				.toEqual(["1", "new-card"]);
			expect(formHandler.submitForm).toHaveBeenCalledWith(
				form,
				form.querySelector("button[name='do']"),
			);
		});

		it("keeps parent item drags in their original container when hovering nested drag parents", () => {
			document.body.innerHTML = `
			<div class="board" data-flux-drag-parent="columns">
				<section data-id="todo" data-flux="drag-order">
					<form method="post">
						<input name="order">
						<button name="do" value="move-list">Move</button>
					</form>
					<ul data-flux-drag-parent="todo">
						<li data-id="1" data-flux="drag-order">
							<form method="post">
								<input name="order">
								<button name="do" value="move">Move</button>
							</form>
						</li>
					</ul>
				</section>
				<section data-id="done" data-flux="drag-order">
					<form method="post">
						<input name="order">
						<button name="do" value="move-list">Move</button>
					</form>
					<ul data-flux-drag-parent="done"></ul>
				</section>
			</div>
			`;

			let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
			let columns = [...document.querySelectorAll(".board > [data-flux='drag-order']")];
			columns.forEach(column => handler.initDragOrder(column));
			let column = document.querySelector("[data-id='todo']");
			let form = column.querySelector("form");
			let nestedList = document.querySelector("[data-flux-drag-parent='done']");
			document.elementFromPoint = () => nestedList;

			handler.startDrag(form, null, column);
			handler.pointerMove({
				pointerId: null,
				clientX: 10,
				clientY: 10,
				preventDefault: vi.fn(),
			});

			expect(column.parentElement).toBe(document.querySelector(".board"));
		});

		it("moves a card to the nested list when hovering another draggable column shell", () => {
			document.body.innerHTML = `
			<div class="board" data-flux-drag-parent="columns">
				<section data-id="todo" data-flux="drag-order">
					<form method="post">
						<input name="order">
						<button name="do" value="move-list">Move list</button>
					</form>
					<ul data-flux-drag-parent="todo">
						<li data-id="1" data-flux="drag-order">
							<form method="post">
								<input name="id" value="1">
								<input name="parent">
								<input name="order">
								<button name="do" value="move">Move</button>
							</form>
						</li>
					</ul>
				</section>
				<section data-id="doing" data-flux="drag-order">
					<form method="post">
						<input name="order">
						<button name="do" value="move-list">Move list</button>
					</form>
					<ul data-flux-drag-parent="doing">
						<li data-id="2" data-flux="drag-order">
							<form method="post">
								<input name="id" value="2">
								<input name="parent">
								<input name="order">
								<button name="do" value="move">Move</button>
							</form>
						</li>
					</ul>
				</section>
			</div>
			`;

			let formHandler = {submitForm: vi.fn()};
			let handler = new DragOrderHandler(formHandler, document);
			document.querySelectorAll("[data-flux='drag-order']").forEach(item => handler.initDragOrder(item));
			let card = document.querySelector("[data-id='1']");
			let form = card.querySelector("form");
			let doingColumn = document.querySelector("[data-id='doing']");
			let doingList = document.querySelector("[data-flux-drag-parent='doing']");
			document.querySelector("[data-id='2']").getBoundingClientRect = () => ({
				top: 200,
				height: 100,
			});
			doingList.getBoundingClientRect = () => ({
				left: 100,
				right: 300,
				top: 100,
				bottom: 300,
			});
			document.elementFromPoint = () => doingColumn;

			handler.startDrag(form, null, card);
			handler.pointerMove({
				pointerId: null,
				clientX: 150,
				clientY: 150,
				preventDefault: vi.fn(),
			});
			handler.submitDrag();

			expect([...document.querySelectorAll("[data-flux-drag-parent='todo'] > li")].map(li => li.dataset["id"]))
				.toEqual([]);
			expect([...document.querySelectorAll("[data-flux-drag-parent='doing'] > li")].map(li => li.dataset["id"]))
				.toEqual(["1", "2"]);
			expect([...document.querySelectorAll(".board > section")].map(section => section.dataset["id"]))
				.toEqual(["todo", "doing"]);
			expect(form.querySelector("input[name='parent']").value).toBe("doing");
			expect(formHandler.submitForm).toHaveBeenCalledWith(
				form,
				form.querySelector("button[name='do']"),
			);
		});

		it("does not let native dragover bubbling move a card into the outer board", () => {
			document.body.innerHTML = `
			<div class="board" data-flux-drag-parent="columns">
				<section data-id="todo" data-flux="drag-order">
					<form method="post">
						<input name="order">
						<button name="do" value="move-list">Move list</button>
					</form>
					<ul data-flux-drag-parent="todo">
						<li data-id="1" data-flux="drag-order">
							<form method="post">
								<input name="id" value="1">
								<input name="parent">
								<input name="order">
								<button name="do" value="move">Move</button>
							</form>
						</li>
					</ul>
				</section>
				<section data-id="doing" data-flux="drag-order">
					<form method="post">
						<input name="order">
						<button name="do" value="move-list">Move list</button>
					</form>
					<ul data-flux-drag-parent="doing">
						<li data-id="2" data-flux="drag-order">
							<form method="post">
								<input name="id" value="2">
								<input name="parent">
								<input name="order">
								<button name="do" value="move">Move</button>
							</form>
						</li>
					</ul>
				</section>
			</div>
			`;

			let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
			document.querySelectorAll("[data-flux='drag-order']").forEach(item => handler.initDragOrder(item));
			let card = document.querySelector("[data-id='1']");
			let form = card.querySelector("form");
			let board = document.querySelector(".board");
			let doingList = document.querySelector("[data-flux-drag-parent='doing']");

			handler.startDrag(form, null, card);
			handler.dragOver({
				clientX: 0,
				clientY: 0,
				currentTarget: doingList,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			});
			handler.dragOver({
				clientX: 0,
				clientY: 0,
				currentTarget: board,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			});

			expect(card.parentElement).toBe(doingList);
			expect([...document.querySelectorAll(".board > section")].map(section => section.dataset["id"]))
				.toEqual(["todo", "doing"]);
		});

		it("reorders horizontal containers using the pointer x position", () => {
			document.body.innerHTML = `
			<div class="board" data-flux-drag-parent="columns">
				<section data-id="todo" data-flux="drag-order">
					<form method="post"><input name="order"><button name="do" value="move-list">Move</button></form>
				</section>
				<section data-id="doing" data-flux="drag-order">
					<form method="post"><input name="order"><button name="do" value="move-list">Move</button></form>
				</section>
				<section data-id="done" data-flux="drag-order">
					<form method="post"><input name="order"><button name="do" value="move-list">Move</button></form>
				</section>
			</div>
			`;

			let formHandler = {submitForm: vi.fn()};
			let handler = new DragOrderHandler(formHandler, document);
			let columns = [...document.querySelectorAll("section")];
			columns.forEach((column, index) => {
				column.getBoundingClientRect = () => ({
					left: index * 200,
					top: 0,
					width: 100,
					height: 400,
				});
				handler.initDragOrder(column);
			});
			let column = document.querySelector("[data-id='done']");
			let form = column.querySelector("form");

			handler.startDrag(form, 0, column, 400);
			handler.moveItem(0, document.querySelector(".board"), -100);
			handler.submitDrag();

			expect(form.querySelector("input[name='order']").value).toBe("0");
			expect([...document.querySelectorAll(".board > section")].map(section => section.dataset["id"]))
				.toEqual(["done", "todo", "doing"]);
			expect(formHandler.submitForm).toHaveBeenCalledWith(
				form,
				form.querySelector("button[name='do']"),
			);
		});

		it("preserves nested cards when reordering outer list containers", () => {
			document.body.innerHTML = `
			<div class="board" data-flux-drag-parent="columns">
				<section data-id="todo" data-flux="drag-order">
					<form method="post"><input name="order"><button name="do" value="move-list">Move</button></form>
					<ul data-flux-drag-parent="todo">
						<li data-id="1" data-flux="drag-order"><form><input name="order"><button name="do" value="move">Move</button></form></li>
						<li data-id="2" data-flux="drag-order"><form><input name="order"><button name="do" value="move">Move</button></form></li>
					</ul>
				</section>
				<section data-id="doing" data-flux="drag-order">
					<form method="post"><input name="order"><button name="do" value="move-list">Move</button></form>
					<ul data-flux-drag-parent="doing">
						<li data-id="3" data-flux="drag-order"><form><input name="order"><button name="do" value="move">Move</button></form></li>
					</ul>
				</section>
			</div>
			`;

			let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
			let columns = [...document.querySelectorAll(".board > section")];
			columns.forEach((column, index) => {
				column.getBoundingClientRect = () => ({
					left: index * 200,
					top: 0,
					width: 100,
					height: 400,
				});
				handler.initDragOrder(column);
			});
			let column = document.querySelector("[data-id='doing']");
			let form = column.querySelector("form");

			handler.startDrag(form, 0, column, 200);
			handler.moveItem(0, document.querySelector(".board"), -100);
			handler.submitDrag();

			expect([...document.querySelectorAll(".board > section")].map(section => section.dataset["id"]))
				.toEqual(["doing", "todo"]);
			expect([...document.querySelectorAll("[data-flux-drag-parent='todo'] > li")].map(li => li.dataset["id"]))
				.toEqual(["1", "2"]);
			expect([...document.querySelectorAll("[data-flux-drag-parent='doing'] > li")].map(li => li.dataset["id"]))
				.toEqual(["3"]);
		});

		it("sets the order input and submits the form when an item is dropped", () => {
		document.body.innerHTML = `
		<ul>
			<li data-id="1">
				<form method="post">
					<input name="id" value="1">
					<label><input name="order"><button name="do" value="move">Move</button></label>
				</form>
			</li>
			<li data-id="2"><form method="post"><input name="id" value="2"><label><input name="order"><button name="do" value="move">Move</button></label></form></li>
			<li data-id="3"><form method="post"><input name="id" value="3"><label><input name="order"><button name="do" value="move">Move</button></label></form></li>
			<li data-id="4"><form method="post"><input name="id" value="4"><label><input name="order"><button name="do" value="move">Move</button></label></form></li>
		</ul>
		`;

			let formHandler = {submitForm: vi.fn()};
			let handler = new DragOrderHandler(formHandler, document);
			let forms = [...document.querySelectorAll("form")];
			forms.forEach(form => handler.initDragOrder(form));
			let form = document.querySelector("form");
			let itemFour = document.querySelector("[data-id='4']");

			handler.startDrag(form);
		document.querySelector("ul").insertBefore(handler.dragState.item, itemFour);
		handler.submitDrag();

			expect(form.querySelector("input[name='order']").value).toBe("2");
		expect(formHandler.submitForm).toHaveBeenCalledWith(
			form,
			form.querySelector("button[name='do']"),
		);
			expect([...document.querySelectorAll("li")].map(li => li.dataset["id"])).toEqual(["2", "3", "1", "4"]);
		});

		it("submits the final order when a native drag ends outside the drop target", () => {
			document.body.innerHTML = `
			<ul>
				<li data-id="1"><form method="post"><input name="id" value="1"><label><input name="order"><button name="do" value="move">Move</button></label></form></li>
				<li data-id="2"><form method="post"><input name="id" value="2"><label><input name="order"><button name="do" value="move">Move</button></label></form></li>
				<li data-id="3"><form method="post"><input name="id" value="3"><label><input name="order"><button name="do" value="move">Move</button></label></form></li>
			</ul>
			`;

			let formHandler = {submitForm: vi.fn()};
			let handler = new DragOrderHandler(formHandler, document);
			let forms = [...document.querySelectorAll("form")];
			forms.forEach(form => handler.initDragOrder(form));
			let form = document.querySelector("[data-id='3'] form");
			let item = document.querySelector("[data-id='3']");
			let firstItem = document.querySelector("[data-id='1']");

			handler.startDrag(form, null, item);
			document.querySelector("ul").insertBefore(item, firstItem);
			handler.endNativeDrag();

			expect(form.querySelector("input[name='order']").value).toBe("0");
			expect(formHandler.submitForm).toHaveBeenCalledWith(
				form,
				form.querySelector("button[name='do']"),
			);
			expect(handler.dragState).toBe(null);
			expect([...document.querySelectorAll("li")].map(li => li.dataset["id"])).toEqual(["3", "1", "2"]);
		});

		it("reorders touch drags using the item centre rather than the finger position", () => {
		document.body.innerHTML = `
		<ul>
			<li data-id="1"><form><input name="order"><button name="do" value="move">Move</button></form></li>
			<li data-id="2"><form><input name="order"><button name="do" value="move">Move</button></form></li>
			<li data-id="3"><form><input name="order"><button name="do" value="move">Move</button></form></li>
		</ul>
		`;

			let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
			let forms = [...document.querySelectorAll("form")];
			forms.forEach(form => handler.initDragOrder(form));
			let form = document.querySelector("form");
			let items = [...document.querySelectorAll("li")];
			items.forEach((item, index) => {
			item.getBoundingClientRect = () => ({
				top: index * 100,
				height: 100,
			});
		});

		handler.startDrag(form, 10);
		handler.moveItem(120);

		expect([...document.querySelectorAll("ul > li")].map(li => li.dataset["id"])).toEqual(["2", "1", "3"]);
	});

	it("tracks touch movement and release on the document during an active drag", () => {
		document.body.innerHTML = `
		<ul>
			<li data-id="1">
				<form data-flux="drag-order">
					<label><input name="order"><button name="do" value="move">Move</button></label>
				</form>
			</li>
			<li data-id="2"><form><input name="order"><button name="do" value="move">Move</button></form></li>
		</ul>
		`;

		let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
		let form = document.querySelector("form");
		handler.initDragOrder(form);

		let addSpy = vi.spyOn(document, "addEventListener");
		let removeSpy = vi.spyOn(document, "removeEventListener");
		let handle = document.querySelector(".drag-handle");
		let createPointerEvent = (type) => Object.assign(
			new Event(type, {bubbles: true, cancelable: true}),
			{
				pointerId: 7,
				pointerType: "touch",
				button: 0,
				clientY: 10,
			},
		);

		handle.dispatchEvent(createPointerEvent("pointerdown"));

		expect(addSpy).toHaveBeenCalledWith("pointermove", handler.pointerMove, true);
		expect(addSpy).toHaveBeenCalledWith("pointerup", handler.pointerUp, true);
		expect(addSpy).toHaveBeenCalledWith("pointercancel", handler.pointerCancel, true);

		document.dispatchEvent(createPointerEvent("pointerup"));

		expect(removeSpy).toHaveBeenCalledWith("pointermove", handler.pointerMove, true);
		expect(document.querySelector("[data-id='1']").classList.contains("flux-drag-order-dragging")).toBe(false);
	});

	it("uses a floating clone while the real item reserves its place", () => {
		document.body.innerHTML = `
		<style>
			.drag-list > li {
				border-top-color: rgb(1, 2, 3);
				border-top-style: solid;
				border-top-width: 4px;
			}
		</style>
		<ul class="drag-list">
			<li data-id="1">
				<form data-flux="drag-order">
					<input name="order">
					<button name="do" value="move">Move</button>
				</form>
				<span>one</span>
			</li>
		</ul>
		`;

		let handler = new DragOrderHandler({submitForm: vi.fn()}, document);
		let item = document.querySelector("li");
		let form = document.querySelector("form");
		item.getBoundingClientRect = () => ({
			left: 20,
			top: 40,
			width: 120,
			height: 50,
		});

		handler.initDragOrder(form);
		handler.startDrag(form, 50, item, 30);
		handler.moveItem(70, document.querySelector("ul"), 50);

		let floatingItem = document.querySelector(".flux-drag-order-floating");
		expect(item.classList.contains("flux-drag-order-dragging")).toBe(true);
		expect(floatingItem).toBeInstanceOf(HTMLElement);
		expect(floatingItem).not.toBe(item);
		expect(floatingItem.style.width).toBe("120px");
		expect(floatingItem.style.height).toBe("50px");
		expect(floatingItem.style.borderTopColor).toBe("rgb(1, 2, 3)");
		expect(floatingItem.style.borderTopStyle).toBe("solid");
		expect(floatingItem.style.borderTopWidth).toBe("4px");
		expect(floatingItem.style.transform).toBe("translate(40px, 60px)");

		handler.endDrag();

		expect(document.querySelector(".flux-drag-order-floating")).toBe(null);
		expect(item.classList.contains("flux-drag-order-dragging")).toBe(false);
	});
});

describe("DragOrder Preview", () => {
	it("copies pseudo-elements into the floating clone", () => {
		document.body.innerHTML = `
		<li>
			<form>
				<span class="drag-handle"></span>
			</form>
		</li>
		`;

		let styleReader = (element, pseudoElement) => {
			let properties = {
				display: "block",
			};

			if(element.matches?.(".drag-handle") && pseudoElement === "::before") {
				properties = {
					content: "\"\"",
					display: "block",
					width: "12px",
					height: "12px",
					"background-color": "rgb(1, 2, 3)",
				};
			}
			else if(element.matches?.(".drag-handle") && pseudoElement === "::after") {
				properties = {
					content: "\"suffix\"",
					display: "inline",
					color: "rgb(4, 5, 6)",
				};
			}
			else if(pseudoElement) {
				properties = {
					content: "normal",
				};
			}

			return createStyleDeclaration(properties);
		};

		let preview = new Preview(document, styleReader);
		let floatingItem = preview.create(document.querySelector("li"), {
			width: 100,
			height: 40,
		});
		let floatingHandle = floatingItem.querySelector(".drag-handle");
		let before = floatingHandle.querySelector("[data-flux-pseudo='before']");
		let after = floatingHandle.querySelector("[data-flux-pseudo='after']");

		expect(before).toBeInstanceOf(HTMLElement);
		expect(before.textContent).toBe("");
		expect(before.style.width).toBe("12px");
		expect(before.style.height).toBe("12px");
		expect(before.style.backgroundColor).toBe("rgb(1, 2, 3)");
		expect(after).toBeInstanceOf(HTMLElement);
		expect(after.textContent).toBe("suffix");
		expect(after.style.color).toBe("rgb(4, 5, 6)");
	});
});

function createStyleDeclaration(properties) {
	let propertyNames = Object.keys(properties);
	return {
		length: propertyNames.length,
		item: index => propertyNames[index],
		getPropertyValue: property => properties[property] ?? "",
		getPropertyPriority: () => "",
	};
}

describe("DomBridge", () => {
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
		let bridge = new DomBridge(
			{has: vi.fn().mockReturnValue(false), get: vi.fn()},
			initFluxElement,
		);

		bridge.prepareElementUpdate(oldElement, newElement);

		expect(initFluxElement).toHaveBeenCalledTimes(1);
		expect(initFluxElement.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
		expect(newElement.querySelector("form").fluxObj).toEqual(oldForm.fluxObj);
	});

	it("recreates scripts in replacement elements so the browser can execute them on insertion", () => {
		document.body.innerHTML = `<main><span>Old</span></main>`;

		let oldElement = document.querySelector("main");
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<body>
					<main>
						<script type="module" nonce="test-nonce">window.fluxScriptRan = true;</script>
					</main>
				</body>
			</html>
		`, "text/html");
		let newElement = newDocument.querySelector("main");
		let inertScript = newElement.querySelector("script");
		let bridge = new DomBridge(
			{has: vi.fn().mockReturnValue(false), get: vi.fn()},
			vi.fn(),
		);

		oldElement.replaceWith(newElement);
		bridge.reviveScripts(newElement);

		let freshScript = newElement.querySelector("script");
		expect(freshScript).not.toBe(inertScript);
		expect(freshScript.getAttribute("type")).toBe("module");
		expect(freshScript.getAttribute("nonce")).toBe("test-nonce");
		expect(freshScript.textContent).toBe("window.fluxScriptRan = true;");
		expect(document.querySelector("script")).toBe(freshScript);
		expect(freshScript.ownerDocument).toBe(document);
	});
});

describe("ResponseHandler", () => {
	it("schedules document updates when the response document is valid", () => {
		let apply = vi.fn();
		let scheduler = vi.fn((callback) => callback());
		let handler = new ResponseHandler(
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
			expect(apply).toHaveBeenCalledWith(newDocument, ["outer", "inner", "attributes"], undefined, null);
	});

	it("routes live refresh documents to the live update types only", () => {
		let apply = vi.fn();
		let scheduler = vi.fn((callback) => callback());
		let handler = new ResponseHandler(
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
		let handler = new ResponseHandler(
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
		let handler = new ResponseHandler(
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

			expect(apply).toHaveBeenCalledWith(
				newDocument,
				["outer", "inner", "attributes", "link-outer", "link-inner"],
				undefined,
				null,
			);
		expect(animationFrame).toHaveBeenCalledTimes(2);
		expect(scrollTo).toHaveBeenCalledWith({
			top: 0,
			left: 0,
			behavior: "auto",
		});
	});

	it("uses the configured scroll behaviour when moving link updates to the top", () => {
		RuntimeConfig.configure({
			scrollToTopBehavior: "smooth",
		});
		let apply = vi.fn();
		let scrollTo = vi.fn();
		let scheduler = vi.fn((callback) => callback());
		let animationFrame = vi.fn((callback) => callback());
		let handler = new ResponseHandler(
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

		expect(scrollTo).toHaveBeenCalledWith({
			top: 0,
			left: 0,
			behavior: "smooth",
		});
	});

	it("scrolls the scoped data-flux-scroll element to the top after link updates", () => {
		document.body.innerHTML = `<section data-flux-scroll="smooth"></section>`;
		let section = document.querySelector("section");
		section.scrollTo = vi.fn();
		let apply = vi.fn();
		let windowScrollTo = vi.fn();
		let scheduler = vi.fn((callback) => callback());
		let animationFrame = vi.fn((callback) => callback());
		let handler = new ResponseHandler(
			{apply},
			{error: vi.fn()},
			false,
			scheduler,
			vi.fn(),
			vi.fn(),
			{scrollTo: windowScrollTo},
			animationFrame,
		);
		let newDocument = new DOMParser().parseFromString(`
			<html>
				<head><title>Ok</title></head>
				<body></body>
			</html>
		`, "text/html");

		handler.handleLinkDocument(newDocument, {
			action: "clickLink",
			fluxScrollBehavior: "smooth",
			fluxScrollPath: "./BODY[1]/./SECTION[1]",
			fluxScrollX: 0,
			fluxScrollY: 0,
		});

		expect(section.scrollTo).toHaveBeenCalledWith({
			top: 0,
			left: 0,
			behavior: "smooth",
		});
		expect(windowScrollTo).not.toHaveBeenCalled();
	});
});

describe("LinkHandler", () => {
	it("does not scroll the current history entry before a flux link request starts", () => {
		let scrollTo = vi.fn();
		let navigationController = {clickLink: vi.fn()};
		let handler = new LinkHandler(
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
		expect(scrollTo).not.toHaveBeenCalled();
		expect(navigationController.clickLink).not.toHaveBeenCalled();
	});

	it("rate limits links when data-flux-rate is present", () => {
		let now = 1000;
		let navigationController = {clickLink: vi.fn()};
		let handler = new LinkHandler(
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
		let handler = new LinkHandler(
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

describe("LiveHandler", () => {
	it("uses one scheduled polling loop for multiple live elements", () => {
		document.body.innerHTML = `
		<main></main>
		<section></section>
		`;

		let updateTargetRegistry = new UpdateTargetRegistry();
		let scheduler = vi.fn().mockReturnValue(123);
		let clearScheduler = vi.fn();
		let handler = new LiveHandler(
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
		let handler = new LiveHandler(
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
		let handler = new LiveHandler(
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
		let handler = new LiveHandler(
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
		let handler = new LiveHandler(
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
