<?php
/**
 * This example shows a dynamic list. Type some text in the input box and press
 * enter, and that text will be added as a list item. Click the item in the list
 * to remove it.
 *
 * Due to how simple the HTML is, the page is already fast, so Flux's effects
 * aren't obvious - however, there's a textarea on the page to prove that the
 * page state isn't reset when the form is submitted: type some content into the
 * textarea, and it will remain while the example is interacted with.
 *
 * For a more visually obvious example, check out XX-fancy-list.
 */
session_start();

$list = $_SESSION["list"] ?? [];
$doAction = $_REQUEST["do"] ?? null;

if($doAction === "add") {
	array_push($list, $_POST["new-item"]);
	$_SESSION["list"] = $list;
	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
elseif($doAction === "delete") {
	$index = $_REQUEST["index"] ?? 0;

	if(isset($list[$index])) {
		unset($list[$index]);
		$_SESSION["list"] = array_values($list);
	}
	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}

?><!doctype html>
<meta charset="utf-8" />
<title>PHP.GT/Flux example 02 list</title>
<link rel="stylesheet" href="/example/style.css" />
<script type="module" src="/dist/flux.js" defer></script>

<textarea placeholder="Without Flux, submitting the form would lose any content typed into this box.">
</textarea>

<form method="post" data-flux="update-inner">
	<ul>
		<?php
		foreach($list as $i => $item) {
			echo "<li>";
			echo "<a href='?do=delete&index=$i' data-flux='link'>";
			echo $item;
			echo "</a>";
			echo "</li>";
		}
		?>
	</ul>

	<label>
		<span>New list item</span>
		<input name="new-item" required autofocus autocomplete="off" />
	</label>

	<button name="do" value="add" data-flux="submit">Add</button>
</form>
