<section id="search-results-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy"><p class="eyebrow">GET form submissions</p><h2>Search results</h2>
		<p>A GET form sends the query to PHP. Flux updates the results from the returned HTML. The query is included in the URL.</p>
		<p>Try “clock”, “pointer” or “forms”.</p>
	</div>
	<div>
		<form method="get" class="fields">
			<input type="hidden" name="page" value="<?= h($page) ?>" />
			<label><span>Search examples</span><input type="search" name="q" value="<?= h(input($_GET, 'q')) ?>" /></label>
			<button data-flux="submit">Search</button>
		</form>
		<div id="search-results" data-flux="update-inner autocomplete-results" aria-live="polite">
			<?php $query = trim(input($_GET, 'q')); $matches = 0; ?>
			<ul class="search-results"><?php foreach($pages as $name => [$title, $description]): ?>
				<?php if($name === 'home' || $name === 'reference' || ($query !== '' && stripos($title . ' ' . $description . ' ' . ($name === 'time' ? 'clock calendar' : ''), $query) === false)) continue; $matches++; ?>
				<li><a href="<?= pageUrl($name) ?>"><?= h($title) ?></a><p><?= h($description) ?></p></li>
			<?php endforeach; ?></ul>
			<p><?= $matches ?> <?= $matches === 1 ? 'feature group' : 'feature groups' ?><?= $query !== '' ? ' matching “' . h($query) . '”' : '' ?>.</p>
		</div>
	</div>
</section>
