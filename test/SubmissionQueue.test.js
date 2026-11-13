import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {Flux} from "../src/Flux.es6";
import {FocusStateManager} from "../src/FocusStateManager.es6";

let flux;
let requests;
const originalListener = Element.prototype.addEventListener;

function html(token = "old", title = "One", attributes = 'id="account"') {
	return `<html><head><title>Queue</title></head><body>
	<form ${attributes} method="post" data-flux="auto submit-queue">
		<input name="id" value="record" readonly>
		<input name="csrf-token" type="hidden" value="${token}">
		<input name="title" value="${title}" required>
		<input name="email" type="email" value="team@example.test">
		<input name="locked" value="fixed" readonly>
		<select name="colour"><option selected>blue</option></select>
		<input name="choice" type="checkbox" value="yes" checked>
		<input name="disabled" disabled>
		<button name="do" value="save">Save</button>
		<button name="do" value="delete">Delete</button>
		<button name="do" value="preview" data-flux="autosave" formnovalidate>Preview</button>
	</form></body></html>`;
}

function start(markup = html()) {
	document.documentElement.innerHTML = markup;
	flux = new Flux();
	return document.querySelector("form");
}

function complete(index, markup = html()) {
	requests[index].resolve({ok: true, status: 200, url: location.href, text: async () => markup});
}

