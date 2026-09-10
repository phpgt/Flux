<section id="search-results-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy"><h2>City search results</h2>
		<p>The GET form sends the query to PHP, which renders matching cities as links. The form's <code>data-flux="autocomplete"</code> requests results as you type and replaces the adjacent <code>autocomplete-results</code> element with the results from the response. <code>data-flux-min-length="0"</code> allows clearing the field to show all cities again. Pressing Enter submits a normal GET request, so the query can be bookmarked.</p>
		<p>Each result uses <code>data-flux="link"</code> to request a page containing the selected city. Flux updates the region marked <code>update-link-inner</code> and opens its <code>&lt;dialog data-flux="modal"&gt;</code>. The city URL also works when opened directly, so the selection can be bookmarked.</p>
	</div>
	<div id="city-search-content">
		<form method="get" class="fields" data-flux="autocomplete" data-flux-min-length="0">
			<input type="hidden" name="page" value="search" />
			<label><span>Search cities</span><input type="search" name="q" autocomplete="off" value="<?= h(input($_GET, 'q')) ?>" /></label>
			<button>Search</button>
		</form>
		<?php require __DIR__ . '/city-results.php'; ?>
	</div>
</section>
