<p>Flux is a progressive enhancement library that enhances server-side updates, and exposes client-side state to CSS. The library is built as part of the <a href="https://www.php.gt/" target="_blank">PHP.GT</a> project, intended to provide progressive enhancement by default in <a href="https://www.php.gt/webengine" target="_blank">WebEngine</a> projects. It can also be used independently, as these examples demonstrate.</p>
<p>This website uses plain HTML and a small amount of PHP, without a framework, to keep the example code straightforward to read.</p>
<p>The layout is an unthemed <a href="https://flair.brightflair.com/" target="_blank">Flair</a> layout, to make the plain HTML look a little more presentable, but without any distracting visuals.</p>
<p>Each example below is achieved by adding <code>data-flux</code> attributes to HTML elements using standard HTTP forms to POST their data to PHP or use CSS variables to present the data, where appropriate. No JavaScript was written for these examples to work.</p>

<?php foreach(['clock', 'search', 'counter', 'arrows', 'todo', 'gauge'] as $example) demo($example); ?>
<section class="next-steps"><h2>Further examples</h2><p>The feature pages contain further examples and their source code, including <a href="?page=forms">forms and lists</a> and <a href="?page=controls">CSS properties from input values</a>.</p></section>
