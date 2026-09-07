<section id="clock-demo" class="demo split" data-flux="flux-first-visible flux-time flux-date">
	<div class="demo-copy"><h2>Analogue clock</h2>
		<p>The clock's hands are positioned with CSS. Flux updates the local time in CSS variables once a second.</p>
		<p>Flux also supplies the pointer position within the viewport. CSS uses these coordinates to rotate the clock face towards the pointer.</p>
		<p><a href="?page=time">Time and date examples</a></p>
	</div>
	<div class="clock-stage">
		<div class="clock-face" aria-hidden="true">
			<span class="clock-twelve">12</span><span class="clock-three">3</span><span class="clock-six">6</span><span class="clock-nine">9</span>
			<span class="clock-hand clock-hour"></span><span class="clock-hand clock-minute"></span><span class="clock-hand clock-second"></span><span class="clock-centre"></span>
		</div>
		<p class="clock-digital" aria-label="Local time on a twelve-hour clock"></p>
		<p class="calendar-date" aria-label="Local calendar date"></p>
	</div>
</section>
