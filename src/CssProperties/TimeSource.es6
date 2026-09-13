import {calendarValues, timeValues} from "./CalendarValues.es6";

/** Exposes local clock or calendar values through the normal CSS binding lifecycle. */
export class TimeSource {
	constructor(binding) {
		this.binding = binding;
		this.unsubscribe = null;
		this.locale = null;
		this.formatters = null;
		this.nameDate = null;
		this.names = {};
	}

	refresh() {
		let {runtime, name} = this.binding;
		this.unsubscribe ??= runtime.clock.subscribe(this.binding.requestRefresh);
		let date = runtime.clock.now();
		let values = name === "flux-time" ? timeValues(date) : calendarValues(date);
		for(let [suffix, value] of Object.entries(values)) this.binding.set(suffix, value);
		if(name === "flux-date") this.writeNames(date);
	}

	writeNames(date) {
		let {element, runtime} = this.binding;
		let locale = element.closest("[lang]")?.getAttribute("lang") || runtime.window.navigator.language;
		if(!this.formatters || this.locale !== locale) {
			this.locale = locale;
			this.formatters = this.createFormatters(locale);
			this.nameDate = null;
		}
		let day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
		if(this.nameDate !== day) {
			this.nameDate = day;
			for(let [suffix, formatter] of Object.entries(this.formatters)) {
				// Names are CSS strings, ready for `content: var(--flux-date-month-name)`.
				this.names[suffix] = JSON.stringify(formatter.format(date));
			}
		}
		for(let [suffix, value] of Object.entries(this.names)) this.binding.set(suffix, value);
	}

	createFormatters(locale) {
		let options = {
			"month-name": {month: "long"},
			"month-name-short": {month: "short"},
			"day-name": {weekday: "long"},
			"day-name-short": {weekday: "short"},
		};
		let formatters = {};
		for(let [name, fields] of Object.entries(options)) {
			try { formatters[name] = new Intl.DateTimeFormat(locale, {...fields, calendar: "gregory"}); }
			catch { formatters[name] = new Intl.DateTimeFormat(undefined, {...fields, calendar: "gregory"}); }
		}
		return formatters;
	}

	stop() {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	dispose() { this.stop(); }
}
