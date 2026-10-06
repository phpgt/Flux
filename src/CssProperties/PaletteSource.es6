import {extractPalette} from "./Palette.es6";

/** Samples loaded media at a bounded resolution, reusing one canvas for video frames. */
export class PaletteSource {
	static SAMPLE_SIZE = 16;
	static VIDEO_INTERVAL = 250;

	constructor(binding) {
		this.binding = binding;
		this.media = null;
		this.context = null;
		this.frame = null;
		this.lastSample = -Infinity;
		this.sampledSource = null;
		this.failedSource = null;
		this.generation = 0;
		this.pending = false;
	}

	refresh() {
		let element = this.binding.element;
		let media = element.matches("img, video") ? element : element.querySelector("img, video");
		if(media !== this.media) {
			this.stop();
			this.media = media;
			this.sampledSource = null;
			this.failedSource = null;
			this.context = null;
			this.binding.clear();
		}
		if(!media || !this.binding.active) { this.stop(); return; }
		let source = media.currentSrc || media.src;
		if(this.failedSource === source) return;
		if(media.tagName === "IMG") {
			if(!media.complete || !media.naturalWidth || this.sampledSource === source || this.pending) return;
			this.sampleImage(source);
			return;
		}
		let now = this.binding.runtime.window.performance.now();
		if(media.readyState >= 2 && now - this.lastSample >= PaletteSource.VIDEO_INTERVAL) {
			this.sample(media, source);
			this.lastSample = now;
		}
		if(!media.paused && this.frame === null && media.requestVideoFrameCallback) {
			this.frame = media.requestVideoFrameCallback(() => {
				this.frame = null;
				this.binding.requestRefresh();
			});
		}
	}

	async sampleImage(source) {
		let generation = this.generation;
		let media = this.media;
		this.pending = true;
		let bitmap;
		try {
			let createBitmap = this.binding.runtime.window.createImageBitmap;
			if(createBitmap) {
				try { bitmap = await createBitmap(media, {resizeWidth: 16, resizeHeight: 16}); }
				catch { /* The canvas can downsample when bitmap decoding is unavailable. */ }
			}
			if(generation !== this.generation || (media.currentSrc || media.src) !== source) return;
			this.sample(bitmap ?? media, source);
			this.sampledSource = source;
		}
		finally {
			bitmap?.close();
			if(generation === this.generation) {
				this.pending = false;
				if((media.currentSrc || media.src) !== source) this.binding.requestRefresh();
			}
		}
	}

	sample(media, source) {
		try {
			if(!this.context) {
				let canvas = this.binding.runtime.document.createElement("canvas");
				canvas.width = canvas.height = PaletteSource.SAMPLE_SIZE;
				this.context = canvas.getContext("2d", {willReadFrequently: true});
			}
			if(!this.context) { this.failedSource = source; return; }
			this.context.drawImage(media, 0, 0, 16, 16);
			let palette = extractPalette(this.context.getImageData(0, 0, 16, 16).data);
			if(palette) {
				for(let [name, value] of Object.entries(palette)) this.binding.set(name, value);
			}
			else this.binding.clear();
		}
		catch {
			// Unreadable media (including a canvas blocked by CORS) leaves CSS fallbacks available.
			this.failedSource = source;
			this.context = null;
			this.binding.clear();
		}
	}

	onEvent(event) {
		if(event.target !== this.media) return;
		if(event.type === "seeked" || event.type === "loadeddata") this.lastSample = -Infinity;
		if(event.type === "load") {
			this.sampledSource = null;
			this.failedSource = null;
		}
		if(event.type === "error" || event.type === "emptied") {
			this.sampledSource = null;
			this.binding.clear();
		}
		if(this.binding.active) this.binding.requestRefresh();
	}

	stop() {
		if(this.frame !== null) this.media?.cancelVideoFrameCallback?.(this.frame);
		this.frame = null;
		this.generation++;
		this.pending = false;
	}

	dispose() { this.stop(); }
}
