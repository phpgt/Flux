# A micro-framework for the client-side

Turbo is a minimalist JavaScript library that's shipped by default with [WebEngine]. Its purpose is to allow developers to build applications that follow basic HTTP principles, but gain the speed and usability of a single page application (SPA).

[Read the documentation](https://www.php.gt/turbo/).

To use Turbo, convert a "regular" HTML form into a _turbo form_ by adding the `data-turbo` attribute:

```html
<form method="post" data-turbo>
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

When the above form submits, because it has been marked with the `data-turbo` attribute, the default submit behaviour will be suppressed, and a [background fetch][fetch] will be emitted instead, submitting the POST data in the background. When the fetch completes, the default behaviour is to replace the form with the form's counterpart on the new HTML document (after submitting the page), but other behaviours can be configured.

## Limitations compared to other libraries

Turbo is designed as a **progressive enhancement** tool that encourages plain HTTP techniques. Your web applications should function fully even without any JavaScript or CSS, ensuring simplicity and accessibility. This approach simplifies development by focusing on straightforward, reliable techniques, making the entire development experience more manageable.

This design decision leads to several limitations compared to other libraries:

- GET and POST are the only methods available to you as a web developer. This library doesn't change that.
- Turbo is only triggered by actions like clicking a link or submitting a form. While forms can update in the background and elements can refresh automatically, all Turbo actions are powered by server-side responses tied to links or buttons, which can be hidden by Turbo for better usability.
- Fetched page responses are expected to be full-page responses by default. Partial page renders are not the norm and go against the principles of plain HTTP usage.
- State management is not included, as HTTP is a stateless protocol. Any state must be managed on the server side, similar to how it would be handled without client-side code.
- Client-side routing is not supported. Features like dynamic routes, code-splitting, or navigation guards must be handled entirely on the server.
- WebSocket and Server-Sent Events are not supported. Live updates with `data-turbo="live"` rely on regular GET requests with polling.

## The name "turbo" is used elsewhere!

There used to be a library called _TurboLinks_, which heavily inspired the development decisions of Turbo, but since its demise it was deemed appropriate to name this library in homage to that. Now plenty of JavaScript libraries are calling themselves "Turbo", but as this library isn't expected to be used outside the context of WebEngine development, the word turbo seems perfectly apt, as it takes the regular HTTP requests and responses and makes them faster, like a turbocharged engine.

[WebEngine]: https://www.php.gt/webengine/
[fetch]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

# Proudly sponsored by

[JetBrains Open Source sponsorship program](https://www.jetbrains.com/community/opensource/)

[![JetBrains logo.](https://resources.jetbrains.com/storage/products/company/brand/logos/jetbrains.svg)](https://www.jetbrains.com/community/opensource/)
