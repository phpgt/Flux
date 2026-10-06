<section id="calendar-demo" class="demo" lang="en-GB" data-flux="flux-first-visible flux-date (flux-date@#calendar-connection)">
	<h2>Calendar progress</h2>
	<p>The container uses <code>data-flux="flux-date"</code> to expose the local date and progress through the year, month, week and day as CSS variables. CSS uses the progress values with <code>scaleX()</code> to set each bar's length and the date variables to generate the labels.</p>
	<p>Date names follow the nearest HTML <code>lang</code> attribute, demonstrated by the French labels below. Values use the device's time zone, and weeks start on Monday. The connection <code>(flux-date@#calendar-connection)</code> copies the variables to another element so it can display the same date.</p>
	<p class="calendar-date"></p><p class="calendar-short"></p>
	<dl class="calendar-progress">
	<?php foreach(['year' => 'Year', 'month' => 'Month', 'week' => 'Week', 'day' => 'Day'] as $period => $label): ?>
		<dt><?= $label ?></dt><dd><span class="bar"><span class="<?= $period ?>-progress"></span></span></dd>
	<?php endforeach; ?>
	</dl>
	<div id="calendar-connection"><p class="calendar-short"></p><p>This date receives the same values through a connection.</p></div>
	<div lang="fr-FR" data-flux="flux-date"><h3>French date labels</h3><p class="calendar-date"></p></div>
	<p><code>--flux-date-weekday</code> is Monday 1 to Sunday 7. The day-progress property is named <code>--flux-day-scalar</code>.</p>
</section>
