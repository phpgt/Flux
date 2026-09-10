<section id="clock-demo" class="demo split" data-flux="flux-time flux-date flux-pointer">
	<div class="demo-copy"><h2>Analogue clock</h2>
		<p>The container has <code>data-flux="flux-time flux-date flux-pointer"</code>, which exposes the device's local time, date and pointer position as CSS variables.</p>
		<p>The clock's hands are HTML elements. CSS multiplies the time variables by <code>360deg</code> to rotate them, and uses the pointer coordinates to tilt the face. CSS counters and date variables provide the text below the clock, so the display needs no requests to the server.</p>
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
