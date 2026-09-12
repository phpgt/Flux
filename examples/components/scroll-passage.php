<section id="scroll-passage-demo" class="demo" data-flux="flux-first-visible">
	<h2>Through the scrollport</h2>
	<p><code>flux-scroll-progress</code> measures the declaring element against its nearest scroll container, or the viewport when there is none. It exposes <code>--flux-scroll-progress-x</code> and <code>--flux-scroll-progress-y</code>.</p>
	<p>Scroll the box to bring the marker into view. Progress is negative before its top enters the bottom edge, 0 at entry, and 1 when its bottom leaves the top edge. Keep scrolling and it exceeds 1. Scroll back to reverse the journey.</p>
	<div id="scroll-passage-box" class="scroll-passage-box" tabindex="0" role="region" aria-label="Element passage example">
		<div class="scroll-passage-track">
			<p class="scroll-passage-spacer">Scroll down to find the marker ↓</p>
			<div id="scroll-passage-marker" class="scroll-passage-marker" data-flux="(flux-scroll-progress@#scroll-passage-meter)"><div class="scroll-passage-artwork"><strong>Follow my journey</strong><span>I fade and grow towards the centre, then wobble before drifting away.</span></div></div>
			<p class="scroll-passage-spacer">Keep scrolling until the marker has left the top ↑</p>
		</div>
	</div>
	<div id="scroll-passage-meter" class="scroll-meter">
		<p>Forward progress</p>
		<p class="scroll-passage-readout" aria-hidden="true"></p>
		<span class="bar" aria-hidden="true"><span class="scroll-passage-fill"></span></span>
		<p>Inverse progress</p>
		<p class="scroll-passage-readout scroll-passage-inverse-readout" aria-hidden="true"></p>
		<span class="bar" aria-hidden="true"><span class="scroll-passage-inverse-fill"></span></span>
		<p>Midway</p>
		<p class="scroll-passage-readout scroll-passage-midway-readout" aria-hidden="true"></p>
		<span class="bar" aria-hidden="true"><span class="scroll-passage-midway-fill"></span></span>
	</div>
	<p><code>--flux-scroll-progress-y-inverse</code> is <code>1 − progress</code>: greater than 1 below the scrollport, 1 at entry, 0 at exit, and negative above it. The horizontal equivalent is <code>--flux-scroll-progress-x-inverse</code>.</p>
	<p><code>--flux-scroll-midway-y</code> peaks at 1 when the marker and scrollport centres align (50% through). It is 0 at entry and exit, and negative outside. The marker reaches full opacity and scale at 80% centred, and gently wobbles above 90%. It fades and shrinks again below 80% as it leaves. The horizontal equivalent is <code>--flux-scroll-midway-x</code>.</p>
	<p>The readout stays visible through a CSS connection. It shows the full, unclamped progress as a percentage; only the bar uses <code>clamp(0, var(--flux-scroll-progress-y), 1)</code>. Horizontal progress follows the same rule, entering from the right and leaving through the left.</p>
</section>
