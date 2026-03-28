export class NavigationController {
	constructor(
		parser = new DOMParser(),
		fetcher = globalThis.fetch.bind(globalThis),
		historyObject = globalThis.history,
		logger = console,
	) {
		this.parser = parser;
		this.fetcher = fetcher;
		this.historyObject = historyObject;
		this.logger = logger;
	}

	submitForm(form, formData, onDocument) {
		return this.navigate(
			form,
			form.action,
			{
				method: form.getAttribute("method"),
				credentials: "same-origin",
				body: formData,
			},
			{
				action: "submitForm",
				errorPrefix: "Form submission error",
			},
			onDocument,
		);
	}

	clickLink(link, onDocument) {
		return this.navigate(
			link,
			link.href,
			{
				credentials: "same-origin",
			},
			{
				action: "clickLink",
				errorPrefix: "Link fetch error",
			},
			onDocument,
		);
	}

	async navigate(element, url, requestOptions, historyState, onDocument) {
		element.classList.add("submitting");

		try {
			let response = await this.fetcher(url, requestOptions);
			if(!response.ok) {
				throw new Error(`${historyState.errorPrefix}: ${response.status} ${response.statusText}`);
			}

			this.historyObject.pushState({
				action: historyState.action,
			}, "", response.url);

			let html = await response.text();
			let document = this.parser.parseFromString(html, "text/html");
			onDocument(document);
			return document;
		}
		catch(error) {
			this.logger.error(error);
			return null;
		}
		finally {
			element.classList.remove("submitting");
		}
	}
}
