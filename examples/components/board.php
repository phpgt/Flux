<section id="board-demo" class="demo" data-flux="flux-first-visible">
	<h2>Kanban board</h2>
	<p>Each card has a form with <code>parent</code> and <code>order</code> inputs. Adding <code>data-flux="drag-order"</code> lets Flux fill them in when a card is dropped. Each destination list supplies its identifier through <code>data-flux-drag-parent</code>, and <code>data-flux-drag-handle</code> supplies the handle text.</p>
	<p>PHP moves the card to the submitted column and position in the session. The board's <code>data-flux="update-inner"</code> replaces its contents from the response, so dragging uses the same server action as the destination and position controls available without JavaScript.</p>
	<form id="board-add-task" method="post" class="fields" data-flux="auto">
		<?php formFields('board'); ?>
		<label><span>New Kanban task</span><input name="item" required maxlength="160" pattern=".*\S.*" autocomplete="off" /></label>
		<button name="do" value="add">Add task to Ready</button>
	</form>
	<div id="board" class="kanban-grid" data-flux="update-inner">
	<?php foreach(['ready' => 'Ready', 'doing' => 'In progress', 'finished' => 'Finished'] as $column => $title): ?>
		<div><h3><?= $title ?></h3><ul class="sortable-list board-column" data-flux-drag-parent="<?= $column ?>" data-flux-drag-handle="⠿">
		<?php foreach($_SESSION['board'][$column] as $position => $item): ?>
			<li data-id="<?= h($item['id']) ?>">
				<form method="post" data-flux="drag-order">
					<?php formFields('board'); ?><input type="hidden" name="id" value="<?= h($item['id']) ?>" />
					<label><span>Destination</span><input name="parent" value="<?= $column ?>" /></label>
					<label><span>Position (from zero)</span><input type="number" name="order" min="0" value="<?= $position ?>" /><button name="do" value="move">Move</button></label>
				</form>
				<span class="item-text"><?= h($item['text']) ?></span>
				<form method="post"><?php formFields('board'); ?><input type="hidden" name="id" value="<?= h($item['id']) ?>" /><input type="hidden" name="parent" value="<?= ['ready' => 'doing', 'doing' => 'finished', 'finished' => 'ready'][$column] ?>" /><input type="hidden" name="order" value="0" /><button name="do" value="move" data-flux="submit">Move to <?= ['ready' => 'In progress', 'doing' => 'Finished', 'finished' => 'Ready'][$column] ?></button></form>
			</li>
		<?php endforeach; ?>
		</ul></div>
	<?php endforeach; ?>
	</div>
</section>
