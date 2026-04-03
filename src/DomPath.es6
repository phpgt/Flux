export class DomPath {
	static getXPathForElement(element, context) {
		let xpath = "";
		if(context instanceof Document) {
			context = context.documentElement;
		}
		if(!context) {
			context = element.ownerDocument.documentElement;
		}

		while(element !== context) {
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
