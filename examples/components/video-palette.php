<section id="video-palette-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy"><h2>Video palette</h2>
		<p>The figure uses the same <code>data-flux="flux-palette"</code> attribute as the image example, but contains a <code>&lt;video&gt;</code>. Flux samples the current frame and updates the palette variables during playback, pausing sampling when the figure is off-screen.</p>
		<p>The shadow, swatches and temperature marker use those variables in CSS. The same styles work for both images and video; Flux updates the palette during playback. A small script checks whether the remote Big Buck Bunny sample is reachable and switches to it when available. The bundled clip is used if the request fails or the remote video cannot load. Use the native video controls to play or seek.</p></div>
	<figure class="palette-preview" data-flux="flux-palette">
		<video src="?asset=palette.webm" data-remote-src="https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.mp4" controls muted loop playsinline preload="metadata" width="320" height="180" aria-label="A silent colour study"></video>
		<figcaption>Play the video to update its palette. Remote sample: <a href="https://peach.blender.org/">Big Buck Bunny</a>, © Blender Foundation, <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>.</figcaption>
		<div class="swatches" aria-label="Accent, dark, light and average colours"><span class="accent"></span><span class="dark"></span><span class="light"></span><span class="average"></span></div>
		<div class="temperature" aria-label="Colour temperature"><span></span></div>
	</figure>
</section>
