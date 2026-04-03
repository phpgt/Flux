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
		let method = (form.getAttribute("method") ?? "get").toLowerCase();
		let url = form.action;
		let requestOptions = {
			method,
			credentials: "same-origin",
		};

		if(method === "get") {
			url = this.appendFormDataToUrl(url, formData);
		}
		else {
			requestOptions.body = formData;
		}

		return this.navigate(
			form,
			url,
			requestOptions,
			{
				action: "submitForm",
				errorPrefix: "Form submission error",
			},
			onDocument,
		);
	}

	appendFormDataToUrl(url, formData) {
		let urlObject = new URL(url, globalThis.location?.href);
		let searchParams = new URLSearchParams(urlObject.search);

		for(let [key, value] of formData.entries()) {
			searchParams.append(key, value);
		}

		urlObject.search = searchParams.toString();
		return urlObject.toString();
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

	pollDocument(url, onDocument) {
		return this.requestDocument(
			url,
			{
				credentials: "same-origin",
			},
			{
				action: null,
				errorPrefix: "Live update error",
			},
			onDocument,
		);
	}

	async navigate(element, url, requestOptions, historyState, onDocument) {
		element.classList.add("submitting");

		try {
			return await this.requestDocument(url, requestOptions, historyState, onDocument);
		}
		catch(error) {
			return null;
		}
		finally {
			element.classList.remove("submitting");
		}
	}

	async requestDocument(url, requestOptions, historyState, onDocument) {
		let method = (requestOptions.method ?? "get").toLowerCase();
		try {
			let absoluteUrl = new URL(url, globalThis.location?.href).toString();
			let response = await this.fetcher(absoluteUrl, {
				...requestOptions,
				method,
			});
			if(!response.ok) {
				throw new Error(`${historyState.errorPrefix}: ${response.status} ${response.statusText}`);
			}

			let html = await response.text();
			let document = this.parser.parseFromString(html, "text/html");
			if(historyState.action) {
				this.historyObject.pushState({
					action: historyState.action,
				}, "", response.url);
			}

			onDocument(document);
			return document;
		}
		catch(error) {
			this.logger.error(error);
			return null;
		}
	}
}
