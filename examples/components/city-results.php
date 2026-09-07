<?php
$query = substr(input($_GET, 'q'), 0, 200);
$matches = matchingCities($query);
$returnPage = input($_GET, 'return-page', 'search');
if(!in_array($returnPage, ['home', 'forms', 'search'], true)) $returnPage = 'search';
?>
<div id="search-results" data-flux="autocomplete-results" aria-live="polite">
	<p><?= count($matches) ?> <?= count($matches) === 1 ? 'city' : 'cities' ?><?= trim($query) !== '' ? ' matching “' . h($query) . '”' : ' available' ?>.</p>
	<?php if($matches): ?>
	<ul class="search-results city-results">
		<?php foreach($matches as $city): ?>
		<li><a href="<?= h(cityUrl($city['id'], $query, $returnPage)) ?>" data-flux="link" data-flux-scroll="preserve" aria-haspopup="dialog"><?= h($city['name']) ?>, <?= h($city['country']) ?></a></li>
		<?php endforeach; ?>
	</ul>
	<?php else: ?><p>No cities matched. Enter another city or country name.</p><?php endif; ?>
	<p><small>City data: <a href="https://www.geonames.org/">GeoNames</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</small></p>
</div>
