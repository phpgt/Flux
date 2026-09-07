<section id="updates-demo" class="demo" data-flux="flux-first-visible">
	<h2>Update targets</h2><p>This button submits a normal POST. One target replaces its outer HTML, one its inner HTML, and one just its attributes.</p>
	<form method="post"><?php formFields('attributes'); ?><button name="do" value="toggle" data-flux="submit" data-flux-rate="0.3">Toggle emphasis</button></form>
	<div class="demo-grid">
		<p id="outer-update" data-flux="update-outer">Outer update: <strong><?= ($_SESSION['emphasis'] ?? false) ? 'on' : 'off' ?></strong></p>
		<p id="inner-update" data-flux="update-inner">Inner update: <strong><?= ($_SESSION['emphasis'] ?? false) ? 'on' : 'off' ?></strong></p>
		<p id="attribute-update" data-flux="update-attributes" class="attribute-preview <?= ($_SESSION['emphasis'] ?? false) ? 'emphasised' : '' ?>">This element receives attribute updates only.</p>
	</div>
	<p><code>update</code> is an alias for <code>update-outer</code>. Empty <code>data-flux</code> on a form, link or button is the shorthand for its automatic behaviour.</p>
</section>
