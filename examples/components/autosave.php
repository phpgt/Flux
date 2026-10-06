<section id="autosave-demo" class="demo" data-flux="flux-first-visible">
	<h2>Saving on change</h2>
	<p>The Save button has <code>data-flux="autosave"</code>. Flux hides the button and submits its form on a <code>change</code> event, which for this textarea happens when you edit the note and leave the field.</p>
	<p>PHP stores the note in the session. The preview has <code>data-flux="update-inner"</code>, so Flux replaces its contents from the returned page. Without JavaScript, the Save button submits the same form.</p>
	<form method="post" class="fields">
		<?php formFields('note'); ?>
		<label><span>Note</span><textarea name="note" maxlength="1000"><?= h($_SESSION['note'] ?? '') ?></textarea></label>
		<button name="do" value="save" data-flux="autosave" data-flux-rate="0.4">Save note</button>
	</form>
	<div id="saved-note" data-flux="update-inner" aria-live="polite"><h3>Saved in this session</h3><p><?= h($_SESSION['note'] ?? 'No note has been saved.') ?></p></div>
</section>
