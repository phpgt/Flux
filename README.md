# Micro-framework for Fluid User Experience

Flux is a minimalist JavaScript library that's shipped by default with [WebEngine]. 

Flux gives server-rendered applications a _fluid user experience_ by handling navigation and form submissions in the background, performing background updates to content within the page, and enriching CSS variables with live information from JavaScript.

All of Flux's functionality is done by adding `data-flux` attributes to the page, rather than writing JavaScript. 

[Read the documentation](https://www.php.gt/flux/).

## Behat browser tests

This repository includes Behat end-to-end tests for the website in `examples/` and regression fixtures in `test/fixtures/example/`.

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

Use `data-flux-drag-axis="y"` or `data-flux-drag-axis="x"` on the draggable item or its container to constrain dragging vertically or horizontally within its original container. The generated handle uses the corresponding directional cursor.

Drag ordering can be nested: the board can sort list containers, and each list can sort its own cards. Flux uses horizontal ordering when sortable siblings are laid out side by side and vertical ordering for normal lists.

## CSS properties

Combine directives with spaces to expose browser state to your stylesheet:

```html
<label data-flux="flux-field">
	<span>Short description</span>
	<textarea name="description" maxlength="200"></textarea>
	<span class="remaining" aria-hidden="true"></span>
</label>
```

```css
.remaining::after {
	counter-reset: characters var(--flux-field-remaining, 200);
	content: counter(characters) " characters remaining";
}
```

CSS sources cover local and viewport pointer positions, element size, visibility and first appearance, range/select/colour controls, field history, form validity, image/video palettes, content truncation, and local time/date. Numeric values have no unit suffix, ready for `calc()`.

Pointer sources also expose `--flux-pointer-x-raw-px` and `--flux-pointer-y-raw-px` (or `--flux-pointer-global-x-raw-px` and `--flux-pointer-global-y-raw-px`). These retain coordinates outside the element or viewport, while the existing scalar and pixel properties stay clamped. Combine the local raw coordinates with `flux-size` and CSS `atan2()` to point an arrow towards the pointer.

Use `auto` to combine background form submission with CSS sources: `<form data-flux="auto flux-form">`. Connections share a source's properties with other regions:

```html
<section data-flux="flux-visible (flux-pointer,flux-size@footer > .preview, #summary)">
	<p>This element supplies the measurements.</p>
</section>
```

Flux batches measurements and changed CSS writes, shares observers, and pauses expensive work while neither a source nor its connected destinations are visible.

See the [CSS property reference](https://github.com/PhpGt/Flux/wiki/CSS-properties), or try the [geometry](examples/pages/geometry.php), [control](examples/pages/controls.php), [palette](examples/pages/media.php), and [clock](examples/pages/time.php) examples.

`flux-time` supplies seconds, minutes, and twelve-hour values, plus scalars for positioning clock hands. `flux-date` supplies calendar numbers, localised day/month names, and year/month/week/day progress. They share a timer that updates once a second and pauses off-screen. See the [time and date reference](https://github.com/PhpGt/Flux/wiki/Time-and-date).

### Scroll position

`flux-scroll` measures the declaring element’s own scroll area. On `<body>` or `<html>` it measures the document’s scrolling element, making page offsets available through CSS inheritance.

| Directive | CSS properties | Meaning |
| --- | --- | --- |
| `flux-scroll` | `--flux-scroll-x`, `--flux-scroll-y` | Scroll offset divided by the available scroll range, clamped to 0–1. Zero when that axis has no scroll range. |
| `flux-scroll` | `--flux-scroll-x-px`, `--flux-scroll-y-px` | Native signed scroll offsets in unitless CSS pixels, retaining fractional pixels. |
| `flux-scroll-progress` | `--flux-scroll-progress-x`, `--flux-scroll-progress-y` | Unclamped passage through the nearest ancestor scrollport on each axis, falling back to the page viewport. |

```html
<body data-flux="flux-scroll">
  <div class="reading-progress"></div>
  <article data-flux="flux-scroll-progress">
    <div class="illustration">Scroll to reveal this story.</div>
  </article>
</body>
```

```css
.reading-progress {
  position: fixed;
  inset: 0 0 auto;
  height: 4px;
  background: currentColor;
  transform-origin: left;
  transform: scaleX(var(--flux-scroll-y, 0));
}
.illustration {
  opacity: clamp(0.2, var(--flux-scroll-progress-y, 0), 1);
}
```

`--flux-scroll-progress-x-inverse` and `--flux-scroll-progress-y-inverse` expose **1 − progress**, without clamping. The vertical inverse is greater than 1 before entry from below, 1 at entry, between 1 and 0 during passage, 0 at exit, and negative after leaving above. A zero-length passage has forward progress 0 and inverse progress 1. Both values are included in CSS connections.

`flux-scroll-progress` also supplies `--flux-scroll-midway-x` and `--flux-scroll-midway-y`: **1 − abs(2 × progress − 1)**. Midway is negative outside the scrollport, 0 at entry, 0.5 at quarter passage, 1 at centre alignment, 0.5 at three-quarter passage, and 0 at exit. It is unclamped below zero and included in CSS connections. A zero-length passage returns midway 0.

For vertical passage, **0** is when the element’s top edge reaches the scrollport’s bottom edge. **1** is when its bottom edge reaches the scrollport’s top edge. Halfway is when their centres align. Values are negative before entry and greater than one after exit, including while the element is off-screen. Horizontal passage enters from the right and exits through the left. This works for elements taller or wider than their scrollport too.

Passage uses `(scrollport end − element start) / (scrollport size + element size)`, accounting for container borders and scrollbar space. An ancestor with `overflow: auto`, `scroll`, or `hidden` establishes the scrollport even before its content overflows; `overflow: clip` does not. Nested scrollports are measured independently of whether an outer ancestor currently clips them. These are physical X/Y coordinates, rather than writing-mode-relative axes. RTL/reversed scroll offsets retain their native negative pixel values while their scalar measures progress from the scroll origin to the opposite end.

Use `(flux-scroll@#meter)` or `(flux-scroll-progress@#meter)` to copy measurements to another element. Properties are refreshed on scroll, viewport and observed container/content resizes, DOM changes, and media loads. Updates are batched per animation frame and suspend while the tab is hidden. There is no continuous animation loop: CSS-only movement or transforms need another measurement event. Passage measures the current bounding rectangle; animate a child if you want to avoid changing the measured element’s own geometry. A zero-length passage returns zero.

The `data-flux-scroll` attribute still controls navigation scroll restoration; it is separate from these CSS source directives. Try both [interactive scroll examples](examples/pages/scroll.php), including a connected meter that stays visible before and after the measured element passes through a nested scroll area.

## Development

Run `npm test` for unit and integration tests, `npm run build` to rebuild `dist/flux.js`, and `composer behat` for real-browser examples. See [CONTRIBUTING.md](CONTRIBUTING.md) for component responsibilities and testing guidance.

The [browser profiling guide](test/profile/README.md) covers CPU activity, tab visibility and retained memory during repeated updates.

## Design and scope

Flux is designed for **progressive enhancement**: server-rendered HTML, links, and forms provide the application's core functionality, and Flux adds background requests and page updates. Build the core interactions to work independently of JavaScript and CSS so they remain available when those enhancements are unavailable.

The following conventions and boundaries define how Flux works:

- Flux uses GET and POST for link navigation and form submissions.
- Page updates use HTML responses from the server. Links and forms trigger requests through user interaction, and live regions refresh automatically through polling.
- Fetched responses are expected to contain full HTML pages by default. Flux selects the relevant content from each response to update the current page.
- Application data is managed on the server. Flux tracks local interaction history and measurements for its CSS properties.
- Routing is handled by the server. Flux does not provide client-side routing.
- Live updates with `data-flux="live"` use regular GET requests with polling. WebSocket and Server-Sent Events are outside Flux's scope.

[WebEngine]: https://www.php.gt/webengine/
[fetch]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

# Proudly sponsored by

[JetBrains Open Source sponsorship program](https://www.jetbrains.com/community/opensource/)

[![JetBrains logo.](https://resources.jetbrains.com/storage/products/company/brand/logos/jetbrains.svg)](https://www.jetbrains.com/community/opensource/)

## Interactive website

Run `php -S localhost:8080` from this repository and visit [localhost:8080](http://localhost:8080/). The site uses PHP, Flair's default styling and Flux attributes, with feature pages and source disclosures for the examples.

You can also serve `examples/` directly as the web root. See [the website README](examples/README.md) for the local Flair symlink, stylesheet build and deployment details.
