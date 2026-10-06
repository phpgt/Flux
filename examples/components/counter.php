<section id="counter-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy"><h2>Increment/decrement counter</h2>
		<p>Each button submits an ordinary HTML form with a <code>do</code> value of <code>minus</code> or <code>plus</code>. PHP changes the number stored in the session and renders the form with its new value.</p>
		<p>Adding <code>data-flux="auto"</code> to the form makes Flux submit it in the background and replace it from the returned page. The same PHP handles a normal page submission when JavaScript is unavailable.</p></div>
	<form id="single-counter" method="post" class="fields" data-flux="auto">
		<?php formFields('single-counter'); ?>
		<output class="big-number" aria-live="polite" aria-label="Counter value"><?= $_SESSION['single-counter'] ?? 0 ?></output>
		<div class="actions"><button name="do" value="minus">Decrement</button><button name="do" value="plus">Increment</button></div>
	</form>

	<p><a href="?page=forms">Form examples</a></p>
</section>