beforeEach(() => {
	requests = [];
	vi.stubGlobal("fetch", vi.fn((url, options) => new Promise((resolve, reject) => {
		requests.push({url, options, resolve, reject});
	})));
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	flux?.liveHandler.dispose();
	document.removeEventListener("flux:after-render", flux?.initRenderedCssProperties);
	Element.prototype.addEventListener = originalListener;
	document.body.innerHTML = "";
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("Queued form submissions", () => {
	it("replays one explicit action after a preview renders with fresh values and tokens", async () => {
		const form = start();
		form.elements.namedItem("title").dispatchEvent(new Event("change", {bubbles: true}));
		expect(requests).toHaveLength(1);
		expect(form.getAttribute("aria-busy")).toBe("true");
		expect(form.elements.namedItem("title").readOnly).toBe(true);
		expect(form.elements.namedItem("colour").disabled).toBe(true);
		expect(requests[0].options.body.get("colour")).toBe("blue");
		expect(requests[0].options.body.get("choice")).toBe("yes");
		form.requestSubmit(form.querySelector('[value="save"]'));
		form.requestSubmit(form.querySelector('[value="save"]'));
		form.requestSubmit(form.querySelector('[value="delete"]'));
		expect(requests).toHaveLength(1);
		complete(0, html("fresh", "Server value"));
		await vi.waitFor(() => expect(requests).toHaveLength(2));
		expect(requests[1].options.body.get("do")).toBe("save");
		expect(requests[1].options.body.get("csrf-token")).toBe("fresh");
		expect(requests[1].options.body.get("title")).toBe("Server value");
		expect(requests[1].options.body.get("colour")).toBe("blue");
		expect(requests[1].options.body.get("id")).toBe("record");
		complete(1);
		await vi.waitFor(() => expect(flux.formHandler.submissionQueue.pending.size).toBe(0));
		expect(requests).toHaveLength(2);
	});

	it("ignores duplicate writes and unlocks unchanged forms after a failed request", async () => {
		const form = start();
		const button = form.querySelector('[value="save"]');
		form.requestSubmit(button);
		form.requestSubmit(button);
		form.requestSubmit(form.querySelector('[value="delete"]'));
		vi.spyOn(console, "error").mockImplementation(() => {});
		requests[0].reject(new Error("Offline"));
		await vi.waitFor(() => expect(form.hasAttribute("aria-busy")).toBe(false));
		expect(form.elements.namedItem("title").readOnly).toBe(false);
		expect(form.elements.namedItem("locked").readOnly).toBe(true);
		expect(form.elements.namedItem("disabled").disabled).toBe(true);
		expect(form.elements.namedItem("colour").disabled).toBe(false);
		expect(requests).toHaveLength(1);
		form.requestSubmit(button);
		expect(requests).toHaveLength(2);
		complete(1);
		await vi.waitFor(() => expect(flux.formHandler.submissionQueue.pending.size).toBe(0));
	});

	it.each(["invalid", "removed button", "disabled button", "removed form"])("does not replay when the server returns an %s", async state => {
		const form = start();
		form.elements.namedItem("title").dispatchEvent(new Event("change", {bubbles: true}));
		form.requestSubmit(form.querySelector('[value="save"]'));
		let markup = html("fresh", state === "invalid" ? "" : "One");
		if(state === "removed button") markup = markup.replace('<button name="do" value="save">Save</button>', "");
		if(state === "disabled button") markup = markup.replace('value="save">', 'value="save" disabled>');
		if(state === "removed form") markup = '<html><head><title>Gone</title></head><body>Removed</body></html>';
		complete(0, markup);
		await vi.waitFor(() => expect(flux.formHandler.submissionQueue.pending.size).toBe(0));
		expect(requests).toHaveLength(1);
	});

	it("matches a replaced form by its DOM path when it has no id", async () => {
		const form = start(html("old", "One", ""));
		form.elements.namedItem("title").dispatchEvent(new Event("change", {bubbles: true}));
		form.requestSubmit(form.querySelector('[value="save"]'));
		complete(0, html("fresh", "One", ""));
		await vi.waitFor(() => expect(requests).toHaveLength(2));
		expect(requests[1].options.body.get("csrf-token")).toBe("fresh");
		complete(1, html("fresh", "One", ""));
		await vi.waitFor(() => expect(flux.formHandler.submissionQueue.pending.size).toBe(0));
	});


	it("does not queue another action while an explicit write runs", async () => {
		const form = start();
		form.requestSubmit(form.querySelector('[value="save"]'));
		form.requestSubmit(form.querySelector('[value="delete"]'));
		complete(0);
		await vi.waitFor(() => expect(flux.formHandler.submissionQueue.pending.size).toBe(0));
		expect(requests).toHaveLength(1);
	});

	it("renders HTTP errors but cancels the queued action", async () => {
		const form = start();
		form.elements.namedItem("title").dispatchEvent(new Event("change", {bubbles: true}));
		form.requestSubmit(form.querySelector('[value="save"]'));
		requests[0].resolve({ok: false, status: 422, url: location.href, text: async () => html("new", "Rejected")});
		await vi.waitFor(() => expect(flux.formHandler.submissionQueue.pending.size).toBe(0));
		expect(document.querySelector('input[name="title"]').value).toBe("Rejected");
		expect(requests).toHaveLength(1);
	});

	it("lets separate forms submit independently", async () => {
		const markup = html().replace('</body>', html().match(/<form[\s\S]*<\/form>/)[0].replace('id="account"', 'id="other"') + '</body>');
		start(markup);
		document.getElementById("account").requestSubmit(document.querySelector('#account [value="save"]'));
		document.getElementById("other").requestSubmit(document.querySelector('#other [value="save"]'));
		expect(requests).toHaveLength(2);
		complete(0, markup); complete(1, markup);
		await vi.waitFor(() => expect(flux.formHandler.submissionQueue.pending.size).toBe(0));
	});

	it("leaves ordinary forms unchanged unless they opt in", async () => {
		const form = start(html().replace('auto submit-queue', 'auto'));
		form.requestSubmit(form.querySelector('[value="save"]'));
		expect(form.elements.namedItem("title").readOnly).toBe(false);
		form.requestSubmit(form.querySelector('[value="save"]'));
		expect(requests).toHaveLength(2);
		complete(0); complete(1);
		await vi.waitFor(() => expect(document.querySelector('input[name="title"]')).not.toBeNull());
	});

	it("does not capture text selections on email fields", () => {
		const form = start();
		form.elements.namedItem("email").focus();
		const state = new FocusStateManager().captureElementState(form);
		expect(state.selection).toBeNull();
		expect(() => new FocusStateManager().restoreElementState(state)).not.toThrow();
	});
});
