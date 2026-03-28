import { vi, describe, it, expect, beforeEach } from "vitest";
import { Flux } from "../src/Flux.es6";
import {ElementEventMapper} from "../src/ElementEventMapper.es6";
import {DomPath} from "../src/DomPath.es6";
import {UpdateTargetRegistry} from "../src/UpdateTargetRegistry.es6";
import {FocusStateManager} from "../src/FocusStateManager.es6";

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
