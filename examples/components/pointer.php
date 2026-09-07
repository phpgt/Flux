<section id="pointer-demo" class="demo" data-flux="flux-first-visible">
	<h2>Local and viewport pointer coordinates</h2><p>The pad exposes local X/Y values from 0 to 1, and pixel values clamped to its edges. The viewport readout uses the browser's top-left corner. Both text readouts use CSS counters in <code>::after</code>.</p>
	<div id="pointer-pad" class="pointer-pad" data-flux="flux-pointer (flux-pointer,flux-size@#pointer-preview) flux-size"><span class="pointer-marker" aria-hidden="true"></span><p>Move your pointer here.</p><p class="pointer-readout">Local: </p></div>
	<div id="pointer-preview" class="pointer-pad pointer-preview"><span class="pointer-marker" aria-hidden="true"></span><p>Connected preview</p><p class="pointer-readout">Source pixels: </p></div>
	<p class="viewport-pointer-readout">Viewport: </p>
	<p>The smaller preview receives the source values unchanged. Its marker uses the normalised coordinates to fit its own dimensions.</p>
</section>
