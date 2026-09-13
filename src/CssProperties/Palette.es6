function hex(channels) {
	return "#" + channels.map(channel => Math.round(channel).toString(16).padStart(2, "0")).join("");
}

function brightness([red, green, blue]) { return (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255; }

/** Extracts representative colours from a small RGBA sample. No DOM work belongs here. */
export function extractPalette(pixels) {
	let buckets = new Map();
	let total = [0, 0, 0];
	let count = 0;
	for(let offset = 0; offset < pixels.length; offset += 4) {
		if(pixels[offset + 3] < 128) continue;
		let colour = [...pixels.slice(offset, offset + 3)];
		let key = colour.map(channel => Math.floor(channel / 16)).join(",");
		let bucket = buckets.get(key) ?? {count: 0, sum: [0, 0, 0]};
		bucket.count++;
		for(let channel = 0; channel < 3; channel++) {
			bucket.sum[channel] += colour[channel];
			total[channel] += colour[channel];
		}
		buckets.set(key, bucket);
		count++;
	}
	if(!count) return null;
	let colours = [...buckets.values()].map(bucket => ({
		count: bucket.count,
		channels: bucket.sum.map(channel => channel / bucket.count),
	}));
	let dominant = colours.reduce((best, colour) => colour.count > best.count ? colour : best);
	let darkest = null;
	let lightest = null;
	let accent = dominant;
	let greatestChroma = 0;
	for(let colour of colours) {
		let light = brightness(colour.channels);
		let chroma = Math.max(...colour.channels) - Math.min(...colour.channels);
		if(chroma > greatestChroma) { greatestChroma = chroma; accent = colour; }
		if(light > 0.04 && (!darkest || light < brightness(darkest.channels))) darkest = colour;
		if(light < 0.96 && (!lightest || light > brightness(lightest.channels))) lightest = colour;
	}
	let average = total.map(channel => channel / count);
	return {
		"": hex(dominant.channels),
		accent: hex(accent.channels),
		dark: hex((darkest ?? dominant).channels),
		light: hex((lightest ?? dominant).channels),
		average: hex(average),
		temp: (average[0] - average[2]) / 255,
	};
}
