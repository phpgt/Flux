<section id="arrows-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy">
		<h2>Follow the pointer</h2>
		<p>A PHP <code>for</code> loop outputs 40 <code>span</code> elements. Each has <code>data-flux="flux-pointer flux-size"</code>, exposing its dimensions and the pointer position relative to it as CSS variables.</p>
		<p>CSS subtracts half the element's width and height from the raw pointer coordinates, then uses <code>atan2()</code> to calculate the angle from its centre to the pointer. Transitions on the <code>sin()</code> and <code>cos()</code> components smooth the rotation without a full spin when the angle crosses 180 degrees.</p>
	</div>
	<div class="arrow-grid" aria-hidden="true">
	<?php for($arrow = 0; $arrow < 40; $arrow++): ?>
		<span class="arrow-cell" data-flux="flux-pointer flux-size"><span class="pointer-arrow">→</span></span>
	<?php endfor; ?>
	</div>
</section>
