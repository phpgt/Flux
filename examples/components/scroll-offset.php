<section id="scroll-offset-demo" class="demo" data-flux="flux-first-visible">
	<h2>How far have you scrolled?</h2>
	<p><code>flux-scroll</code> exposes <code>--flux-scroll-x</code> and <code>--flux-scroll-y</code> from 0 at the start to 1 at the end, plus <code>--flux-scroll-x-px</code> and <code>--flux-scroll-y-px</code> in CSS pixels. An axis with no overflow reads zero.</p>
	<p>This page’s <code>&lt;body&gt;</code> supplies the page offset. Scroll the page to change this readout:</p>
	<p class="scroll-offset-readout" aria-hidden="true"></p>
	<p>Now scroll inside this box, using touch, the scrollbar, or the arrow keys after focusing it. Its connection copies the measurements to the meter below.</p>
	<div id="scroll-offset-box" class="scroll-offset-box" tabindex="0" role="region" aria-label="Scrollable reading example" data-flux="(flux-scroll@#scroll-offset-meter)">
		<div class="scroll-reading">
			<h3>The beginning</h3>
			<p>Each scroll area has its own position. Scrolling this text does not change the page’s reading above.</p>
			<p class="scroll-reading-middle">Halfway through. The meter follows the available scroll range, rather than the full content height.</p>
			<p>The end. At the bottom, the vertical scalar reaches 1.</p>
		</div>
	</div>
	<div id="scroll-offset-meter" class="scroll-meter">
		<p class="scroll-offset-readout" aria-hidden="true"></p>
		<span class="bar" aria-hidden="true"><span class="scroll-offset-fill"></span></span>
	</div>
	<p>The readouts and bar are drawn by CSS. Pixel values are unitless numbers: multiply by <code>1px</code> when using them as lengths. Putting <code>flux-scroll</code> on <code>&lt;html&gt;</code> also measures the page.</p>
</section>
