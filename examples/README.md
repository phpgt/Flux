# The Flux website

An interactive guide built with PHP templates, Flair's default monochrome styles and Flux attributes. There is no application JavaScript: the only script loaded is the built Flux library.

## Run it

From the Flux repository root:

```sh
php -S localhost:8080
```

Visit <http://localhost:8080/>. The repository's `index.php` sets the application's document root and includes `examples/index.php`. PHP cannot reconfigure a running web server's actual document root, so page and asset URLs go through that entry point. No rewrite rules are needed.

To serve the website as its own web root, including on the live server:

```sh
php -S localhost:8080 -t examples
```

Serve the directory with PHP enabled. Pages use `?page=forms`, for example; assets use an allowlisted `?asset=site.css` URL. Both forms work at either root and when the website is mounted in a subdirectory. Session storage must be writable for the list examples.

## Build the styles

The website has its own npm package. The local `file:` dependency installs Flair as a symlink, so edits to Flair are picked up on the next Sass build:

```sh
npm install --prefix examples --install-links=false
npm run build
npm run build --prefix examples
```

The default Flair path resolves to `~/Code/BrightFlair/flair` in this checkout. For a different checkout layout, set the path locally:

```sh
cd examples
npm install --save --install-links=false /path/to/flair
npm run build
```

`npm run watch --prefix examples` watches the Sass. The build also copies `dist/flux.js` into the website assets; rebuild the library first after changing Flux. Built assets are checked in, so serving the site does not require npm or a Flair checkout.

## Structure

- `_header.html` and `_footer.html` provide every page's shared start and end.
- `pages/` composes feature pages from reusable `components/`.
- `site.php` provides escaping, session actions and the small page catalogue.
- `style/` binds Flair's layout, pattern and object placeholders to the site's markup, and defines the CSS demonstrations.
- `assets/` holds the compiled stylesheet, Flux bundle and local palette media.

The homepage begins with a clock that turns towards the pointer, followed by a session-backed to-do list, redlining radial gauge, five-step vertical range, shopping order and autocomplete search. Feature pages cover the remaining directives, including background updates, polling, calendar progress, validation, geometry, connections and palettes. The feature index links each directive to its working example.

The gauge uses a native range input: HTML does not define an `input type="meter"`. Pixel readouts use CSS counters, and labels use the range variable. The redline effect uses a CSS style query; the gauge remains readable in browsers without style-query support. Motion effects respect `prefers-reduced-motion`. Forms have ordinary server actions, and ordering also has keyboard buttons.

## Check it

From the repository root:

```sh
npm test
composer behat
BEHAT_APP_COMMAND='php -S 127.0.0.1:8099 -t examples' BEHAT_APP_PORT=8099 composer behat -- --format=progress test/behat/11-website.feature
```

The earlier demonstration pages now live under `test/fixtures/example/` to retain the existing regression coverage. They are not part of the published website.

## City search and dialogs

The search example reads 600 cities from `data/cities.json`. Names, ASCII names and country labels are searchable; the dataset and attribution are documented in `data/README.md`. No external search service is used.

Result links request a full PHP page containing the selected city in `components/city-dialog.php`. A shared `update-link-inner` region receives that dialog. The result links use `data-flux-scroll="preserve"` to keep the page position. Flux's `modal` directive opens it after insertion, with native modal focus and Escape behaviour. The Close button uses `method="dialog"`. With JavaScript disabled, a normal link navigation displays the server-rendered selection through the dialog's `open` attribute.
