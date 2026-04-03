<!doctype html>
<html>
<head>
	<meta charset="utf=8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>PHP.GT/Flux</title>
	<link rel="stylesheet" href="/example/style.css" />
</head>
<body>

<nav>
	<ul>
		<?php foreach(glob(__DIR__ . "/*.php") as $path) {
			$fileName = pathinfo($path, PATHINFO_BASENAME);
			[$number] = explode("-", $fileName);
			if(!is_numeric($number)) {
				continue;
			}
		?>
		<li>
			<a target="frame" href="/example/<?php echo $fileName;?>"><?php echo $fileName;?></a>
		</li>
		<?php }?>
	</ul>
</nav>

<iframe name="frame"></iframe>

</body>
</html>
