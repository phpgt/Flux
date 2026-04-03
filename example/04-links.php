<?php
function h(?string $value): string {
	return htmlspecialchars($value ?? "", ENT_QUOTES, "UTF-8");
}

$q = $_GET["q"] ?? "";
$note = $_GET["note"] ?? "";
$filter = $_GET["filter"] ?? "recent";
?><!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PHP.GT/Flux example 04 links</title>
<link rel="stylesheet" href="/example/style.css" />
<script type="module" src="/dist/flux.js" defer></script>

<textarea class="scratchpad" placeholder="This scratchpad sits outside the update-link container. Follow links and submit the forms below to compare what gets replaced."></textarea>

<main class="page-shell" data-flux="update-link">
	<header class="hero">
		<h1>Landing page</h1>
		<p>Example 04 focuses on link navigation. The large wrapper uses <code>data-flux="update-link"</code>, so it updates for Flux links but not for form submissions.</p>
		<nav class="link-row">
			<a href="./04-links.php" data-flux>Landing page</a>
			<a href="./04a-page1.php" data-flux>Page 1</a>
			<a href="./04b-page2.php" data-flux>Page 2</a>
		</nav>
	</header>

	<section class="card-grid">
		<article class="panel" data-flux="update-inner">
			<h1>Quick search</h1>
			<form method="get">
				<label>
					<span>Search term</span>
					<input name="q" value="<?php echo h($q);?>" placeholder="Try: flux link demo" />
				</label>
				<button data-flux="submit">Update card</button>
			</form>
			<p>Current query: <strong><?php echo h($q) ?: "Nothing entered yet";?></strong></p>
		</article>

		<article class="panel" data-flux="update-inner">
			<h1>Release note</h1>
			<form method="get">
				<label>
					<span>Internal note</span>
					<input name="note" value="<?php echo h($note);?>" placeholder="Ship the docs example" />
				</label>
				<button data-flux="submit">Save preview</button>
			</form>
			<blockquote><?php echo h($note) ?: "No note entered."; ?></blockquote>
		</article>

		<article class="panel" data-flux="update-inner">
			<h1>Filter</h1>
			<form method="get">
				<label>
					<span>Sort stories by</span>
					<select name="filter">
						<option value="recent"<?php echo $filter === "recent" ? " selected" : "";?>>Most recent</option>
						<option value="popular"<?php echo $filter === "popular" ? " selected" : "";?>>Most popular</option>
						<option value="brief"<?php echo $filter === "brief" ? " selected" : "";?>>Shortest read</option>
					</select>
				</label>
				<button data-flux="submit">Apply filter</button>
			</form>
			<p>Selected filter: <strong><?php echo h($filter);?></strong></p>
		</article>
	</section>

	<section class="story-grid">
		<article class="content-card">
			<h2>Warehouse dispatch</h2>
			<p>Morning checks are complete, labels are printed, and the next collection is due before lunch. The copy here is static filler to make link-driven page replacement more obvious.</p>
			<a href="./04a-page1.php" data-flux>Inspect the dispatch board</a>
		</article>

		<article class="content-card">
			<h2>Studio calendar</h2>
			<p>Three sessions are blocked for rehearsals, one for photography, and another for quiet editing. Use the links around the page to move between full documents.</p>
			<a href="./04b-page2.php" data-flux>Open the studio notes</a>
		</article>

		<article class="content-card">
			<h2>Routing memo</h2>
			<p>This example deliberately returns full HTML pages. Flux swaps the relevant target rather than requiring partial responses.</p>
			<a href="./04-links.php" data-flux>Reload this landing page via Flux</a>
		</article>
	</section>
</main>
