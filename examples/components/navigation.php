<section id="navigation-demo" class="demo" data-flux="flux-first-visible">
	<h2>Link navigation</h2><p>The links request a complete page. Only the link targets below change. The scratchpad contents are retained, and browser Back and Forward follow the visited URLs.</p>
	<label class="field"><span>Your scratchpad</span><textarea placeholder="Enter text here, then follow the chapter links."></textarea></label>
	<div class="chapter" id="chapter-outer" data-flux="update-link" data-flux-scroll="smooth">
		<nav class="chapter-nav" aria-label="Example chapters"><ul><li><a href="?page=navigation&amp;chapter=one" data-flux="link" data-flux-rate="0.3">Chapter one</a></li><li><a href="?page=navigation&amp;chapter=two" data-flux>Chapter two</a></li></ul></nav>
		<h3><?= input($_GET, 'chapter') === 'two' ? 'Chapter two: CSS properties' : 'Chapter one: HTML requests' ?></h3>
		<p><?= input($_GET, 'chapter') === 'two' ? 'CSS can use live values to draw, position and animate elements.' : 'A form submits to the server. A link requests the next document. Flux can make these requests in the background.' ?></p>
	</div>
	<div id="chapter-inner" data-flux="update-link-inner"><p>This inner link target is also on chapter <strong><?= input($_GET, 'chapter') === 'two' ? 'two' : 'one' ?></strong>.</p></div>
	<p><code>data-flux-scroll="smooth"</code> on the page restores scroll smoothly during navigation. Use <code>auto</code> for an immediate restoration.</p>
</section>
