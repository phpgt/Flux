<div id="city-dialog-region" data-flux="update-link-inner">
	<?php $cityId = input($_GET, 'city'); $city = selectedCity($cityId); ?>
	<?php if($cityId !== ''): ?>
	<dialog id="city-dialog" class="city-dialog" open data-flux="modal" aria-labelledby="city-dialog-title">
		<h2 id="city-dialog-title"><?= $city ? 'Selected city' : 'City not found' ?></h2>
		<?php if($city): ?>
		<p>You selected <strong><?= h($city['name']) ?>, <?= h($city['country']) ?></strong>.</p>
		<dl><div><dt>City</dt><dd><?= h($city['name']) ?></dd></div><div><dt>Country or territory</dt><dd><?= h($city['country']) ?></dd></div><div><dt>Time zone</dt><dd><?= h($city['timezone']) ?></dd></div></dl>
		<?php else: ?><p>The selected city is not in this example's dataset.</p><?php endif; ?>
		<form method="dialog"><button autofocus>Close</button></form>
	</dialog>
	<?php endif; ?>
</div>
