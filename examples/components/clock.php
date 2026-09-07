<section id="clock-demo" class="demo split" data-flux="flux-first-visible flux-time flux-date flux-pointer">
	<div class="demo-copy"><h2>Analogue clock</h2>
		<p>The element has the attribute <code>data-flux="flux-time flux-pointer"</code>, which supplies the time as CSS variables, which are used to position the clock's hands.</p>
		<p>Flux also supplies the pointer position within this section, allowing CSS to use the pointer coordinates to rotate the clock face while the pointer is over the section.</p>
		<p><a href="?page=time">Time and date examples</a></p>
	</div>
	<div class="clock-stage">
		<div class="clock-dial" aria-hidden="true">
			<div class="clock-face">
				<span class="clock-twelve">12</span><span class="clock-three">3</span><span class="clock-six">6</span><span class="clock-nine">9</span>
				<span class="clock-hand clock-hour"></span><span class="clock-hand clock-minute"></span><span class="clock-hand clock-second"></span><span class="clock-centre"></span>
			</div>
		</div>
		<p class="clock-digital" aria-label="Local time on a twelve-hour clock"></p>
		<p class="calendar-date" aria-label="Local calendar date"></p>
	</div>
</section>
