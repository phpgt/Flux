import {afterEach, describe, it, expect, vi} from "vitest";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {calendarValues, timeValues} from "../../src/CssProperties/CalendarValues.es6";
import {createRuntime, property} from "./Support.js";

let context;
afterEach(() => {
	context?.runtime.dispose();
	context = null;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});
function start(html, date, options) {
	vi.useFakeTimers({toFake: ["Date", "setTimeout", "clearTimeout"]});
	vi.setSystemTime(date);
	context = createRuntime(html, options);
	return context;
}

describe("Time and calendar values", () => {
	it("places analogue hands between whole hours and minutes", () => {
		let values = timeValues(new Date(2026, 8, 7, 15, 30, 45));
		expect(values.hour).toBe(3);
		expect(values.minute).toBe(30);
		expect(values.second).toBe(45);
		expect(values["second-scalar"]).toBe(0.75);
		expect(values["minute-scalar"]).toBe(30.75 / 60);
		expect(values["hour-scalar"] * 360).toBeCloseTo(105.375);
	});
	it.each([0, 12])("uses zero for hour %i on the twelve-hour dial", hour => {
		expect(timeValues(new Date(2026, 0, 1, hour)).hour).toBe(0);
	});
	it("calculates leap-year, month, week, and day progress", () => {
		let values = calendarValues(new Date(2024, 1, 29, 12));
		expect(values).toMatchObject({year: 2024, month: 2, day: 29, weekday: 4});
		expect(values["year-scalar"]).toBe(59.5 / 366);
		expect(values["month-scalar"]).toBe(28.5 / 29);
		expect(values["week-scalar"]).toBe(3.5 / 7);
		expect(values["day-scalar"]).toBe(0.5);
	});
	it("starts weeks on Monday and resets calendar progress at New Year", () => {
		expect(calendarValues(new Date(2026, 8, 6)).weekday).toBe(7);
		expect(calendarValues(new Date(2026, 8, 7))["week-scalar"]).toBe(0);
		expect(calendarValues(new Date(2027, 0, 1))).toMatchObject({year: 2027, month: 1, day: 1, "year-scalar": 0, "month-scalar": 0, "day-scalar": 0});
		expect(calendarValues(new Date(2100, 1, 28, 12))["month-scalar"]).toBe(27.5 / 28);
	});
	it.each(["Europe/London", "America/New_York"])("counts calendar days across daylight-saving changes in %s", timezone => {
		let source = readFileSync("src/CssProperties/CalendarValues.es6", "utf8");
		let script = `${source}\nconsole.log(JSON.stringify([calendarValues(new Date(2024, 2, 31, 12)), calendarValues(new Date(2024, 10, 3, 12))]));`;
		let results = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], {env: {...process.env, TZ: timezone}, encoding: "utf8"}));
		expect(results[0]["day-scalar"]).toBe(0.5);
		expect(results[0]["month-scalar"]).toBe(30.5 / 31);
		expect(results[1]["day-scalar"]).toBe(0.5);
		expect(results[1]["month-scalar"]).toBe(2.5 / 30);
	});
});

