<?php
$now = new DateTimeImmutable("now");
?>
<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Example 05: Live clock</title>
	<link rel="stylesheet" href="/example/style.css" />
	<script type="module" src="/dist/flux.js"></script>
</head>
<body>

<main class="page-shell" data-flux="update">
	<h1>Example 05: Live clock</h1>
	<p>This page uses <code>data-flux="live"</code> to poll the current page every second and replace the clock element with fresh HTML.</p>

	<section class="panel">
		<h2>Server time</h2>
		<time
			class="counter"
			data-flux="live"
			datetime="<?php echo $now->format(DateTimeInterface::ATOM);?>"
		><?php echo $now->format("H:i:s");?></time>
	</section>
	<p>The clock is rendered on the server. Flux keeps refreshing this element in the background.</p>

	<section class="panel">
		<h2>Manual refresh inside the page shell</h2>
		<p>Click this button to manually update the clock within this form.</p>
		<form method="post">
			<p>
				Current form time:
				<output><?php echo $now->format("H:i:s");?></output>
			</p>
			<button data-flux="submit">Update clock in form</button>
		</form>
	</section>
</main>

</body>
</html>
