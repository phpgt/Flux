<section id="polling-demo" class="demo" data-flux="flux-first-visible">
	<h2>Polling for server updates</h2>
	<p>PHP renders each time when the page is requested. The elements use <code>data-flux="live"</code> or <code>data-flux="live-inner"</code> with <code>data-flux-rate="5"</code> to request updates every five seconds.</p>
	<p>Flux finds the matching IDs in the returned HTML. <code>live</code> replaces the whole element, including its attributes; <code>live-inner</code> replaces only its contents. <code>live-outer</code> is an explicit alias for <code>live</code>. This reuses the page's PHP rendering to show changing server data without a separate polling endpoint.</p>
	<div class="demo-grid"><p>Outer: <time id="server-outer" data-flux="live" data-flux-rate="5" datetime="<?= date(DATE_ATOM) ?>"><?= date('H:i:s') ?></time></p><p>Inner: <span id="server-inner" data-flux="live-inner" data-flux-rate="5"><time><?= date('H:i:s') ?></time></span></p><p>Explicit outer alias: <time id="server-alias" data-flux="live-outer" data-flux-rate="5"><?= date('H:i:s') ?></time></p></div>
</section>
