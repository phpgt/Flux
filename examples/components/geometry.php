<section id="geometry-demo" class="demo" data-flux="flux-first-visible">
	<h2>Element size and text truncation</h2>
	<p>The resizable box has <code>data-flux="flux-size"</code>, which exposes its width and height, including padding and borders, as CSS variables. CSS counters display those dimensions as you resize it.</p>
	<p>The paragraph uses <code>flux-truncated</code> to expose whether its text is clipped. The connection <code>(flux-truncated@#truncation-note)</code> copies that value to the note below, where CSS uses it as the opacity. This makes the explanation visible only when the text does not fit.</p>
	<div id="size-box" class="size-box" data-flux="flux-size"><p class="size-readout"></p><p class="truncated-text" data-flux="flux-truncated (flux-truncated@#truncation-note)">This text is clipped when its width exceeds the available space inside the box.</p></div>
	<p id="truncation-note" class="truncation-note">The description is clipped. Widen the box to reveal it.</p>
	<div class="visibility-preview" data-flux="flux-visible flux-first-visible"><h3>Viewport visibility</h3><p>The border uses <code>--flux-visible</code>. The entry transition on every demo uses <code>--flux-first-visible</code>, which remembers its first appearance.</p></div>
</section>
