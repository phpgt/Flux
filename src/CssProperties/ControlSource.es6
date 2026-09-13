const SELECTORS = {
	"flux-range": 'input[type="range"]',
	"flux-select": "select",
	"flux-color": 'input[type="color"]',
	"flux-field": "input, textarea",
	"flux-form": "form",
};

export function findControl(element, name) {
	let selector = SELECTORS[name];
	return element.matches(selector) ? element : element.querySelector(selector);
}

export function scalar(value) { return Math.max(0, Math.min(1, value)); }

/** Reads native control values and validation state; interaction history belongs to the binding. */
export class ControlSource {
	constructor(binding) {
		this.binding = binding;
		this.resolveControl();
	}

	resolveControl() {
		let {element, name, state, runtime} = this.binding;
		this.control = findControl(element, name);
		if(this.control && name === "flux-field" && state.initial === undefined) {
			state.initial = this.valueOf(this.control);
			state.touched = this.control === runtime.document.activeElement;
		}
	}

	refresh() {
		this.resolveControl();
		let {name} = this.binding;
		let control = this.control;
		if(!control) { this.binding.clear(); return; }
		switch(name) {
		case "flux-range": this.range(control); break;
		case "flux-select": this.select(control); break;
		case "flux-color": this.binding.set("", control.value); break;
		case "flux-field": this.field(control); break;
		case "flux-form": this.form(control); break;
		}
	}

	range(control) {
		let minimum = control.min === "" ? 0 : Number(control.min);
		let maximum = control.max === "" ? 100 : Number(control.max);
		this.binding.set("", maximum > minimum ? scalar((control.valueAsNumber - minimum) / (maximum - minimum)) : 0);
	}

	select(control) {
		let value = control.value.trim();
		this.binding.set("", value && Number.isFinite(Number(value)) ? Number(value) : null);
	}

	field(control) {
		let {state} = this.binding;
		let length = control.value.length;
		let maximum = control.maxLength;
		let valid = control.validity.valid;
		this.binding.set("length", length);
		this.binding.set("empty", Number(length === 0));
		this.binding.set("valid", Number(valid));
		this.binding.set("invalid", Number(!valid));
		this.binding.set("remaining", maximum >= 0 ? Math.max(0, maximum - length) : null);
		this.binding.set("filled-scalar", maximum >= 0 ? (maximum ? scalar(length / maximum) : 0) : null);
		this.binding.set("too-short", Number(control.validity.tooShort));
		this.binding.set("pattern-error", Number(control.validity.patternMismatch));
		this.pair("dirty", "clean", state.dirty);
		this.pair("touched", "untouched", state.touched);
		this.pair("changed", "unchanged", this.valueOf(control) !== state.initial);
	}

	pair(positive, negative, value) {
		this.binding.set(positive, Number(Boolean(value)));
		this.binding.set(negative, Number(!value));
	}

	form(control) {
		let fields = [...control.elements].filter(field => field.matches("input, select, textarea") && field.willValidate);
		let valid = fields.filter(field => field.validity.valid).length;
		this.binding.set("field-count", fields.length);
		this.binding.set("valid-count", valid);
		this.binding.set("invalid-count", fields.length - valid);
		this.binding.set("all-valid", Number(valid === fields.length));
		this.binding.set("valid-scalar", fields.length ? valid / fields.length : 1);
	}

	valueOf(control) {
		if(control.matches('input[type="checkbox"], input[type="radio"]')) return control.checked;
		return control.value;
	}

	onEvent(event) {
		let control = this.control;
		if(!control) return;
		if(event.type === "reset" && (control.form === event.target || control === event.target)) {
			// The reset default action runs after dispatch. Read the resulting values in the next frame.
			if(!event.defaultPrevented) {
				this.binding.state.dirty = false;
				this.binding.state.touched = false;
			}
			this.binding.requestRefresh();
			return;
		}
		let radioPeer = control.matches('input[type="radio"]')
			&& event.target.matches?.('input[type="radio"]')
			&& control.name !== "" && control.name === event.target.name
			&& control.form === event.target.form;
		if(event.target !== control && event.target.form !== control && !radioPeer) return;
		if(this.binding.name === "flux-field") {
			if((event.type === "input" || event.type === "change")
				&& this.valueOf(control) !== this.binding.state.initial) this.binding.state.dirty = true;
			if(event.type === "focusin" && event.target === control) this.binding.state.touched = true;
		}
		this.binding.requestRefresh();
	}

	dispose() {}
}
