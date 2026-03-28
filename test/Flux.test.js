import { vi, describe, it, expect, beforeEach } from "vitest";
import { Flux } from "../src/Flux.es6";
import {ElementEventMapper} from "../src/ElementEventMapper.es6";
import {DomPath} from "../src/DomPath.es6";
import {UpdateTargetRegistry} from "../src/UpdateTargetRegistry.es6";
import {FocusStateManager} from "../src/FocusStateManager.es6";
import {NavigationController} from "../src/NavigationController.es6";
import {DocumentUpdater} from "../src/DocumentUpdater.es6";

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
});
