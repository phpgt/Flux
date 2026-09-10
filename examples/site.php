<?php
session_start();
require_once __DIR__ . "/cities.php";

$pages = [
	'home' => ['FLUX: Fluid User Experience', 'A progressive enhancement library'],
	'forms' => ['Forms and lists', 'Submit, save and reorder with ordinary server-rendered forms.'],
	'navigation' => ['Navigation and updates', 'Update selected elements from a full HTML response.'],
	'search' => ['Search', 'Preview results as you type, then follow a normal GET request.'],
	'time' => ['Time and date', 'Display local time, dates and calendar progress using CSS properties.'],
	'geometry' => ['Pointer and geometry', 'Read pointer coordinates, element dimensions and viewport visibility in CSS.'],
	'controls' => ['Controls and validation', 'Read native input values and validation state in CSS.'],
	'media' => ['Media palettes', 'Use colours sampled from images and video frames in CSS.'],
	'reference' => ['Feature index', 'A working example for every public directive and attribute.'],
];

function h(string|int $value): string {
	return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function input(array $values, string $name, string $default = ''): string {
	return isset($values[$name]) && is_string($values[$name]) ? $values[$name] : $default;
}

function pageUrl(string $name): string {
	return '?page=' . rawurlencode($name);
}

function demo(string $name): void {
	// Included templates use the current page and page catalogue.
	global $page, $pages;
	$templatePath = __DIR__ . '/components/' . $name . '.php';
	require $templatePath;
	?>
	<details class="source"><summary>View the HTML and PHP</summary><div class="disclosure-content">
		<p>This is the template used for the example above. <a href="?asset=site.css">Read the compiled CSS</a>, or find its Sass in <code>examples/style</code>.</p>
		<pre><code><?= h(file_get_contents($templatePath)) ?></code></pre>
		<?php if(in_array(basename($templatePath), ['todo.php', 'shopping.php'], true)): ?>
		<h3>The shared list template</h3><pre><code><?= h(file_get_contents(__DIR__ . '/components/list.php')) ?></code></pre>
		<?php endif; ?>
		<?php if(in_array(basename($templatePath), ['todo.php', 'shopping.php', 'board.php', 'counter.php', 'counters.php', 'drag-order.php', 'autosave.php', 'preferences.php', 'updates.php'], true)): ?>
		<details><summary>The server actions</summary><pre><code><?= h(file_get_contents(__FILE__)) ?></code></pre></details>
		<?php endif; ?>
	</div></details>
	<?php
}

function formFields(string $demo): void {
	?>
	<input type="hidden" name="demo" value="<?= h($demo) ?>" />
	<input type="hidden" name="token" value="<?= h($_SESSION['token']) ?>" />
	<?php
}

function handleSubmission(): void {
	$_SESSION['token'] ??= bin2hex(random_bytes(24));
	$_SESSION['lists'] ??= [
		'todo' => [
			['id' => 'plan', 'text' => 'Write the HTML', 'done' => false],
			['id' => 'try', 'text' => 'Add Flux attributes', 'done' => false],
			['id' => 'share', 'text' => 'Test the form', 'done' => false],
		],
		'shopping' => [
			['id' => 'bread', 'text' => 'Bread', 'done' => false],
			['id' => 'apples', 'text' => 'Apples', 'done' => false],
			['id' => 'coffee', 'text' => 'Coffee', 'done' => false],
			['id' => 'oats', 'text' => 'Oats', 'done' => false],
		],
	];
	$_SESSION['board'] ??= ['ready' => [['id' => 'build', 'text' => 'Build an example'], ['id' => 'test', 'text' => 'Test the example']], 'finished' => []];
	$_SESSION['board']['doing'] ??= [];
	foreach(['horizontal', 'vertical'] as $direction) {
		$_SESSION['lists']['order-' . $direction] ??= [
			['id' => 'first', 'text' => 'First'],
			['id' => 'second', 'text' => 'Second'],
			['id' => 'third', 'text' => 'Third'],
		];
	}
	if($_SERVER['REQUEST_METHOD'] !== 'POST') {
		session_write_close();
		return;
	}
	if(!hash_equals($_SESSION['token'], input($_POST, 'token'))) {
		http_response_code(403);
		exit('This form has expired. Reload the page and try again.');
	}
	$demo = input($_POST, 'demo');
	$action = input($_POST, 'do');
	if(isset($_SESSION['lists'][$demo])) {
		updateList($_SESSION['lists'][$demo], $action);
	}
	elseif($demo === 'board') {
		if($action === 'add') addCard();
		elseif($action === 'move') moveCard();
	}
	elseif($demo === 'single-counter' && in_array($action, ['minus', 'plus'], true)) {
		$_SESSION['single-counter'] = ($_SESSION['single-counter'] ?? 0) + ($action === 'minus' ? -1 : 1);
	}
	elseif($demo === 'counter') {
		$key = input($_POST, 'counter', 'a') === 'b' ? 'b' : 'a';
		$_SESSION['counters'][$key] = ($_SESSION['counters'][$key] ?? 0) + ($action === 'minus' ? -1 : 1);
	}
	elseif($demo === 'note') {
		$_SESSION['note'] = substr(input($_POST, 'note'), 0, 1000);
	}
	elseif($demo === 'attributes') {
		$_SESSION['emphasis'] = !($_SESSION['emphasis'] ?? false);
	}
	elseif($demo === 'preferences') {
		$_SESSION['display-name'] = substr(input($_POST, 'display-name'), 0, 24);
	}
	session_write_close();
	global $page;
	header('Location: ' . pageUrl($page), true, 303);
	exit;
}

function updateList(array &$items, string $action): void {
	$text = trim(input($_POST, 'item'));
	if($action === 'add' && $text !== '' && count($items) < 50) {
		$items[] = ['id' => bin2hex(random_bytes(6)), 'text' => substr($text, 0, 160), 'done' => false];
		return;
	}
	$id = input($_POST, 'id');
	foreach($items as $index => $item) {
		if($item['id'] !== $id) continue;
		if($action === 'toggle') $items[$index]['done'] = !$item['done'];
		if($action === 'delete') array_splice($items, $index, 1);
		if($action === 'move') {
			$position = filter_var(input($_POST, 'order'), FILTER_VALIDATE_INT);
			if($position === false) return;
			array_splice($items, $index, 1);
			array_splice($items, max(0, min(count($items), $position)), 0, [$item]);
		}
		return;
	}
}

function addCard(): void {
	$text = trim(input($_POST, 'item'));
	if($text === '') return;
	$_SESSION['board']['ready'][] = [
		'id' => bin2hex(random_bytes(6)),
		'text' => substr($text, 0, 160),
	];
}

function moveCard(): void {
	$destination = input($_POST, 'parent');
	$position = filter_var(input($_POST, 'order'), FILTER_VALIDATE_INT);
	if(!isset($_SESSION['board'][$destination]) || $position === false) return;
	foreach($_SESSION['board'] as $column => $items) {
		foreach($items as $index => $item) {
			if($item['id'] !== input($_POST, 'id')) continue;
			array_splice($_SESSION['board'][$column], $index, 1);
			$target = &$_SESSION['board'][$destination];
			array_splice($target, max(0, min(count($target), $position)), 0, [$item]);
			return;
		}
	}
}
