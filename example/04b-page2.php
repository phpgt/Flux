<?php
function h(?string $value): string {
	return htmlspecialchars($value ?? "", ENT_QUOTES, "UTF-8");
}

$headline = $_GET["headline"] ?? "";
$owner = $_GET["owner"] ?? "";
$tone = $_GET["tone"] ?? "plain";
?><!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PHP.GT/Flux example 04b page 2</title>
<link rel="stylesheet" href="/example/style.css" />
<script type="module" src="/dist/flux.js" defer></script>

<textarea class="scratchpad" placeholder="This textarea remains outside the link-only update target."></textarea>

<main class="page-shell" data-flux="update-link">
	<header class="hero">
		<h1>Page 2: Editorial notes</h1>
		<p>This page mixes placeholder articles with a few tiny forms. Submit them to update a card; follow the links to swap the whole wrapper.</p>
		<nav class="link-row">
			<a href="./04-links.php" data-flux>Landing page</a>
			<a href="./04a-page1.php" data-flux>Page 1</a>
			<a href="./04b-page2.php" data-flux>Page 2</a>
		</nav>
	</header>

	<section class="grid">
		<article class="panel" data-flux="update-inner">
			<h2>Headline draft</h2>
			<form method="get">
				<label>
					<span>Headline</span>
					<input name="headline" value="<?php echo h($headline);?>" placeholder="Quiet launch for the link-only demo" />
				</label>
				<button data-flux="submit">Refresh draft</button>
			</form>
			<p>Current draft: <strong><?php echo h($headline) ?: "No headline drafted";?></strong></p>
		</article>

		<article class="panel" data-flux="update-inner">
			<h2>Owner</h2>
			<form method="get">
				<label>
					<span>Editor</span>
					<input name="owner" value="<?php echo h($owner);?>" placeholder="Morgan" />
				</label>
				<label>
					<span>Tone</span>
					<select name="tone">
						<option value="plain"<?php echo $tone === "plain" ? " selected" : "";?>>Plain</option>
						<option value="warm"<?php echo $tone === "warm" ? " selected" : "";?>>Warm</option>
						<option value="formal"<?php echo $tone === "formal" ? " selected" : "";?>>Formal</option>
					</select>
				</label>
				<button data-flux="submit">Save owner</button>
			</form>
			<p>Editor: <strong><?php echo h($owner) ?: "Unassigned";?></strong></p>
			<p>Tone: <strong><?php echo h($tone);?></strong></p>
		</article>

		<article class="article">
			<h2>Placeholder copy</h2>
			<p>The afternoon brief references a soft product launch, an internal pilot, and a small audience test. There is no real backend state here; the page exists to exercise Flux link navigation against full HTML documents.</p>
			<p><a href="./04a-page1.php" data-flux>View the dispatch board again.</a></p>
		</article>

		<article class="article">
			<h2>Reading list</h2>
			<p>Draft structure, trim duplicated paragraphs, shorten the opening sentence, and check whether the side notes belong in the appendix.</p>
			<p><a href="./04-links.php" data-flux>Return to the landing page.</a></p>
		</article>
	</section>
</main>
