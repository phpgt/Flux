<?php
function h(?string $value): string {
	return htmlspecialchars($value ?? "", ENT_QUOTES, "UTF-8");
}

$assignee = $_GET["assignee"] ?? "";
$status = $_GET["status"] ?? "queued";
$tag = $_GET["tag"] ?? "";
?><!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PHP.GT/Flux example 04a page 1</title>
<link rel="stylesheet" href="/example/style.css" />
<script type="module" src="/dist/flux.js" defer></script>

<textarea class="scratchpad" placeholder="Type here, then move between Page 1 and Page 2 using the Flux links below."></textarea>

<main class="page-shell" data-flux="update-link">
	<header class="hero">
		<h1>Page 1: Dispatch board</h1>
		<p>Everything inside this wrapper swaps on Flux link navigation. The small forms below only update their own panels.</p>
		<nav class="link-row">
			<a href="./04-links.php" data-flux>Landing page</a>
			<a href="./04a-page1.php" data-flux>Page 1</a>
			<a href="./04b-page2.php" data-flux>Page 2</a>
		</nav>
	</header>

	<section class="columns">
		<div class="panel" data-flux="update-inner">
			<h2>Assignment</h2>
			<form method="get">
				<label>
					<span>Assigned to</span>
					<input name="assignee" value="<?php echo h($assignee);?>" placeholder="Casey" />
				</label>
				<label>
					<span>Status</span>
					<select name="status">
						<option value="queued"<?php echo $status === "queued" ? " selected" : "";?>>Queued</option>
						<option value="packed"<?php echo $status === "packed" ? " selected" : "";?>>Packed</option>
						<option value="dispatched"<?php echo $status === "dispatched" ? " selected" : "";?>>Dispatched</option>
					</select>
				</label>
				<button data-flux="submit">Update assignment</button>
			</form>
			<p>Assignee: <strong><?php echo h($assignee) ?: "Unassigned";?></strong></p>
			<p>Status: <strong><?php echo h($status);?></strong></p>
		</div>

		<aside class="panel" data-flux="update-inner">
			<h2>Tag</h2>
			<form method="get">
				<label>
					<span>Highlight tag</span>
					<input name="tag" value="<?php echo h($tag);?>" placeholder="fragile" />
				</label>
				<button data-flux="submit">Apply tag</button>
			</form>
			<p>Current tag: <strong><?php echo h($tag) ?: "none";?></strong></p>
		</aside>
	</section>

	<section class="log">
		<h2>Activity log</h2>
		<p>08:10 crates scanned into bay three.</p>
		<p>08:45 courier route adjusted after bridge closure.</p>
		<p>09:05 packaging queue split into express and standard lanes.</p>
		<p>09:20 replacement labels printed for two damaged cartons.</p>
		<p><a href="./04b-page2.php" data-flux>Jump to Page 2 for editorial notes.</a></p>
	</section>
</main>
