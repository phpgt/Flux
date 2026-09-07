<section id="polling-demo" class="demo" data-flux="flux-first-visible">
	<h2>Polling for server updates</h2><p>These are server-rendered times. <code>live</code> replaces the element, and <code>live-inner</code> replaces its contents. <code>data-flux-rate="5"</code> asks for an update every five seconds.</p>
	<div class="demo-grid"><p>Outer: <time id="server-outer" data-flux="live" data-flux-rate="5" datetime="<?= date(DATE_ATOM) ?>"><?= date('H:i:s') ?></time></p><p>Inner: <span id="server-inner" data-flux="live-inner" data-flux-rate="5"><time><?= date('H:i:s') ?></time></span></p><p>Explicit outer alias: <time id="server-alias" data-flux="live-outer" data-flux-rate="5"><?= date('H:i:s') ?></time></p></div>
</section>
