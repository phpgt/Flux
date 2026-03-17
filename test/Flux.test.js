import { vi, describe, it, expect, beforeEach } from "vitest";
import { Flux } from "../src/Flux.es6";
import {ElementEventMapper} from "../src/ElementEventMapper.es6";

describe("Flux", () => {
	let element;

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
