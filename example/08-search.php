<?php
function h(?string $value): string {
	return htmlspecialchars($value ?? "", ENT_QUOTES, "UTF-8");
}

$query = $_GET["query"] ?? "";
?><!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PHP.GT/Flux example 08 search</title>
<link rel="stylesheet" href="/example/style.css" />
<script type="module" src="/dist/flux.js" defer></script>

<main class="page-shell">
	<header class="hero">
		<h1>Search autocomplete</h1>
		<p>The form submits to a separate results page with a normal GET request. Flux previews that page's marked result element while you type.</p>
	</header>

	<section class="panel">
		<form action="/example/08a-search-results.php" method="get" data-flux="autocomplete">
			<label>
				<span>Search places</span>
				<input
					name="query"
					type="search"
					value="<?php echo h($query); ?>"
					placeholder="Try london, canada, street, station..."
					autocomplete="off"
				/>
			</label>
			<button>Search</button>
		</form>
	</section>
</main>
