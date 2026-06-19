<?php
/**
 * This example shows drag ordering across parent containers. The same form
 * moves a card within a column or into a different column.
 */
session_start();

$columns = [
	"todo" => "To do",
	"doing" => "Doing",
	"done" => "Done",
];
$defaultColumnOrder = array_keys($columns);
$cards = [
	1 => "Write the tests",
	2 => "Update the library",
	3 => "Create the example",
	4 => "Document the syntax",
];
$defaultBoard = [
	"todo" => [1, 2],
	"doing" => [3],
	"done" => [4],
];
$columns = $_SESSION["kanban-columns"] ?? $columns;
$columnOrder = $_SESSION["kanban-column-order"] ?? $defaultColumnOrder;
$cards = $_SESSION["kanban-cards"] ?? $cards;
$board = $_SESSION["kanban"] ?? $defaultBoard;

$columnOrder = array_values(array_filter(
	$columnOrder,
	fn($key) => isset($columns[$key]),
));
foreach(array_keys($columns) as $key) {
	if(!in_array($key, $columnOrder, true)) {
		$columnOrder[] = $key;
	}
}
foreach($columns as $key => $_) {
	$board[$key] ??= [];
	$board[$key] = array_values(array_filter(
		$board[$key],
		fn($id) => isset($cards[$id]),
	));
}

$knownCards = array_merge(...array_values($board));
if(array_diff(array_keys($cards), $knownCards) || array_diff($knownCards, array_keys($cards))) {
	$board = $defaultBoard;
}

$doAction = $_POST["do"] ?? null;
$id = filter_input(INPUT_POST, "id", FILTER_VALIDATE_INT);
$column = $_POST["column"] ?? null;
$parent = $_POST["parent"] ?? null;
$newOrder = filter_input(INPUT_POST, "order", FILTER_VALIDATE_INT);
$title = trim($_POST["title"] ?? "");

if($doAction === "move" && isset($cards[$id], $columns[$parent])) {
	foreach($board as &$items) {
		$index = array_search($id, $items, true);
		if($index !== false) {
			unset($items[$index]);
			$items = array_values($items);
		}
	}
	unset($items);

	$newOrder = max(0, min(count($board[$parent]), $newOrder ?? 0));
	array_splice($board[$parent], $newOrder, 0, [$id]);

	$_SESSION["kanban"] = $board;
	$_SESSION["kanban-cards"] = $cards;
	$_SESSION["kanban-columns"] = $columns;
	$_SESSION["kanban-column-order"] = $columnOrder;

	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
elseif($doAction === "save" && isset($columns[$parent])) {
	if($id && isset($cards[$id])) {
		if($title === "") {
			unset($cards[$id]);
			foreach($board as &$items) {
				$index = array_search($id, $items, true);
				if($index !== false) {
					unset($items[$index]);
					$items = array_values($items);
				}
			}
			unset($items);
		}
		else {
			$cards[$id] = $title;
		}
	}
	elseif($title !== "") {
		$id = empty($cards) ? 1 : max(array_keys($cards)) + 1;
		$cards[$id] = $title;
		$board[$parent][] = $id;
	}

	$_SESSION["kanban"] = $board;
	$_SESSION["kanban-cards"] = $cards;
	$_SESSION["kanban-columns"] = $columns;
	$_SESSION["kanban-column-order"] = $columnOrder;

	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
elseif($doAction === "move-list" && isset($columns[$column])) {
	$index = array_search($column, $columnOrder, true);
	if($index !== false) {
		unset($columnOrder[$index]);
		$columnOrder = array_values($columnOrder);
	}

	$newOrder = max(0, min(count($columnOrder), $newOrder ?? 0));
	array_splice($columnOrder, $newOrder, 0, [$column]);

	$_SESSION["kanban"] = $board;
	$_SESSION["kanban-cards"] = $cards;
	$_SESSION["kanban-columns"] = $columns;
	$_SESSION["kanban-column-order"] = $columnOrder;

	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
elseif($doAction === "save-list") {
	if($column && isset($columns[$column])) {
		$columns[$column] = $title;
	}
	elseif($title !== "") {
		$column = "column-" . (count($columns) + 1);
		while(isset($columns[$column])) {
			$column = "column-" . ((int)substr($column, 7) + 1);
		}

		$columns[$column] = $title;
		$columnOrder[] = $column;
		$board[$column] = [];
	}

	$_SESSION["kanban"] = $board;
	$_SESSION["kanban-cards"] = $cards;
	$_SESSION["kanban-columns"] = $columns;
	$_SESSION["kanban-column-order"] = $columnOrder;

	header("Location: $_SERVER[SCRIPT_NAME]");
	exit;
}
?><!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Example 07: Kanban</title>
	<link rel="stylesheet" href="/example/style.css?v=2" />
	<script type="module" src="/dist/flux.js?v=2" defer></script>
</head>
<body>

<main class="page-shell">
	<h1>Example 07: Kanban</h1>

	<div class="kanban-board" data-flux="update" data-flux-drag-parent="columns" data-flux-drag-handle="☰">
		<?php foreach($columnOrder as $parent) { ?>
		<section class="kanban-column" data-id="<?php echo $parent;?>" data-flux="drag-order">
			<form class="kanban-column-form" method="post" data-flux>
				<input type="hidden" name="column" value="<?php echo $parent;?>" />
				<input type="hidden" name="order" />
				<button name="do" value="move-list">Move list</button>

				<label>
					<input name="title" value="<?php echo htmlspecialchars($columns[$parent], ENT_QUOTES, "UTF-8");?>" />
					<button name="do" value="save-list" data-flux="autosave">Save</button>
				</label>
			</form>

			<ul class="kanban-list" data-flux-drag-parent="<?php echo $parent;?>" data-flux-drag-handle="☰">
				<?php foreach($board[$parent] as $id) { ?>
				<li class="kanban-card" data-id="<?php echo $id;?>" data-flux="drag-order">
					<form method="post" data-flux>
						<input type="hidden" name="id" value="<?php echo $id;?>" />
						<input type="hidden" name="parent" value="<?php echo $parent;?>" />
						<input type="hidden" name="order" />
						<button name="do" value="move">Move</button>

						<label>
							<input name="title" value="<?php echo htmlspecialchars($cards[$id], ENT_QUOTES, "UTF-8");?>" />
							<button name="do" value="save" data-flux="autosave">Save</button>
						</label>
					</form>
				</li>
				<?php } ?>

				<li class="kanban-card kanban-card-new">
					<form method="post" data-flux>
						<input type="hidden" name="parent" value="<?php echo $parent;?>" />

						<label>
							<input name="title" placeholder="New card" />
							<button name="do" value="save" data-flux="autosave">Save</button>
						</label>
					</form>
				</li>
			</ul>
		</section>
		<?php } ?>

		<section class="kanban-column kanban-column-new">
			<form class="kanban-column-form" method="post" data-flux>
				<label>
					<input name="title" placeholder="New list" />
					<button name="do" value="save-list" data-flux="autosave">Save</button>
				</label>
			</form>
		</section>
	</div>
</main>

</body>
</html>