describe("Time and date CSS sources", () => {
	it("shares a second-aligned timer and crosses midnight using the actual clock", async () => {
		let {runtime, flush} = start('<div lang="en-GB" data-flux="flux-time flux-date"></div><aside data-flux="flux-time"></aside>', new Date(2026, 11, 31, 23, 59, 59, 750));
		let schedule = vi.spyOn(window, "setTimeout");
		await flush();
		expect(runtime.clock.subscribers.size).toBe(3);
		expect(schedule).toHaveBeenCalledTimes(1);
		expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), 250);
		expect(property("div", "time-second")).toBe("59");
		expect(property("div", "date-year")).toBe("2026");
		vi.advanceTimersByTime(250); await flush();
		expect(property("div", "time-hour")).toBe("0");
		expect(property("aside", "time-second")).toBe("0");
		expect(property("div", "date-year")).toBe("2027");
		expect(property("div", "date-month")).toBe("1");
		expect(property("div", "day-scalar")).toBe("0");
		expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), 1000);
		vi.setSystemTime(new Date(2027, 0, 1, 9, 42, 10));
		vi.advanceTimersByTime(1000); await flush();
		expect(property("div", "time-minute")).toBe("42");
	});
	it("emits quoted, localised names and follows changes to the inherited language", async () => {
		let {flush} = start('<section lang="en-GB"><div data-flux="flux-date"></div></section>', new Date(2026, 8, 7, 12));
		await flush();
		expect(property("div", "date-month-name")).toBe('"September"');
		expect(property("div", "date-month-name-short")).toBe('"Sept"');
		expect(property("div", "date-day-name")).toBe('"Monday"');
		expect(property("div", "date-day-name-short")).toBe('"Mon"');
		expect(property("div", "date-weekday")).toBe("1");
		expect(property("div", "day-scalar")).toBe("0.5");
		document.querySelector("section").lang = "fr-FR"; await flush();
		expect(property("div", "date-month-name")).toBe('"septembre"');
		expect(property("div", "date-day-name")).toBe('"lundi"');
		document.querySelector("section").lang = "not_a_locale"; await flush();
		expect(context.logger.error).not.toHaveBeenCalled();
	});
	it("pauses off-screen, follows remote destinations, and cancels the last timer on removal", async () => {
		let {runtime, intersections, flush} = start('<div data-flux="(flux-time,flux-date@footer)"></div><footer></footer>', new Date(2026, 8, 7, 12), {observers: true});
		await flush(); expect(runtime.clock.timer).toBeNull();
		let footer = document.querySelector("footer");
		intersections[0].emit(footer, {isIntersecting: true, intersectionRatio: 1}); await flush();
		expect(property("footer", "time-hour")).toBe("0");
		expect(property("footer", "day-scalar")).toBe("0.5");
		expect(runtime.clock.subscribers.size).toBe(2);
		intersections[0].emit(footer, {isIntersecting: false, intersectionRatio: 0}); await flush();
		expect(runtime.clock.timer).toBeNull();
		vi.setSystemTime(new Date(2026, 8, 7, 13, 20));
		intersections[0].emit(footer, {isIntersecting: true, intersectionRatio: 1}); await flush();
		expect(property("footer", "time-minute")).toBe("20");
		document.querySelector("div").remove(); await flush();
		expect(runtime.clock.subscribers.size).toBe(0);
		expect(runtime.clock.timer).toBeNull();
		expect(property("footer", "day-scalar")).toBe("");
	});
	it("cancels timing immediately when the tab is hidden and resumes with current values", async () => {
		let {runtime, flush} = start('<div data-flux="flux-time"></div>', new Date(2026, 8, 7, 12));
		await flush();
		vi.spyOn(document, "hidden", "get").mockReturnValue(true);
		document.dispatchEvent(new Event("visibilitychange"));
		expect(runtime.clock.timer).toBeNull();
		vi.setSystemTime(new Date(2026, 8, 7, 15, 10));
		vi.spyOn(document, "hidden", "get").mockReturnValue(false);
		document.dispatchEvent(new Event("visibilitychange")); await flush();
		expect(property("div", "time-hour")).toBe("3");
		expect(property("div", "time-minute")).toBe("10");
		expect(runtime.clock.subscribers.size).toBe(1);
	});
	it("rebinds a replaced clock without keeping its old subscription", async () => {
		let {runtime, flush} = start('<div id="clock" data-flux="flux-time flux-date"></div>', new Date(2026, 8, 7, 12));
		await flush();
		document.querySelector("div").outerHTML = '<div id="clock" data-flux="flux-time flux-date"></div>';
		await flush();
		expect(runtime.clock.subscribers.size).toBe(2);
		expect(property("#clock", "date-day")).toBe("7");
	});
});
