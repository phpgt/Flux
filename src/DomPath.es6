/**
 * Finds matching DOM nodes across the current document and response document.
 * Flux uses these simple XPath helpers when an update target has no
 * id and must be matched by position instead.
 */
export class DomPath {
	static getXPathForElement(element, context) {
		if(!element) {
			return null;
		}

		let xpath = "";
		if(context instanceof Document) {
			context = context.documentElement;
		}
		if(!context) {
			context = element.ownerDocument?.documentElement;
		}
		if(!context) {
			return null;
		}

		while(element && element !== context) {
			let pos = 0;
			let sibling = element;
			while(sibling) {
				if(sibling.nodeName === element.nodeName) {
					pos += 1;
				}
				sibling = sibling.previousElementSibling;
			}

			xpath = `./${element.nodeName}[${pos}]/${xpath}`;
			element = element.parentElement;
		}

		if(element !== context) {
			return null;
		}

		return xpath.replace(/\/$/, "");
	}

	static findInDocument(document, path) {
		return this.find(document, document.documentElement, path);
	}

	static findInContext(context, path) {
		if(!path) {
			return null;
		}

		return this.find(context.ownerDocument, context, path);
	}

	static find(document, context, path) {
		if(!path) {
			return null;
		}

		return document.evaluate(
			path,
			context,
			null,
			XPathResult.FIRST_ORDERED_NODE_TYPE,
			null,
		).singleNodeValue;
	}
}
