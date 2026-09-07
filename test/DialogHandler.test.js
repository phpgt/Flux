import {afterEach, describe, expect, it, vi} from "vitest";
import {DialogHandler} from "../src/DialogHandler.es6";

afterEach(() => { document.body.innerHTML = ""; });

function dialog() {
	let element = document.createElement("dialog");
	element.setAttribute("open", "");
	element.matches = vi.fn(() => false);
	element.showModal = vi.fn(() => { element.open = true; });
	return element;
}

describe("Server-rendered modal dialogs", () => {
	it("waits for insertion before promoting the open fallback to a modal", async () => {
		let handler = new DialogHandler();
		let element = dialog();
		element.showModal.mockImplementation(() => {
			expect(element.isConnected).toBe(true);
			expect(element.open).toBe(false);
			element.open = true;
		});
		handler.initModal(element);
		expect(element.showModal).not.toHaveBeenCalled();
		document.body.append(element);
		await Promise.resolve();
		expect(element.showModal).toHaveBeenCalledOnce();
	});
	it("does not reopen a dismissed dialog when initialised again", async () => {
		let handler = new DialogHandler(); let element = dialog();
		document.body.append(element);
		handler.initModal(element); handler.initModal(element);
		await Promise.resolve();
		element.open = false;
		handler.initModal(element); await Promise.resolve();
		expect(element.showModal).toHaveBeenCalledOnce();
		expect(element.open).toBe(false);
	});
	it("ignores nodes discarded before insertion and opens a fresh replacement", async () => {
		let handler = new DialogHandler(); let discarded = dialog(); let replacement = dialog();
		handler.initModal(discarded); handler.initModal(replacement);
		document.body.append(replacement); await Promise.resolve();
		expect(discarded.showModal).not.toHaveBeenCalled();
		expect(replacement.showModal).toHaveBeenCalledOnce();
	});
	it("returns focus to the initiating control after the dialog closes", async () => {
		let trigger = document.createElement("button");
		document.body.append(trigger); trigger.focus();
		let element = dialog(); new DialogHandler().initModal(element);
		document.body.append(element); await Promise.resolve();
		trigger.blur(); element.open = false;
		element.dispatchEvent(new Event("close"));
		expect(document.activeElement).toBe(trigger);
	});
	it("retains the open fallback if showModal is unavailable", async () => {
		let element = document.createElement("dialog"); element.open = true;
		document.body.append(element); new DialogHandler().initModal(element);
		await Promise.resolve(); expect(element.open).toBe(true);
	});
	it("rejects non-dialog elements", () => {
		expect(() => new DialogHandler().initModal(document.createElement("div"))).toThrow("requires a dialog");
	});
});
