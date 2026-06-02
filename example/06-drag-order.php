<?php
/**
 * This example shows a list whose order is stored in the session. The form
 * submits with plain HTTP to move each item to a numbered position in the list.
 */
session_start();

$items = [
	1 => "one",
	2 => "two",
	3 => "three",
	4 => "four",
	5 => "five",
	6 => "six",
	7 => "seven",
	8 => "eight",
	9 => "nine",
	10 => "ten",
];
$defaultOrder = array_keys($items);
$order = $_SESSION["drag-order"] ?? $defaultOrder;

if(array_diff($defaultOrder, $order) || array_diff($order, $defaultOrder)) {
	$order = $defaultOrder;
}

$doAction = $_POST["do"] ?? null;
$id = filter_input(INPUT_POST, "id", FILTER_VALIDATE_INT);
$newOrder = filter_input(INPUT_POST, "order", FILTER_VALIDATE_INT);

if($doAction === "move" && isset($items[$id])) {
	$index = array_search($id, $order, true);

	unset($order[$index]);
	$order = array_values($order);

	$newOrder = max(1, min(count($items), $newOrder ?: 1));
	array_splice($order, $newOrder - 1, 0, [$id]);

	$_SESSION["drag-order"] = $order;

	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
?><!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Example 06: Drag order</title>
	<link rel="stylesheet" href="/example/style.css?v=2" />
	<script type="module" src="/dist/flux.js?v=2" defer></script>
</head>
<body>

<main class="page-shell">
	<h1>Example 06: Drag order</h1>

	<ul class="drag-drop" data-flux="update">
		<?php foreach($order as $id) { ?>
		<li data-id="<?php echo $id;?>">
			<form method="post" data-flux="drag-order">
				<input type="hidden" name="id" value="<?php echo $id;?>" />

				<label>
					<span>Move to order</span>
					<input type="number" name="order" />
					<button name="do" value="move">Move</button>
				</label>
			</form>

			<span><?php echo htmlspecialchars($items[$id], ENT_QUOTES, "UTF-8");?></span>
		</li>
		<?php } ?>
	</ul>
</main>

</body>
</html>
