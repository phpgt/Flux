<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Example 09: CSS geometry</title>
	<link rel="stylesheet" href="/test/fixtures/example/style.css" />
	<link rel="stylesheet" href="/test/fixtures/example/css-properties.css" />
	<script type="module" src="/dist/flux.js"></script>
</head>
<body data-flux="flux-pointer-global">
<main class="page-shell">
	<h1>CSS geometry</h1>
	<p>Move your pointer across the pad, resize the box, and scroll to the visibility examples. Each effect reads CSS properties supplied by Flux.</p>
	<p><a href="/test/fixtures/example/">All examples</a> · <a href="10-css-controls.php">Control properties</a> · <a href="11-css-palette.php">Media palettes</a></p>
	<section class="panel">
		<h2>Local and viewport pointer positions</h2>
		<div id="pointer-pad" class="pointer-pad" data-flux="flux-pointer (flux-pointer@#pointer-preview)">
			<span class="pointer-marker" aria-hidden="true"></span>
			<p>Move the pointer here. The smaller pad receives the same local coordinates through a connection.</p>
			<p class="pointer-readout">Local position: </p>
		</div>
		<div id="pointer-preview" class="pointer-pad pointer-preview" aria-label="Connected pointer preview"><span class="pointer-marker" aria-hidden="true"></span></div>
		<p class="viewport-pointer-readout">Viewport position: </p>
		<p>The line below follows the horizontal pointer position within the browser viewport.</p>
		<div class="meter" aria-hidden="true"><span class="viewport-progress"></span></div>
	</section>
	<section class="panel">
		<h2>Element size</h2>
		<div id="size-box" class="size-box" data-flux="flux-size">
			<p>Resize this box using its corner handle. This text scales with the measured width.</p>
			<output class="size-readout" aria-label="Measured width and height"></output>
		</div>
	</section>
	<section class="panel">
		<h2>Text truncation</h2>
		<p id="truncated-text" class="truncated-text" data-flux="flux-truncated (flux-truncated@#truncated-hint)">A longer description can be clipped when there is less space available. Resize the browser to explore the available space.</p>
		<p id="truncated-hint" class="truncated-hint">The description is clipped. Its full text is available below.</p>
		<details><summary>Read the full description</summary><p>A longer description can be clipped when there is less space available. Resize the browser to explore the available space.</p></details>
	</section>
	<div class="scroll-space"><p>Continue scrolling to bring the next panel into view.</p></div>
	<section id="visibility-panel" class="panel visibility-panel" data-flux="flux-visible flux-first-visible">
		<h2>Visibility and first appearance</h2>
		<p>This panel becomes more opaque while any part of it is in view. The green border stays after its first appearance.</p>
	</section>
	<div class="scroll-space"><p>Scroll back to see the retained first-appearance state.</p></div>
</main>
</body>
</html>
