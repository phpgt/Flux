<?php
// An allowlist keeps asset URLs identical under either supported web root.
$assets = [
	'site.css' => 'text/css; charset=utf-8',
	'flux.js' => 'text/javascript; charset=utf-8',
	'palette.svg' => 'image/svg+xml',
	'palette.webm' => 'video/webm',
];
if(isset($_GET['asset'])) {
	$asset = is_string($_GET['asset']) ? $_GET['asset'] : '';
	if(!isset($assets[$asset])) {
		http_response_code(404);
		exit('Asset not found.');
	}
	header('Content-Type: ' . $assets[$asset]);
	header('X-Content-Type-Options: nosniff');
	readfile(__DIR__ . '/assets/' . $asset);
	exit;
}
require __DIR__ . '/site.php';
$page = input($_GET, 'page', 'home');
if(!isset($pages[$page])) {
	http_response_code(404);
	$page = 'not-found';
}
handleSubmission();
require __DIR__ . '/_header.html';
require __DIR__ . '/pages/' . $page . '.php';
require __DIR__ . '/_footer.html';
