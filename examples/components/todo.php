<section id="todo-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy">
		<h2>To-do list</h2>
		<p>Each <code>&lt;li&gt;</code> contains forms for changing its position, completion and removal. Adding <code>data-flux="drag-order"</code> to the item lets Flux fill in and submit its <code>order</code> input when it is dropped. The list's <code>data-flux-drag-handle="⠿"</code> attribute supplies the handle text.</p>
		<p>PHP saves the items, their completion and their order in the session. The list container uses <code>data-flux="update-inner"</code> to replace its contents from the returned page after a submission. Without JavaScript, the position input and Move button remain available.</p>
		<p>Add a task, mark it as complete, or drag its handle to change the order.</p>
	</div>
	<div><?php $listName = 'todo'; require __DIR__ . '/list.php'; ?></div>
</section>
