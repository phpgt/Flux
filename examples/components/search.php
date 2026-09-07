<section id="search-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy"><h2>Search with autocomplete</h2>
		<p>Search 600 cities by name or country, for example “London”, “Tokyo” or “Canada”. Flux previews the server's marked results as you type. Arrow keys move through the suggestions; Enter follows a normal GET request to the results page.</p>
		<p><code>autocomplete</code> enhances the form. <code>autocomplete-results</code> marks the part of the response to display, and <code>data-flux-min-length="0"</code> allows an empty query to show the city list. Select a city to display the server-rendered selection in a modal dialog.</p>
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
