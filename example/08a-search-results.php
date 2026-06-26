<?php
function h(?string $value): string {
	return htmlspecialchars($value ?? "", ENT_QUOTES, "UTF-8");
}

$query = trim($_GET["query"] ?? "");
$places = [
	"10 Downing Street, London, United Kingdom",
	"221B Baker Street, London, United Kingdom",
	"Abbey Road Studios, London, United Kingdom",
	"Amsterdam Centraal Station, Netherlands",
	"Auckland Harbour Bridge, New Zealand",
	"Banff Avenue, Alberta, Canada",
	"Barcelona Sants Station, Spain",
	"Beale Street, Memphis, United States",
	"Berlin Hauptbahnhof, Germany",
	"Bondi Beach, Sydney, Australia",
	"Brooklyn Bridge, New York, United States",
	"Buckingham Palace Road, London, United Kingdom",
	"Cambridge Market Square, United Kingdom",
	"Canal Street, Manchester, United Kingdom",
	"Cardiff Central Station, Wales",
	"Champs-Elysees, Paris, France",
	"Chicago Union Station, United States",
	"Christchurch Botanic Gardens, New Zealand",
	"Copenhagen Central Station, Denmark",
	"Dublin Connolly Station, Ireland",
	"Edinburgh Waverley Station, Scotland",
	"Fifth Avenue, New York, United States",
	"Flinders Street Station, Melbourne, Australia",
	"George Street, Sydney, Australia",
	"Grand Central Terminal, New York, United States",
	"Granville Street, Vancouver, Canada",
	"Helsinki Central Station, Finland",
	"High Street, Oxford, United Kingdom",
	"King Street, Toronto, Canada",
	"Kings Cross Station, London, United Kingdom",
	"La Rambla, Barcelona, Spain",
	"Liverpool Lime Street Station, United Kingdom",
	"Manchester Piccadilly Station, United Kingdom",
	"Market Street, San Francisco, United States",
	"Montreal Central Station, Canada",
	"New Street Station, Birmingham, United Kingdom",
	"Oslo Central Station, Norway",
	"Oxford Street, London, United Kingdom",
	"Princes Street, Edinburgh, Scotland",
	"Queen Street, Auckland, New Zealand",
	"Roma Termini Station, Italy",
	"Rue Sainte-Catherine, Montreal, Canada",
	"Shibuya Crossing, Tokyo, Japan",
	"Stockholm Central Station, Sweden",
	"Union Station, Toronto, Canada",
	"Victoria Street, London, United Kingdom",
	"Waterloo Station, London, United Kingdom",
	"Westminster Bridge Road, London, United Kingdom",
	"York Railway Station, United Kingdom",
	"Zurich Hauptbahnhof, Switzerland",
];

$matches = [];
if($query !== "") {
	foreach($places as $place) {
		if(stripos($place, $query) !== false) {
			$matches[] = $place;
		}
	}
}
?><!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PHP.GT/Flux example 08a search results</title>
<link rel="stylesheet" href="/example/style.css" />
<script type="module" src="/dist/flux.js" defer></script>

<main class="page-shell">
	<header class="hero">
		<h1>Search results</h1>
		<p>Results for <strong><?php echo h($query) ?: "nothing yet"; ?></strong></p>
		<nav class="link-row">
			<a href="/example/08-search.php">Back to search</a>
		</nav>
	</header>

	<section class="panel" data-flux="autocomplete-results" data-query="<?php echo h($query); ?>">
		<h2>Matched places</h2>
		<?php if($query === "") { ?>
		<p>Enter a search term to find a place.</p>
		<?php } elseif(count($matches) === 0) { ?>
		<p>No matches for <strong><?php echo h($query); ?></strong>.</p>
		<?php } else { ?>
		<ul>
			<?php foreach($matches as $place) { ?>
			<li>
				<a href="#<?php echo h(rawurlencode($place)); ?>" onclick="alert(<?php echo h(json_encode("You clicked " . $place, JSON_THROW_ON_ERROR)); ?>); return false;"><?php echo h($place); ?></a>
			</li>
			<?php } ?>
		</ul>
		<?php } ?>
	</section>
</main>
