<section id="search-results-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy"><h2>City search results</h2>
		<p>A GET form sends the query to PHP. The server searches a local list of 600 cities. Select a result to request a dialog containing that city.</p>
		<p>Flux inserts the server-rendered dialog into the page and opens it as a modal. The same URL displays the selection when opened directly.</p>
	</div>
	<div>
		<form method="get" class="fields">
			<input type="hidden" name="page" value="search" />
			<label><span>Search cities</span><input type="search" name="q" value="<?= h(input($_GET, 'q')) ?>" /></label>
			<button data-flux="submit">Search</button>
		</form>
		<div id="city-search-content" data-flux="update-inner"><?php require __DIR__ . '/city-results.php'; ?></div>
	</div>
</section>
