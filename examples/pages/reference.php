<section class="demo" data-flux="flux-first-visible">
	<h2>Directives and examples</h2><p>The table links each public directive to an example. Combine directives with spaces; use parentheses to connect values to other elements.</p>
	<div class="table-scroll" role="region" aria-label="Flux feature examples" tabindex="0"><table><thead><tr><th scope="col">Feature</th><th scope="col">Working example</th></tr></thead><tbody>
	<?php $features = [
		'auto; empty data-flux on forms' => ['forms', 'counters-demo', 'Independent forms and a shared total'],
		'submit; empty data-flux on buttons' => ['forms', 'todo-demo', 'Session-backed to-do list'],
		'autocomplete; autocomplete-results; data-flux-min-length' => ['forms', 'search-demo', 'Search previews and normal GET results'],
		'data-flux-drag-parent; data-flux-drag-handle' => ['forms', 'board-demo', 'Move cards between lists'],
		'modal' => ['search', 'search-demo', 'Server-rendered city selection'],
		'autosave' => ['forms', 'autosave-demo', 'A note saved on change'],
		'drag-order; data-flux-drag-axis' => ['forms', 'drag-order-demo', 'Horizontal and vertical ordering'],
		'link; empty data-flux on links' => ['navigation', 'navigation-demo', 'Chapter navigation and browser history'],
		'update-link; update-link-inner' => ['navigation', 'navigation-demo', 'Link-only replacement targets'],
		'update; update-outer; update-inner; update-attributes' => ['navigation', 'updates-demo', 'Three scopes of server updates'],
		'live; live-outer; live-inner' => ['time', 'polling-demo', 'Server HTML on a timer'],
		'data-flux-rate; data-flux-scroll' => ['navigation', 'navigation-demo', 'Request throttling, polling and scroll restoration'],
		'flux-time; flux-date' => ['time', 'clock-demo', 'A clock and calendar progress'],
		'flux-pointer; flux-pointer-global' => ['geometry', 'pointer-demo', 'Local and viewport positions, scalars and pixels'],
		'flux-size; flux-truncated' => ['geometry', 'geometry-demo', 'Resizing and clipping'],
		'flux-visible; flux-first-visible' => ['geometry', 'geometry-demo', 'Intersection and entry history'],
		'flux-range' => ['controls', 'gauge-demo', 'Radial gauge and five-step vertical range'],
		'flux-select; flux-color' => ['controls', 'preferences-demo', 'Grid columns and connected colour'],
		'flux-field; flux-form' => ['controls', 'preferences-demo', 'Validation, character budgets and edit history'],
		'flux-palette (image)' => ['media', 'image-palette-demo', 'Image palette and shadow'],
		'flux-palette (video)' => ['media', 'video-palette-demo', 'Video palette and shadow'],
		'Multiple directives and connections' => ['geometry', 'pointer-demo', 'Two sources connected to a smaller preview'],
	]; foreach($features as $feature => [$destination, $anchor, $label]): ?>
		<tr><th scope="row"><code><?= h($feature) ?></code></th><td><a href="<?= pageUrl($destination) ?>#<?= $anchor ?>"><?= h($label) ?></a></td></tr>
	<?php endforeach; ?>
	</tbody></table></div>
	<h3>Matching responses</h3><p>Give update targets stable IDs when you can. Flux can also match by DOM position, so responses should keep a consistent structure. The server returns complete HTML documents.</p>
	<h3>Basic setup</h3><pre><code>&lt;script type="module" src="/flux.js"&gt;&lt;/script&gt;
&lt;form method="post" data-flux&gt;
    &lt;button name="do" value="save"&gt;Save&lt;/button&gt;
&lt;/form&gt;</code></pre>
	<p><a href="https://github.com/PhpGt/Flux/wiki/List-of-flux-attributes">Read the full attribute reference</a> for defaults and lifecycle details.</p>
</section>
