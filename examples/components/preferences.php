<section id="preferences-demo" class="demo" data-flux="flux-first-visible">
	<h2>Input values and validation state</h2>
	<p>The control containers use <code>flux-select</code> and <code>flux-color</code> to expose their values as CSS variables. CSS uses <code>--flux-select</code> for the preview's column count, and a connection copies the colour to the separate preview. CSS mixes that colour with white for the background and inverts the background's RGB channels for the text.</p>
	<p>The name label uses <code>flux-field</code> to expose its remaining character count and editing state. The form uses <code>flux-form</code> to expose how many fields pass native validation. CSS uses those values for the labels and progress bar, so the feedback follows the HTML input constraints.</p>
	<p>The form also has <code>auto</code> to submit in the background. PHP saves the display name in the session, and the separate <code>update</code> target shows the saved value. The column and colour controls provide local previews.</p>
	<form id="preferences" method="post" class="fields" data-flux="auto flux-form">
		<?php formFields('preferences'); ?>
		<div data-flux="flux-select"><label class="field"><span>Preview columns</span><select name="columns"><option value="1">One</option><option value="2" selected>Two</option><option value="3">Three</option></select></label><div class="column-preview"><span>One</span><span>Two</span><span>Three</span></div></div>
		<div data-flux="flux-color (flux-color@#colour-preview)"><label class="field"><span>Preview colour</span><input type="color" name="colour" value="#555555" /></label></div>
		<label id="name-field" data-flux="flux-field"><span>Display name (3–24 letters or spaces)</span><input name="display-name" minlength="3" maxlength="24" pattern="[A-Za-z ]+" required value="<?= h($_SESSION['display-name'] ?? '') ?>" /><span class="field-budget" aria-hidden="true"></span><span class="field-state" aria-hidden="true"><span>Edited</span><span>Visited</span><span>Different from initial value</span></span></label>
		<div class="bar" aria-hidden="true"><span class="validity-progress"></span></div><p class="form-count" aria-hidden="true"></p>
		<div class="actions"><button name="do" value="save">Save preferences</button><button type="reset">Reset</button></div>
	</form>
	<aside id="colour-preview" class="colour-preview"><h3>Connected colour preview</h3><p>This preview receives the colour through <code>(flux-color@#colour-preview)</code>. The border uses the selected colour, the background uses a tint, and the text uses the inverse of that tint. The connection follows the form when it is replaced.</p></aside>
	<p>Saved name: <output id="saved-name" data-flux="update"><?= h($_SESSION['display-name'] ?? 'Not saved yet') ?></output></p>
</section>
