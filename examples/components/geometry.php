<section id="geometry-demo" class="demo" data-flux="flux-first-visible">
	<h2>Element size and text truncation</h2><p>Resize the box from its corner. <code>flux-size</code> supplies its border-box dimensions. <code>flux-truncated</code> checks whether its text is clipped.</p>
	<div id="size-box" class="size-box" data-flux="flux-size"><p class="size-readout"></p><p class="truncated-text" data-flux="flux-truncated (flux-truncated@#truncation-note)">This text is clipped when its width exceeds the available space inside the box.</p></div>
	<p id="truncation-note" class="truncation-note">The description is clipped. Widen the box to reveal it.</p>
	<div class="visibility-preview" data-flux="flux-visible flux-first-visible"><h3>Viewport visibility</h3><p>The border uses <code>--flux-visible</code>. The entry transition on every demo uses <code>--flux-first-visible</code>, which remembers its first appearance.</p></div>
</section>
