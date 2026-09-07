# Micro-framework for Fluid User Experience

Flux is a minimalist JavaScript library that's shipped by default with [WebEngine]. 

Flux gives server-rendered applications a _fluid user experience_ by handling navigation and form submissions in the background, preforming background updates to content within the page, and enriching CSS variables with live information from JavaScript.

All of Flux's functionality is done by adding `data-flux` attributes to the page, rather than writing JavaScript. 

[Read the documentation](https://www.php.gt/flux/).

## Behat browser tests

This repository includes Behat end-to-end tests for the examples in `example/`.

Install PHP dependencies with:

```bash
composer install
```

Run the suite locally with:

```bash
composer behat
```

Feature files live in `test/behat/*.feature`. The local wrapper at `test/behat/behat-bin` serves the repository root with the PHP built-in server, launches a local headless Chrome or Chromium instance, and then runs `vendor/bin/behat`.

Local requirements:

- PHP dependencies installed with `composer install`
- A local Chrome or Chromium binary available on `PATH`, or `CHROME_BIN` set explicitly

PhpStorm settings:

- Behat executable: `test/behat/phpstorm-behat-bin`
- Configuration file: `behat.yml`

Useful overrides:

- `CHROME_BIN=/path/to/chrome composer behat`
- `BEHAT_APP_PORT=8080 composer behat`
- `BEHAT_CHROME_PORT=9333 composer behat`

To enable Flux on an HTML form, add the `data-flux` attribute:

```html
<form method="post" data-flux>
	<label>
		<span>Your name</span>
		<input name="name" required />
	</label>
	<label>
		<span>Your email address</span>
		<input name="email" type="email" required />
	</label>
	<button name="do" value="submit">Submit</button>
</form>
```

When this form submits, Flux sends its POST data using a [background fetch][fetch]. By default, Flux then replaces the form with its counterpart in the returned HTML document. Other update behaviours can be configured.

Flux also supports polling-based live regions:

```html
<time data-flux="live">12:00:00</time>
<div data-flux="live-inner"><strong>Only this content is replaced.</strong></div>
```

`data-flux="live"` is shorthand for `data-flux="live-outer"`. If one or more live regions exist on the page, Flux performs a single background GET request every second against the current page URL and applies only the live updates from the returned HTML.

Flux can also turn a server-ordered form into a drag handle:

```html
<ul data-flux-drag-parent="todo" data-flux-drag-handle="Move card">
	<li data-flux="drag-order">
		<form method="post">
			<input type="hidden" name="id" value="1" />
			<input type="hidden" name="parent" value="todo" />
			<input type="number" name="order" />
			<button name="do" value="move">Move</button>
		</form>
		<span>Write the tests</span>
	</li>
</ul>
```

`order` is filled with the zero-based position before submit. When an optional `parent` input is present, Flux also fills it from the destination container's `data-flux-drag-parent` value, which allows Kanban-style moves while keeping the server-side action as a plain form submission.

Use `data-flux-drag-handle` on the draggable item or its parent container to change the generated handle text. If it is omitted, the handle text is `Drag`.

Drag ordering can be nested: the board can sort list containers, and each list can sort its own cards. Flux uses horizontal ordering when sortable siblings are laid out side by side and vertical ordering for normal lists.

## Design and scope

Flux is designed for **progressive enhancement**: server-rendered HTML, links, and forms provide the application's core functionality, and Flux adds background requests and page updates. Build the core interactions to work independently of JavaScript and CSS so they remain available when those enhancements are unavailable.

The following conventions and boundaries define how Flux works:

- Flux uses GET and POST for link navigation and form submissions.
- Page updates use HTML responses from the server. Links and forms trigger requests through user interaction, and live regions refresh automatically through polling.
- Fetched responses are expected to contain full HTML pages by default. Flux selects the relevant content from each response to update the current page.
- Application state is managed on the server. Flux does not provide a client-side state management system.
- Routing is handled by the server. Flux does not provide client-side routing.
- Live updates with `data-flux="live"` use regular GET requests with polling. WebSocket and Server-Sent Events are outside Flux's scope.

[WebEngine]: https://www.php.gt/webengine/
[fetch]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

# Proudly sponsored by

[JetBrains Open Source sponsorship program](https://www.jetbrains.com/community/opensource/)

[![JetBrains logo.](https://resources.jetbrains.com/storage/products/company/brand/logos/jetbrains.svg)](https://www.jetbrains.com/community/opensource/)
