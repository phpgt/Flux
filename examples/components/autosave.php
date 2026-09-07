<section id="autosave-demo" class="demo" data-flux="flux-first-visible">
	<h2>Saving on change</h2><p><code>autosave</code> belongs on a button. Change the note and leave the field: Flux submits its form and hides the save button. The saved preview updates independently.</p>
	<form method="post" class="fields">
		<?php formFields('note'); ?>
		<label><span>Note</span><textarea name="note" maxlength="1000"><?= h($_SESSION['note'] ?? '') ?></textarea></label>
		<button name="do" value="save" data-flux="autosave" data-flux-rate="0.4">Save note</button>
	</form>
	<div id="saved-note" data-flux="update-inner" aria-live="polite"><h3>Saved in this session</h3><p><?= h($_SESSION['note'] ?? 'No note has been saved.') ?></p></div>
</section>
