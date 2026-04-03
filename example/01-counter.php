<?php
/**
 * This is the simplest example. Two buttons are used to increment or
 * decrement a counter, stored in the session. The output element shows
 * the value of the counter.
 */
session_start();

$num = $_SESSION["num"];
$doAction = $_REQUEST["do"] ?? null;

if($doAction === "increment") {
	$num++;
	$_SESSION["num"] = $num;
	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
elseif($doAction === "decrement") {
	$num--;
	$_SESSION["num"] = $num;
	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
?><!doctype html>
<meta charset="utf-8" />
<title>PHP.GT/Flux example 01 increment</title>
<link rel="stylesheet" href="/example/style.css" />
<script type="module" src="/dist/flux.js" defer></script>

<textarea placeholder="Without Flux, submitting the form would lose any content typed into this box.">
</textarea>

<form method="post">
	<output data-flux="update-inner"><?php echo number_format($num);?></output>
	<button name="do" value="increment" data-flux="submit">Increment</button>
	<button name="do" value="decrement" data-flux="submit">Decrement</button>
</form>
