<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Example 11: CSS media palettes</title>
	<link rel="stylesheet" href="/example/style.css" />
	<link rel="stylesheet" href="/example/css-properties.css" />
	<script type="module" src="/dist/flux.js"></script>
</head>
<body>
<main class="page-shell">
	<h1>CSS media palettes</h1>
	<p>Flux measures a small sample of the image or current video frame. Each caption uses the resulting colours. Both examples use media served by this application.</p>
	<p><a href="/example/">All examples</a> · <a href="09-css-geometry.php">Geometry</a> · <a href="10-css-controls.php">Control properties</a></p>
	<figure id="image-palette" class="panel palette-preview" data-flux="flux-palette">
		<img src="/example/assets/palette.svg" width="640" height="360" alt="An illustration of hills beneath a golden sun" />
		<figcaption><h2>Image palette</h2><p>The border uses the dominant colour; the swatches show the accent, darkest, lightest, and average colours.</p></figcaption>
		<div class="swatches" aria-hidden="true"><span class="accent"></span><span class="dark"></span><span class="light"></span><span class="average"></span></div>
		<div class="temperature" aria-label="Colour temperature"><span></span></div>
	</figure>
	<figure id="video-palette" class="panel palette-preview" data-flux="flux-palette">
		<video controls muted loop playsinline width="320" height="180" preload="auto" src="/example/assets/palette.webm" aria-label="A silent colour study with gradually changing hues"></video>
		<figcaption><h2>Video palette</h2><p>Play the silent six-second video to see the palette change. Sampling pauses when this region is off-screen.</p></figcaption>
		<div class="swatches" aria-hidden="true"><span class="accent"></span><span class="dark"></span><span class="light"></span><span class="average"></span></div>
		<div class="temperature" aria-label="Colour temperature"><span></span></div>
	</figure>
</main>
</body>
</html>
