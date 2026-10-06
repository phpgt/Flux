<section id="updates-demo" class="demo" data-flux="flux-first-visible">
	<h2>Update targets</h2>
	<p>The button below is contained within an HTML form and has the <code>data-flux="submit"</code> attribute, which causes the POST to be submitted in the background. The POST causes PHP to toggle a session value and then re-renders the page on the server.</p>
	<p>Each output target has an ID and a directive that determines what Flux copies from the response: <code>update-outer</code> replaces the element, <code>update-inner</code> replaces its contents, and <code>update-attributes</code> copies only its attributes. The last output target only receives attribute updates, and with that, changes emphasis through its class.</p>
	<form method="post"><?php formFields('attributes'); ?><button name="do" value="toggle" data-flux="submit" data-flux-rate="0.3">Toggle emphasis</button></form>
	<div class="demo-grid">
		<p id="outer-update" data-flux="update-outer">Outer update: <strong><?= ($_SESSION['emphasis'] ?? false) ? 'on' : 'off' ?></strong></p>
		<p id="inner-update" data-flux="update-inner">Inner update: <strong><?= ($_SESSION['emphasis'] ?? false) ? 'on' : 'off' ?></strong></p>
		<p id="attribute-update" data-flux="update-attributes" class="attribute-preview <?= ($_SESSION['emphasis'] ?? false) ? 'emphasised' : '' ?>">This element receives attribute updates only.</p>
	</div>
	<p><code>update</code> is an alias for <code>update-outer</code>. Empty <code>data-flux</code> on a form, link or button is the shorthand for its automatic behaviour.</p>
</section>
