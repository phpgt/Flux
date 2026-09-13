<section id="pointer-demo" class="demo" data-flux="flux-first-visible">
	<h2>Local and viewport pointer coordinates</h2>
	<p>The pad has <code>data-flux="flux-pointer"</code>, which exposes pointer coordinates relative to the pad as CSS variables. CSS multiplies the normalised X and Y values, from zero to one, by <code>100%</code> to position the marker. CSS counters in <code>::after</code> display pixel coordinates clamped to the pad's edges.</p>
	<p>The connection <code>(flux-pointer,flux-size@#pointer-preview)</code> copies the pad's pointer and size variables to the smaller preview. Its marker uses the normalised coordinates to fit its own dimensions, while its readout shows the source pixels. The viewport readout uses global pointer coordinates measured from the browser viewport's top-left corner.</p>
	<div id="pointer-pad" class="pointer-pad" data-flux="flux-pointer (flux-pointer,flux-size@#pointer-preview) flux-size"><span class="pointer-marker" aria-hidden="true"></span><p>Move your pointer here.</p><p class="pointer-readout">Local: </p></div>
	<div id="pointer-preview" class="pointer-pad pointer-preview"><span class="pointer-marker" aria-hidden="true"></span><p>Connected preview</p><p class="pointer-readout">Source pixels: </p></div>
	<p class="viewport-pointer-readout">Viewport: </p>
</section>
