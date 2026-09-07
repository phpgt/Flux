<?php
function escapeValue(string $value):string {
	return htmlspecialchars($value, ENT_QUOTES, "UTF-8");
}
$name = (string)($_POST["name"] ?? "");
$volume = (string)($_POST["volume"] ?? "35");
$columns = (string)($_POST["columns"] ?? "2");
$colour = (string)($_POST["colour"] ?? "#326c85");
?>
<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Example 10: CSS control properties</title>
	<link rel="stylesheet" href="/example/style.css" />
	<link rel="stylesheet" href="/example/css-properties.css" />
	<script type="module" src="/dist/flux.js"></script>
</head>
<body>
<main class="page-shell">
	<h1>CSS control properties</h1>
	<p>These native controls supply values to the surrounding CSS. We can still submit and reset the form using the usual buttons.</p>
	<p><a href="/example/">All examples</a> · <a href="09-css-geometry.php">Geometry</a> · <a href="11-css-palette.php">Media palettes</a></p>
	<form id="preferences" class="panel" method="post" data-flux="auto flux-form">
		<p id="saved-message"><?php echo $_SERVER["REQUEST_METHOD"] === "POST" ? "Your preferences have been received." : "Try changing the preferences below."; ?></p>
		<label id="range-control" data-flux="flux-range">
			<span>Volume</span>
			<input name="volume" type="range" min="0" max="100" value="<?php echo escapeValue($volume); ?>" />
			<span class="meter" aria-hidden="true"><span class="range-progress"></span></span>
		</label>
		<div id="select-control" data-flux="flux-select">
			<label><span>Preview columns</span><select name="columns">
				<?php foreach([1, 2, 3] as $count): ?><option value="<?php echo $count; ?>" <?php echo $columns === (string)$count ? "selected" : ""; ?>><?php echo $count; ?> columns</option><?php endforeach; ?>
			</select></label>
			<div class="column-preview"><span>One</span><span>Two</span><span>Three</span></div>
		</div>
		<div id="colour-control" data-flux="flux-color (flux-color@#colour-preview)">
			<label><span>Accent colour</span><input name="colour" type="color" value="<?php echo escapeValue($colour); ?>" /></label>
		</div>
		<label id="name-control" data-flux="flux-field">
			<span>Display name</span>
			<input id="display-name" name="name" required minlength="3" maxlength="24" pattern="[A-Za-z ]+" value="<?php echo escapeValue($name); ?>" aria-describedby="name-guidance" />
			<small id="name-guidance">Use 3–24 letters or spaces.</small>
			<span class="meter" aria-hidden="true"><span class="field-progress"></span></span>
			<small class="field-budget" aria-hidden="true"></small>
			<small class="field-history">The outline appears after editing and stays if we restore the original text.</small>
		</label>
		<p>Form validity</p>
		<div class="meter" aria-hidden="true"><span class="form-progress"></span></div>
		<p class="form-count" aria-hidden="true"></p>
		<button name="do" value="save">Save preferences</button>
		<button type="reset">Reset preferences</button>
	</form>
	<aside id="colour-preview" class="panel colour-preview">
		<h2>Connected colour preview</h2>
		<p>This region receives the colour from the form. The connection is restored when the server replaces that form.</p>
	</aside>
</main>
</body>
</html>
