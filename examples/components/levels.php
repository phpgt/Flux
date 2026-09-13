<section id="levels-demo" class="demo split" data-flux="flux-first-visible flux-range">
	<div class="demo-copy">
		<h2>Vertical range input</h2>
		<p>An HTML range input has five discrete values, labelled from OFF to EXTREME. CSS makes the input vertical, and <code>data-flux="flux-range"</code> on its container exposes its value as <code>--flux-range</code>, normalised from zero to one.</p>
		<p>CSS multiplies the variable by four to recover the selected step. It uses that step to colour the labels and set their opacity, showing the current label above the control. The input retains its native pointer and keyboard controls.</p>
	</div>
	<div class="level-stage">
		<p class="level-current" aria-hidden="true"><?php foreach(['OFF', 'LOW', 'MID', 'HIGH', 'EXTREME'] as $i => $label): ?><span style="--step: <?= $i ?>"><?= $label ?></span><?php endforeach; ?></p>
		<div class="level-control">
			<label><span class="visually-hidden">Power level: 0 off, 1 low, 2 mid, 3 high, 4 extreme</span><input id="power-level" type="range" min="0" max="4" step="1" value="0" /></label>
			<ol class="level-labels" aria-hidden="true"><?php foreach(array_reverse(['OFF', 'LOW', 'MID', 'HIGH', 'EXTREME'], true) as $i => $label): ?><li style="--step: <?= $i ?>"><?= $label ?></li><?php endforeach; ?></ol>
		</div>
	</div>
</section>
