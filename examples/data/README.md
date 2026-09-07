# City search data

`cities.json` contains 600 populated places selected from [GeoNames cities15000](https://download.geonames.org/export/dump/), downloaded on 7 September 2026. Country and territory labels come from GeoNames `countryInfo.txt`.

The selection includes the two most populous eligible places in each country or territory represented in the source, then fills the remaining places by population. Only populated-place and administrative-seat feature codes are included. It stores the GeoNames ID, name, ASCII name for searches without accents, country label and time zone. Population was used for selection and is not included in this fixture.

GeoNames data is provided under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). This is a filtered snapshot for demonstrating search, not a complete or current city register. The source data has been reduced to the fields and records described above. Search results include attribution.

The website reads this file locally. It does not call GeoNames or any other external service when searching or selecting a city.
