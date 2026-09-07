<section id="board-demo" class="demo" data-flux="flux-first-visible">
	<h2>Moving items between lists</h2><p>A <code>parent</code> input lets the same ordering form move cards between lists. Destination lists declare <code>data-flux-drag-parent</code>; <code>data-flux-drag-handle</code> supplies the handle text.</p>
	<div id="board" class="demo-grid" data-flux="update-inner">
	<?php foreach(['ready' => 'Ready', 'finished' => 'Finished'] as $column => $title): ?>
		<div><h3><?= $title ?></h3><ul class="sortable-list board-column" data-flux-drag-parent="<?= $column ?>" data-flux-drag-handle="⠿">
		<?php foreach($_SESSION['board'][$column] as $position => $item): ?>
			<li data-id="<?= h($item['id']) ?>">
				<form method="post" data-flux="drag-order">
					<?php formFields('board'); ?><input type="hidden" name="id" value="<?= h($item['id']) ?>" />
					<label><span>Destination</span><input name="parent" value="<?= $column ?>" /></label>
					<label><span>Position (from zero)</span><input type="number" name="order" min="0" value="<?= $position ?>" /><button name="do" value="move">Move</button></label>
				</form>
				<span class="item-text"><?= h($item['text']) ?></span>
				<form method="post"><?php formFields('board'); ?><input type="hidden" name="id" value="<?= h($item['id']) ?>" /><input type="hidden" name="parent" value="<?= $column === 'ready' ? 'finished' : 'ready' ?>" /><input type="hidden" name="order" value="0" /><button name="do" value="move" data-flux="submit">Move to <?= $column === 'ready' ? 'Finished' : 'Ready' ?></button></form>
			</li>
		<?php endforeach; ?>
		</ul></div>
	<?php endforeach; ?>
	</div>
</section>
