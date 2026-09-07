<section id="levels-demo" class="demo split" data-flux="flux-first-visible flux-range">
	<div class="demo-copy"><h2>Vertical range input</h2>
		<p>Five discrete steps, from OFF to EXTREME. The label colours change as the value increases. The current label above the control is selected entirely in CSS from the Flux variable.</p>
		<p>Use the arrow keys to move one step at a time, or Home and End to reach either end.</p>
	</div>
	<div class="level-stage">
		<p class="level-current" aria-hidden="true"><?php foreach(['OFF', 'LOW', 'MID', 'HIGH', 'EXTREME'] as $i => $label): ?><span style="--step: <?= $i ?>"><?= $label ?></span><?php endforeach; ?></p>
		<div class="level-control">
			<label><span class="visually-hidden">Power level: 0 off, 1 low, 2 mid, 3 high, 4 extreme</span><input id="power-level" type="range" min="0" max="4" step="1" value="0" /></label>
			<ol class="level-labels" aria-hidden="true"><?php foreach(array_reverse(['OFF', 'LOW', 'MID', 'HIGH', 'EXTREME'], true) as $i => $label): ?><li style="--step: <?= $i ?>"><?= $label ?></li><?php endforeach; ?></ol>
		</div>
	</div>
</section>
