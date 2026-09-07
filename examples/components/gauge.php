<section id="gauge-demo" class="demo split" data-flux="flux-first-visible flux-range">
	<div class="demo-copy"><h2>Radial gauge</h2>
		<p>One native range input supplies <code>--flux-range</code>, from zero to one. CSS draws the radial gauge, moves through orange to red, and applies a vibration animation above 90%.</p>
		<p>The control works with your keyboard too. Reduced-motion preferences turn the vibration off.</p>
		<label class="field"><span>Engine load</span><input id="engine-load" type="range" min="0" max="100" value="35" /></label>
	</div>
	<div class="gauge-stage"><div class="radial-gauge" aria-hidden="true"><span class="gauge-value"></span></div><p class="gauge-status"><span>Running</span><span>Redline</span></p></div>
</section>
