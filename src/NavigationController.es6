export class NavigationController {
	constructor(
		parser = new DOMParser(),
		fetcher = globalThis.fetch.bind(globalThis),
		historyObject = globalThis.history,
		logger = console,
		scheduler = globalThis.setTimeout.bind(globalThis),
		clearScheduler = globalThis.clearTimeout.bind(globalThis),
		now = () => Date.now(),
		minRequestIntervalMs = 1000,
	) {
		this.parser = parser;
		this.fetcher = fetcher;
		this.historyObject = historyObject;
		this.logger = logger;
		this.scheduler = scheduler;
		this.clearScheduler = clearScheduler;
		this.now = now;
		this.minRequestIntervalMs = minRequestIntervalMs;
		this.lastRequestTimestamp = -Infinity;
		this.inFlight = false;
		this.pendingRequest = null;
		this.pendingTimerId = null;
		this.responseCache = new Map();
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
		let request = this.createRequest(url, requestOptions, historyState, onDocument);
		let cachedDocument = this.getFreshCachedDocument(request);
		if(cachedDocument) {
			this.applyResponse(cachedDocument, request.historyState, request.onDocument);
			return cachedDocument.document;
		}

		if(this.canStartRequest()) {
			return this.executeRequest(request);
		}

		return this.queueRequest(request);
	}

	createRequest(url, requestOptions, historyState, onDocument) {
		let method = (requestOptions.method ?? "get").toLowerCase();
		let absoluteUrl = new URL(url, globalThis.location?.href).toString();
		let requestKey = `${method}:${absoluteUrl}:${this.serialiseRequestBody(requestOptions.body)}`;

		return {
			url: absoluteUrl,
			requestOptions: {
				...requestOptions,
				method,
			},
			historyState,
			onDocument,
			requestKey,
		};
	}

	serialiseRequestBody(body) {
		if(!body) {
			return "";
		}

		if(body instanceof FormData) {
			let searchParams = new URLSearchParams();
			for(let [key, value] of body.entries()) {
				searchParams.append(key, typeof value === "string" ? value : value.name);
			}

			return searchParams.toString();
		}

		if(body instanceof URLSearchParams) {
			return body.toString();
		}

		if(typeof body === "string") {
			return body;
		}

		return String(body);
	}

	canStartRequest() {
		return !this.inFlight && this.now() - this.lastRequestTimestamp >= this.minRequestIntervalMs;
	}

	queueRequest(request) {
		return new Promise(resolve => {
			if(this.pendingRequest) {
				this.pendingRequest.resolve(null);
			}

			this.pendingRequest = {
				...request,
				resolve,
			};
			this.schedulePendingRequest();
		});
	}

	schedulePendingRequest() {
		if(this.pendingTimerId !== null || !this.pendingRequest) {
			return;
		}

		this.pendingTimerId = this.scheduler(() => {
			this.pendingTimerId = null;
			this.flushPendingRequest();
		}, this.getPendingDelay());
	}

	getPendingDelay() {
		if(this.inFlight) {
			return 50;
		}

		return Math.max(0, this.minRequestIntervalMs - (this.now() - this.lastRequestTimestamp));
	}

	flushPendingRequest() {
		if(!this.pendingRequest) {
			return;
		}

		let cachedDocument = this.getFreshCachedDocument(this.pendingRequest);
		if(cachedDocument) {
			let pendingRequest = this.pendingRequest;
			this.pendingRequest = null;
			this.applyResponse(cachedDocument, pendingRequest.historyState, pendingRequest.onDocument);
			pendingRequest.resolve(cachedDocument.document);
			return;
		}

		if(!this.canStartRequest()) {
			this.schedulePendingRequest();
			return;
		}

		let pendingRequest = this.pendingRequest;
		this.pendingRequest = null;
		this.executeRequest(pendingRequest).then(pendingRequest.resolve);
	}

	getFreshCachedDocument(request) {
		let cachedResponse = this.responseCache.get(request.requestKey);
		if(!cachedResponse) {
			return null;
		}

		if(this.now() - cachedResponse.timestamp >= this.minRequestIntervalMs) {
			this.responseCache.delete(request.requestKey);
			return null;
		}

		return {
			document: this.parser.parseFromString(cachedResponse.html, "text/html"),
			responseUrl: cachedResponse.responseUrl,
		};
	}

	cacheResponse(request, response, html) {
		this.responseCache.set(request.requestKey, {
			html,
			responseUrl: response.url,
			timestamp: this.now(),
		});
	}

	applyResponse(responseDocument, historyState, onDocument) {
		if(historyState.action) {
			this.historyObject.pushState({
				action: historyState.action,
			}, "", responseDocument.responseUrl);
		}

		onDocument(responseDocument.document);
	}

	async executeRequest(request) {
		this.inFlight = true;
		this.lastRequestTimestamp = this.now();

		try {
			let response = await this.fetcher(request.url, request.requestOptions);
			if(!response.ok) {
				throw new Error(`${request.historyState.errorPrefix}: ${response.status} ${response.statusText}`);
			}

			let html = await response.text();
			this.cacheResponse(request, response, html);
			let document = this.parser.parseFromString(html, "text/html");
			this.applyResponse({
				document,
				responseUrl: response.url,
			}, request.historyState, request.onDocument);
			return document;
		}
		catch(error) {
			this.logger.error(error);
			return null;
		}
		finally {
			this.inFlight = false;
			this.schedulePendingRequest();
		}
	}
}
