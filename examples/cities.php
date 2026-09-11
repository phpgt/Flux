<?php
/** Local search data; no external requests are made while serving the example. */
function cities(): array {
	static $cities;
	return $cities ??= json_decode(file_get_contents(__DIR__ . '/data/cities.json'), true, flags: JSON_THROW_ON_ERROR);
}

function matchingCities(string $query): array {
	$query = trim($query);
	if($query === '') return [];
	return array_values(array_filter(cities(), static fn(array $city): bool =>
		stripos($city['name'] . ' ' . $city['ascii'] . ' ' . $city['country'], $query) !== false
	));
}

function selectedCity(string $id): ?array {
	foreach(cities() as $city) {
		if($city['id'] === $id) return $city;
	}
	return null;
}

function cityUrl(string $id, string $query, string $returnPage): string {
	return '?' . http_build_query(['page' => $returnPage, 'q' => $query, 'city' => $id]);
}
