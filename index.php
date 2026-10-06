<?php
// Keep the same application root when the repository itself is served.
$_SERVER['DOCUMENT_ROOT'] = __DIR__ . '/examples';
chdir($_SERVER['DOCUMENT_ROOT']);
require $_SERVER['DOCUMENT_ROOT'] . '/index.php';
