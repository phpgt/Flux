<!doctype html>
<html lang="en-GB">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Example 12: CSS time and date</title>
	<link rel="stylesheet" href="/test/fixtures/example/style.css" />
	<link rel="stylesheet" href="/test/fixtures/example/css-time.css" />
	<script type="module" src="/dist/flux.js"></script>
</head>
<body>
<main class="page-shell">
	<h1>Time and date in CSS</h1>
	<p>The clock follows your device's local time. Its hands and the calendar indicators are drawn with CSS, using values refreshed once a second.</p>
	<p><a href="/test/fixtures/example/">All examples</a> · <a href="09-css-geometry.php">CSS geometry</a> · <a href="10-css-controls.php">Control properties</a></p>
	<section id="local-clock" class="panel" data-flux="flux-time flux-date (flux-time,flux-date@#calendar-preview)">
		<h2>An analogue clock</h2>
		<div class="clock-face" aria-hidden="true">
			<span class="clock-twelve">12</span><span class="clock-three">3</span>
			<span class="clock-six">6</span><span class="clock-nine">9</span>
			<span class="clock-hand clock-hour"></span>
			<span class="clock-hand clock-minute"></span>
			<span class="clock-hand clock-second"></span>
			<span class="clock-centre"></span>
		</div>
		<p class="clock-digital" aria-label="Local time on a twelve-hour clock"></p>
		<p>The hour hand includes minutes and seconds. The minute hand includes seconds. Each hand settles with a very slight bounce, including when it crosses twelve. The effect follows your reduced-motion preference.</p>
		<noscript><p>The live clock needs JavaScript to supply its time values.</p></noscript>
	</section>
	<aside id="calendar-preview" class="panel">
		<h2>A connected calendar</h2>
		<p class="calendar-date" aria-label="Today's local date"></p>
		<p class="calendar-short" aria-label="Abbreviated day and month"></p>
		<p>The names follow the page's language. This page uses British English. Weeks begin on Monday.</p>
		<div class="calendar-progress" aria-hidden="true">
			<span>Year</span><span class="time-meter"><span class="year-progress"></span></span>
			<span>Month</span><span class="time-meter"><span class="month-progress"></span></span>
			<span>Week</span><span class="time-meter"><span class="week-progress"></span></span>
			<span>Day</span><span class="time-meter"><span class="day-progress"></span></span>
		</div>
		<p>This region receives its properties through a connection. The clock keeps updating while either region is visible.</p>
	</aside>
</main>
</body>
</html>
