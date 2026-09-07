<section id="counters-demo" class="demo" data-flux="flux-first-visible">
	<h2>Multiple forms and update targets</h2><p>Each form uses <code>data-flux="auto"</code>. A response also refreshes the combined total using <code>update</code>. The plain textarea keeps its contents while the targets change.</p>
	<div class="demo-grid">
	<?php foreach(['a', 'b'] as $key): ?>
	<form id="counter-<?= $key ?>" method="post" class="fields" <?= $key === 'a' ? 'data-flux="auto"' : 'data-flux' ?>>
		<?php formFields('counter'); ?><input type="hidden" name="counter" value="<?= $key ?>" />
		<h3>Counter <?= strtoupper($key) ?></h3><output class="big-number"><?= $_SESSION['counters'][$key] ?? 0 ?></output>
		<div class="actions"><button name="do" value="minus">Subtract one</button><button name="do" value="plus">Add one</button></div>
	</form>
	<?php endforeach; ?>
	</div>
	<p>Total: <output id="counter-total" data-flux="update"><?= array_sum($_SESSION['counters'] ?? []) ?></output></p>
	<label class="field"><span>Your scratchpad</span><textarea placeholder="Enter text here, then change either counter."></textarea></label>
</section>
