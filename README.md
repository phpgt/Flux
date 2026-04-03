# Fluid user experience micro-framework

Flux is a minimalist JavaScript library that's shipped by default with [WebEngine]. 

Its purpose is to give server-rendered applications a _fluid user experience_: instead of every link click and form submission causing a harsh full-page refresh, navigation and updates feel continuous, more like an SPA where the user never really leaves the page.

The difference is that your application still uses the same straightforward server-rendered code, so it stays readable and predictable, while Flux adds the client-side layer for smooth updates without requiring you to write any JavaScript yourself.

[Read the documentation](https://www.php.gt/flux/).

## Behat browser tests

This repository includes Behat end-to-end tests for the examples in `example/`.

Install PHP dependencies with:

```bash
composer install
```

To run the suite in a container setup that matches the GitHub Action, use the `php-actions/behat` checkout:

```bash
cd ~/Code/php-actions/behat
GITHUB_ACTOR=local \
GITHUB_REPOSITORY=PhpGt/Flux \
GITHUB_WORKSPACE=~/Code/PhpGt/Flux \
ACTION_TOKEN=dummy \
ACTION_VERSION=latest \
ACTION_PHP_VERSION=8.5 \
ACTION_BEHAT_PATH=vendor/bin/behat \
ACTION_APP_COMMAND='php -d display_errors=0 -S 0.0.0.0:8000 -t /app' \
bash <(curl -s https://raw.githubusercontent.com/php-actions/php-build/v2/php-build.bash) behat
```

Then execute the action script:

```bash
cd ~/Code/php-actions/behat
GITHUB_ACTOR=local \
GITHUB_REPOSITORY=PhpGt/Flux \
GITHUB_WORKSPACE=~/Code/PhpGt/Flux \
ACTION_TOKEN=dummy \
ACTION_VERSION=latest \
ACTION_PHP_VERSION=8.5 \
ACTION_BEHAT_PATH=vendor/bin/behat \
ACTION_APP_COMMAND='php -d display_errors=0 -S 0.0.0.0:8000 -t /app' \
./behat-action.bash
```

Feature files live in `test/behat/*.feature`. The action starts a temporary PHP app container and a headless Chrome container on the host network, then rewrites the Behat config at runtime so the browser and test runner both use `127.0.0.1`.

To use Flux, convert a "regular" HTML form into a _flux form_ by adding the `data-flux` attribute:

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

When the above form submits, because it has been marked with the `data-flux` attribute, the default submit behaviour will be suppressed, and a [background fetch][fetch] will be emitted instead, submitting the POST data in the background. When the fetch completes, the default behaviour is to replace the form with the form's counterpart on the new HTML document (after submitting the page), but other behaviours can be configured.

## Limitations compared to other libraries

Flux is designed as a **progressive enhancement** tool that encourages plain HTTP techniques. Your web applications should function fully even without any JavaScript or CSS, ensuring simplicity and accessibility. This approach simplifies development by focusing on straightforward, reliable techniques, making the entire development experience more manageable.

This design decision leads to several limitations compared to other libraries:

- GET and POST are the only methods available to you as a web developer. This library doesn't change that.
- Flux is only triggered by actions like clicking a link or submitting a form. While forms can update in the background and elements can refresh automatically, all Flux actions are powered by server-side responses tied to links or buttons, which can be hidden by Flux for better usability.
- Fetched page responses are expected to be full-page responses by default. Partial page renders are not the norm and go against the principles of plain HTTP usage.
- State management is not included, as HTTP is a stateless protocol. Any state must be managed on the server side, similar to how it would be handled without client-side code.
- Client-side routing is not supported. Features like dynamic routes, code-splitting, or navigation guards must be handled entirely on the server.
- WebSocket and Server-Sent Events are not supported. Live updates with `data-flux="live"` rely on regular GET requests with polling.

[WebEngine]: https://www.php.gt/webengine/
[fetch]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

# Proudly sponsored by

[JetBrains Open Source sponsorship program](https://www.jetbrains.com/community/opensource/)

[![JetBrains logo.](https://resources.jetbrains.com/storage/products/company/brand/logos/jetbrains.svg)](https://www.jetbrains.com/community/opensource/)
