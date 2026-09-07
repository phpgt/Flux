<section id="todo-demo" class="demo split" data-flux="flux-first-visible">
	<div class="demo-copy"><h2>To-do list</h2>
		<p>This form submits to the server as usual. Flux makes the submission in the background and updates the list in place. PHP saves the items, their completion and their order in your session.</p>
		<p>Add a task, mark it as complete, or drag its handle to change the order.</p>
	</div>
	<div><?php $listName = 'todo'; require __DIR__ . '/list.php'; ?></div>
</section>
