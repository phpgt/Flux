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
			this.binding.set("x", scalar(runtime.pointer.x / Math.max(1, runtime.window.innerWidth)));
			this.binding.set("y", scalar(runtime.pointer.y / Math.max(1, runtime.window.innerHeight)));
			return;
		}
		let rectangle = element.getBoundingClientRect();
		if(name === "flux-pointer") {
			this.binding.set("x", rectangle.width ? scalar((runtime.pointer.x - rectangle.left) / rectangle.width) : 0);
			this.binding.set("y", rectangle.height ? scalar((runtime.pointer.y - rectangle.top) / rectangle.height) : 0);
		}
		else {
			let box = this.binding.resizeEntry?.borderBoxSize?.[0];
			let vertical = box && runtime.window.getComputedStyle(element).writingMode.startsWith("vertical");
			this.binding.set("x", box ? (vertical ? box.blockSize : box.inlineSize) : rectangle.width);
			this.binding.set("y", box ? (vertical ? box.inlineSize : box.blockSize) : rectangle.height);
		}
	}

	dispose() {}
}
