<section id="search-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy"><h2>Search with autocomplete</h2>
		<p>The search is a GET form. PHP reads its query, searches a local list of 600 cities by name or country, and renders the results as HTML links.</p>
		<p>Adding <code>data-flux="autocomplete"</code> to the form makes Flux request that page as you type and display the part marked <code>data-flux="autocomplete-results"</code>. The suggestions reuse the server's search and HTML rendering. <code>data-flux-min-length="0"</code> allows an empty query to return the city list.</p>
		<p>The arrow keys move focus through the suggestions. Enter in the search field submits a normal GET request; selecting a city link requests a server-rendered dialog.</p>
	</div>
	<div>
		<form method="get" class="fields" data-flux="autocomplete" data-flux-min-length="0">
			<input type="hidden" name="page" value="search" />
			<input type="hidden" name="return-page" value="<?= h($page) ?>" />
			<label><span>Search cities</span><input type="search" name="q" autocomplete="off" placeholder="e.g. London" /></label>
			<button>Search</button>
		</form>
	</div>
</section>
