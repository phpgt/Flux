import {scalar} from "./ControlSource.es6";

/** Measures the bound element, leaving inheritance to CSS. */
export class GeometrySource {
	constructor(binding) { this.binding = binding; }

	refresh() {
		let {name, element, runtime} = this.binding;
		if(name === "flux-visible" || name === "flux-first-visible") {
			let visible = this.binding.visible;
			if(visible) this.binding.state.entered = true;
			this.binding.set("", Number(name === "flux-visible" ? visible : Boolean(this.binding.state.entered)));
			return;
		}
		if(name === "flux-truncated") {
			let style = runtime.window.getComputedStyle(element);
			let x = style.overflowX !== "visible" && element.scrollWidth > element.clientWidth;
			let y = style.overflowY !== "visible" && element.scrollHeight > element.clientHeight;
			this.binding.set("", Number(x || y));
			this.binding.set("x", Number(x));
			this.binding.set("y", Number(y));
			return;
		}
		if(name === "flux-pointer-global") {
			this.setPointerAxis("x", runtime.pointer.x, runtime.window.innerWidth);
			this.setPointerAxis("y", runtime.pointer.y, runtime.window.innerHeight);
			return;
		}
		let rectangle = element.getBoundingClientRect();
		if(name === "flux-pointer") {
			this.setPointerAxis("x", runtime.pointer.x - rectangle.left, rectangle.width);
			this.setPointerAxis("y", runtime.pointer.y - rectangle.top, rectangle.height);
		}
		else {
			let box = this.binding.resizeEntry?.borderBoxSize?.[0];
			let vertical = box && runtime.window.getComputedStyle(element).writingMode.startsWith("vertical");
			this.binding.set("x", box ? (vertical ? box.blockSize : box.inlineSize) : rectangle.width);
			this.binding.set("y", box ? (vertical ? box.inlineSize : box.blockSize) : rectangle.height);
		}
	}

	setPointerAxis(axis, position, size) {
		let pixels = Math.max(0, Math.min(position, size));
		this.binding.set(`${axis}-raw-px`, position);
		this.binding.set(axis, size > 0 ? scalar(pixels / size) : 0);
		this.binding.set(`${axis}-px`, pixels);
	}

	dispose() {}
}
