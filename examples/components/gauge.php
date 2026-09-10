<section id="gauge-demo" class="demo split" data-flux="flux-first-visible flux-range">
	<div class="demo-copy">
		<h2>Radial gauge</h2>
		<p>The container uses <code>data-flux="flux-range"</code> to expose the range input's value as <code>--flux-range</code>, normalised from zero to one.</p>
		<p>CSS multiplies that value by <code>270deg</code> to draw the filled arc with a conic gradient. The same variable sets the colour, percentage text and redline state, so all parts of the gauge follow the native input without separate event handlers.</p>
		<label class="field"><span>Engine load</span><input id="engine-load" type="range" min="0" max="100" value="35" /></label>
	</div>
	<div class="gauge-stage"><div class="radial-gauge" aria-hidden="true"><span class="gauge-value"></span></div><p class="gauge-status"><span>Running</span><span>Redline</span></p></div>
</section>
