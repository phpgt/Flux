<?php
/**
 * This example is like 01-counter, but multiple forms are present on the
 * page that all update simultaneously. Two forms have independent counters,
 * and an <output> element shows the sum of the two counters.
 *
 * The `data-flux` attribute is added to the containing element, which updates
 * the outerHTML of the container, but hooks into the contained forms' submit
 * events.
 */
session_start();

$numA = $_SESSION["numA"];
$numB = $_SESSION["numB"];
$sum = $numA + $numB;

$doAction = $_REQUEST["do"] ?? null;
if($doAction === "incrementA") {
	$numA++;
	$_SESSION["numA"] = $numA;
	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
elseif($doAction === "incrementB") {
	$numB++;
	$_SESSION["numB"] = $numB;
	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
elseif($doAction === "decrementA") {
	$numA--;
	$_SESSION["numA"] = $numA;
	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
elseif($doAction === "decrementB") {
	$numB--;
	$_SESSION["numB"] = $numB;
	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}

?><!doctype html>
<meta charset="utf-8" />
<title>PHP.GT/Flux example 03 multiple forms</title>
<link rel="stylesheet" href="/example/style.css" />
<script type="module" src="/dist/flux.js" defer></script>

<textarea placeholder="Without Flux, submitting the form would lose any content typed into this box.">
</textarea>

<main>
	<form method="post" data-flux>
		<h1>Counter A</h1>
		<output data-flux="update" class="a"><?php echo number_format($numA);?></output>
		<button name="do" value="incrementA">Increment A</button>
		<button name="do" value="decrementA">Decrement A</button>
	</form>

	<form method="post" data-flux>
		<h1>Counter B</h1>
		<output data-flux="update" class="b"><?php echo number_format($numB);?></output>
		<button name="do" value="incrementB">Increment B</button>
		<button name="do" value="decrementB">Decrement B</button>
	</form>

	<h1>A + B =</h1>
	<output data-flux="update" class="ab"><?php echo $sum;?></output>
</main>
