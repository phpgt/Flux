<section id="preferences-demo" class="demo" data-flux="flux-first-visible">
	<h2>Input values and validation state</h2><p>Choose a column count and colour, then edit a name. The native form still validates, submits and resets as usual. Flux exposes the current control values and validity to CSS.</p>
	<form id="preferences" method="post" class="fields" data-flux="auto flux-form">
		<?php formFields('preferences'); ?>
		<div data-flux="flux-select"><label class="field"><span>Preview columns</span><select name="columns"><option value="1">One</option><option value="2" selected>Two</option><option value="3">Three</option></select></label><div class="column-preview"><span>One</span><span>Two</span><span>Three</span></div></div>
		<div data-flux="flux-color (flux-color@#colour-preview)"><label class="field"><span>Preview colour</span><input type="color" name="colour" value="#555555" /></label></div>
		<label id="name-field" data-flux="flux-field"><span>Display name (3–24 letters or spaces)</span><input name="display-name" minlength="3" maxlength="24" pattern="[A-Za-z ]+" required value="<?= h($_SESSION['display-name'] ?? '') ?>" /><span class="field-budget" aria-hidden="true"></span><span class="field-state" aria-hidden="true"><span>Edited</span><span>Visited</span><span>Different from initial value</span></span></label>
		<div class="bar" aria-hidden="true"><span class="validity-progress"></span></div><p class="form-count" aria-hidden="true"></p>
		<div class="actions"><button name="do" value="save">Save preferences</button><button type="reset">Reset</button></div>
	</form>
	<aside id="colour-preview" class="colour-preview"><h3>Connected colour preview</h3><p>This border receives the colour through <code>(flux-color@#colour-preview)</code>. The connection follows the form when it is replaced.</p></aside>
	<p>Saved name: <output id="saved-name" data-flux="update"><?= h($_SESSION['display-name'] ?? 'Not saved yet') ?></output></p>
</section>
