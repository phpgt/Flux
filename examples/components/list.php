<div id="<?= h($listName) ?>-list" class="list-demo" data-flux="update-inner">
	<ul class="sortable-list" data-flux-drag-handle="⠿"<?= $listName === 'todo' ? ' data-flux-drag-axis="y"' : '' ?>>
	<?php foreach($_SESSION['lists'][$listName] as $position => $item): ?>
		<li data-id="<?= h($item['id']) ?>" data-flux="drag-order" class="<?= $item['done'] ? 'complete' : '' ?>">
			<form method="post" class="drag-form">
				<?php formFields($listName); ?>
				<input type="hidden" name="id" value="<?= h($item['id']) ?>" />
				<label><span>Position for <?= h($item['text']) ?> (from zero)</span><input type="number" name="order" min="0" max="<?= count($_SESSION['lists'][$listName]) - 1 ?>" value="<?= $position ?>" /><button name="do" value="move">Move</button></label>
			</form>
			<span class="item-text"><?= h($item['text']) ?></span>
			<div class="item-actions">
				<?php if($listName === 'todo'): ?>
				<form method="post"><?php formFields($listName); ?><input type="hidden" name="id" value="<?= h($item['id']) ?>" /><button name="do" value="toggle" data-flux="submit" aria-label="<?= h(($item['done'] ? 'Reopen ' : 'Complete ') . $item['text']) ?>"><?= $item['done'] ? '↶' : '✓' ?></button></form>
				<?php endif; ?>
				<form method="post"><?php formFields($listName); ?><input type="hidden" name="id" value="<?= h($item['id']) ?>" /><button name="do" value="delete" data-flux="submit" aria-label="Delete <?= h($item['text']) ?>">×</button></form>
			</div>
		</li>
	<?php endforeach; ?>
	</ul>
	<?php if(!$_SESSION['lists'][$listName]): ?><p>The list is empty. Use the form below to add an item.</p><?php endif; ?>
	<form method="post" class="fields">
		<?php formFields($listName); ?>
		<label><span><?= $listName === 'todo' ? 'New task' : 'Shopping item' ?></span><input name="item" required maxlength="160" autocomplete="off" /></label>
		<button name="do" value="add" data-flux>Add <?= $listName === 'todo' ? 'task' : 'item' ?></button>
	</form>
</div>
