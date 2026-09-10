<section id="image-palette-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy"><h2>Image palette</h2>
		<p>The figure has <code>data-flux="flux-palette"</code>. Flux samples its image and exposes the dominant, accent, dark, light and average colours as CSS variables.</p>
		<p>The shadow uses <code>--flux-palette</code>, while the swatches use properties such as <code>--flux-palette-accent</code>. CSS positions the temperature marker using <code>--flux-palette-temp</code>. These styles derive their colours from the image, so changing the image does not require choosing a new set of CSS colours.</p></div>
	<figure class="palette-preview" data-flux="flux-palette">
		<img src="?asset=palette.svg" width="640" height="360" alt="Layered hills beneath a golden sun" />
		<figcaption>Colours sampled from the image</figcaption>
		<div class="swatches" aria-label="Accent, dark, light and average colours"><span class="accent"></span><span class="dark"></span><span class="light"></span><span class="average"></span></div>
		<div class="temperature" aria-label="Colour temperature"><span></span></div>
	</figure>
</section>
