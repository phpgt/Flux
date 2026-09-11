/** Scroll offsets and an element's passage through its nearest scrollport. */
export class ScrollSource {
	constructor(binding) {
		this.binding = binding;
		this.observed = new Map();
	}

	refresh() {
		let {element, runtime, name} = this.binding;
		let {document, window} = runtime;
		let page = document.scrollingElement ?? document.documentElement;
		let roots = new Set([element]);
		if(name === "flux-scroll") {
			let container = element === document.body || element === document.documentElement ? page : element;
			roots.add(container);
			let style = window.getComputedStyle(container);
			let reversedX = style.direction === "rtl";
			let reversedY = false;
			if(style.display.includes("flex")) {
				if(style.flexDirection === "row-reverse") reversedX = !reversedX;
				reversedY = style.flexDirection === "column-reverse";
			}
			for(let [axis, offset, extent, viewport] of [
				["x", container.scrollLeft, container.scrollWidth, container.clientWidth],
				["y", container.scrollTop, container.scrollHeight, container.clientHeight],
			]) {
				let range = extent - viewport;
				let direction = (axis === "x" ? reversedX : reversedY) ? -1 : 1;
				this.binding.set(axis, range > 0 ? Math.max(0, Math.min(1, direction * offset / range)) : 0);
				this.binding.set(`${axis}-px`, offset);
			}
		}
		else {
			let rectangle = element.getBoundingClientRect();
			for(let [axis, start, size, border, client] of [
				["x", "left", "width", "clientLeft", "clientWidth"],
				["y", "top", "height", "clientTop", "clientHeight"],
			]) {
				let container = this.scrollParent(axis);
				let origin = 0;
				let length = document.documentElement[client] || window[axis === "x" ? "innerWidth" : "innerHeight"];
				if(container) {
					let box = container.getBoundingClientRect();
					origin = box[start] + container[border];
					length = container[client];
				}
				roots.add(container ?? page);
				let distance = length + rectangle[size];
				let progress = distance > 0 ? (origin + length - rectangle[start]) / distance : 0;
				this.binding.set(axis, progress);
				this.binding.set(`${axis}-inverse`, 1 - progress);
				this.binding.set(`${axis}-midway`, 1 - Math.abs(2 * progress - 1));
			}
		}
		// Watch content as well as the fixed-size scrollport: content growth changes
		// the scroll range even when the container itself has not resized.
		let wanted = new Set(roots);
		for(let root of roots) for(let child of root.children) wanted.add(child);
		for(let [element, unsubscribe] of this.observed) {
			if(wanted.has(element)) continue;
			unsubscribe();
			this.observed.delete(element);
		}
		for(let element of wanted) {
			if(!this.observed.has(element)) this.observed.set(element, runtime.observeResize(element, this.binding.requestRefresh));
		}
	}

	scrollParent(axis) {
		let {element, runtime} = this.binding;
		for(let parent = element.parentElement; parent && parent !== runtime.document.documentElement; parent = parent.parentElement) {
			// Body declarations describe page scrolling, consistently with flux-scroll.
			if(parent === runtime.document.body) break;
			let style = runtime.window.getComputedStyle(parent);
			if(/^(auto|scroll|hidden|overlay)$/.test(style[axis === "x" ? "overflowX" : "overflowY"])) return parent;
		}
		return null;
	}

	dispose() {
		for(let unsubscribe of this.observed.values()) unsubscribe();
		this.observed.clear();
	}
}
