<section id="drag-order-demo" class="demo" data-flux="flux-first-visible">
	<h2>Drag-order: horizontal and vertical</h2>
	<p>Each item contains a form with an <code>order</code> input and a Move button. Adding <code>data-flux="drag-order"</code> to the item lets Flux set its position and submit the form when it is dropped. The list's <code>data-flux-drag-axis</code> restricts dragging to <code>x</code> or <code>y</code>.</p>
	<p>PHP saves the new order in the session, and each list's <code>update-inner</code> container receives the resulting HTML. The position controls remain usable without JavaScript, so both ways of ordering items use the same form fields and server action.</p>
	<?php foreach(['horizontal' => 'x', 'vertical' => 'y'] as $direction => $axis): $listName = 'order-' . $direction; ?>
	<div id="<?= $listName ?>" data-flux="update-inner">
		<h3><?= ucfirst($direction) ?></h3>
		<ul class="sortable-list order-list order-<?= $direction ?>" data-flux-drag-axis="<?= $axis ?>" data-flux-drag-handle="⠿">
		<?php foreach($_SESSION['lists'][$listName] as $position => $item): ?>
			<li data-id="<?= h($item['id']) ?>" data-flux="drag-order">
				<form method="post" class="drag-form">
					<?php formFields($listName); ?><input type="hidden" name="id" value="<?= h($item['id']) ?>" />
					<label><span>Position for <?= h($item['text']) ?> (from zero)</span><input type="number" name="order" min="0" max="<?= count($_SESSION['lists'][$listName]) - 1 ?>" value="<?= $position ?>" /><button name="do" value="move">Move</button></label>
				</form>
				<span class="item-text"><?= h($item['text']) ?></span>
			</li>
		<?php endforeach; ?>
		</ul>
	</div>
	<?php endforeach; ?>
</section>
