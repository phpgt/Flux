<section id="counters-demo" class="demo" data-flux="flux-first-visible">
	<h2>Multiple forms: adding two numbers</h2>
	<p>Each counter is a separate POST form. PHP uses a hidden <code>counter</code> input to identify the number to change, stores both numbers in the session, and calculates their sum when rendering the page.</p>
	<p>The first form uses <code>data-flux="auto"</code>; the second uses the equivalent empty <code>data-flux</code> attribute. Flux submits them in the background and refreshes the forms from the response. The total has its own <code>data-flux="update"</code> target, so it updates too. The scratchpad is outside these targets and retains its text.</p>
	<div class="demo-grid">
	<?php foreach(['a', 'b'] as $key): ?>
	<form id="counter-<?= $key ?>" method="post" class="fields" <?= $key === 'a' ? 'data-flux="auto"' : 'data-flux' ?>>
		<?php formFields('counter'); ?><input type="hidden" name="counter" value="<?= $key ?>" />
		<h3>Counter <?= strtoupper($key) ?></h3><output class="big-number"><?= $_SESSION['counters'][$key] ?? 0 ?></output>
		<div class="actions"><button name="do" value="minus">Subtract one</button><button name="do" value="plus">Add one</button></div>
	</form>
	<?php endforeach; ?>
	</div>
	<p>A + B = <output id="counter-total" data-flux="update" aria-live="polite"><?= array_sum($_SESSION['counters'] ?? []) ?></output></p>
	<label class="field"><span>Your scratchpad</span><textarea placeholder="Enter text here, then change either counter."></textarea></label>
</section>
