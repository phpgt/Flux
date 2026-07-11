import {DomPath} from "./DomPath.es6";

/**
 * Performs the network requests behind Flux forms, links, and live polling.
 * Converts responses into documents, updates browser history where appropriate,
 * and manages temporary waiting classes.
 */
export class NavigationController {
	constructor(
		parser = new DOMParser(),
		fetcher = globalThis.fetch.bind(globalThis),
		historyObject = globalThis.history,
		logger = console,
		documentObject = globalThis.document,
		windowObject = globalThis.window,
		domPath = DomPath,
	) {
		this.parser = parser;
		this.fetcher = fetcher;
		this.historyObject = historyObject;
		this.logger = logger;
		this.documentObject = documentObject;
		this.windowObject = windowObject;
		this.domPath = domPath;
	}

	submitForm(form, formData, onDocument, submitter = null) {
		return this.requestForm(form, formData, onDocument, submitter, "submitForm");
	}

	fetchForm(form, formData, onDocument, submitter = null) {
		return this.requestForm(form, formData, onDocument, submitter, null);
	}

	requestForm(form, formData, onDocument, submitter = null, historyAction = "submitForm") {
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
				action: historyAction,
				errorPrefix: "Form submission error",
			},
			onDocument,
			this.getFormWaitingTargets(form, submitter),
		);
	}

	appendFormDataToUrl(url, formData) {
		let urlObject = new URL(url, globalThis.location?.href);
		let searchParams = new URLSearchParams();

		for(let [key, value] of formData.entries()) {
			searchParams.append(key, value);
		}

		urlObject.search = searchParams.toString();
		return urlObject.toString();
	}

	clickLink(link, onDocument) {
		let scrollState = this.getScrollStateForElement(link);
		return this.navigate(
			link,
			link.href,
			{
				credentials: "same-origin",
			},
			{
				action: "clickLink",
				errorPrefix: "Link fetch error",
				scrollX: 0,
				scrollY: 0,
				scrollBehavior: scrollState.behavior,
				scrollPath: scrollState.path,
			},
			onDocument,
			this.getLinkWaitingTargets(link),
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
			false,
		);
	}

	async navigate(element, url, requestOptions, historyState, onDocument, waitingTargets = []) {
		for(let {element: waitingElement, className} of waitingTargets) {
			waitingElement?.classList?.add(className);
		}

		try {
			return await this.requestDocument(url, requestOptions, historyState, onDocument, true);
		}
		catch(error) {
			return null;
		}
		finally {
			for(let {element: waitingElement, className} of waitingTargets) {
				waitingElement?.classList?.remove(className);
			}
		}
	}

	getFormWaitingTargets(form, submitter) {
		let waitingTargets = [
			{element: form, className: "flux-form-waiting"},
		];

		if(this.documentObject?.body) {
			waitingTargets.push({
				element: this.documentObject.body,
				className: "flux-form-waiting",
			});
		}

		if(submitter instanceof HTMLButtonElement) {
			waitingTargets.push({
				element: submitter,
				className: "flux-button-waiting",
			});
		}

		return waitingTargets;
	}

	getLinkWaitingTargets(link) {
		let waitingTargets = [
			{element: link, className: "flux-link-waiting"},
		];

		if(this.documentObject?.body) {
			waitingTargets.push({
				element: this.documentObject.body,
				className: "flux-link-waiting",
			});
		}

		return waitingTargets;
	}

	async requestDocument(url, requestOptions, historyState, onDocument, allowErrorDocument = false) {
		let method = (requestOptions.method ?? "get").toLowerCase();
		try {
			let absoluteUrl = new URL(url, globalThis.location?.href).toString();
			let response = await this.fetcher(absoluteUrl, {
				...requestOptions,
				method,
			});
			if(!response.ok && !allowErrorDocument) {
				throw new Error(`${historyState.errorPrefix}: ${response.status} ${response.statusText}`);
			}

			let html = await response.text();
			let document = this.parser.parseFromString(html, "text/html");
			if(historyState.action) {
				this.storeScrollPositionForCurrentEntry(historyState);
				this.historyObject.pushState(
					this.createHistoryState(historyState),
					"",
					response.url,
				);
			}

			if(historyState.action === "clickLink") {
				onDocument(document, this.createHistoryState(historyState));
			}
			else {
				onDocument(document);
			}
			return document;
		}
		catch(error) {
			this.logger.error(error);
			return null;
		}
	}

	createHistoryState(historyState) {
		let state = {
			action: historyState.action,
		};

		if(Number.isFinite(historyState.scrollY)) {
			state.fluxScrollX = Number.isFinite(historyState.scrollX) ? historyState.scrollX : 0;
			state.fluxScrollY = historyState.scrollY;
			if(historyState.scrollBehavior) {
				state.fluxScrollBehavior = historyState.scrollBehavior;
			}
			if(historyState.scrollPath) {
				state.fluxScrollPath = historyState.scrollPath;
			}
		}

		return state;
	}

	storeScrollPositionForCurrentEntry(historyState = {}) {
		if(typeof this.historyObject?.replaceState !== "function") {
			return;
		}

		let currentState = this.historyObject.state;
		if(!currentState || typeof currentState !== "object") {
			currentState = {};
		}

		this.historyObject.replaceState({
			...currentState,
			...this.getCurrentScrollStateFromHistoryState(historyState, currentState),
		}, "");
	}

	getCurrentScrollStateFromHistoryState(historyState, currentState) {
		let scrollPath = historyState.scrollPath ?? currentState.fluxScrollPath;
		let scrollElement = this.getScrollElementFromPath(scrollPath);
		let state = this.getScrollStateForElement(scrollElement ?? this.documentObject?.body);

		return {
			fluxScrollX: state.x,
			fluxScrollY: state.y,
			...(state.behavior ? {fluxScrollBehavior: state.behavior} : {}),
			...(state.path ? {fluxScrollPath: state.path} : {}),
		};
	}

	getScrollStateForElement(element) {
		let scrollElement = element?.closest?.("[data-flux-scroll]");
		let behavior = scrollElement?.dataset?.fluxScroll;
		if(behavior !== "smooth" && behavior !== "auto") {
			behavior = null;
		}

		if(scrollElement && scrollElement !== this.documentObject?.body && scrollElement !== this.documentObject?.documentElement) {
			return {
				x: scrollElement.scrollLeft,
				y: scrollElement.scrollTop,
				behavior,
				path: this.domPath.getXPathForElement(scrollElement, this.documentObject),
			};
		}

		return {
			x: this.windowObject?.scrollX ?? 0,
			y: this.windowObject?.scrollY ?? 0,
			behavior,
			path: null,
		};
	}

	getScrollElementFromPath(path) {
		if(!path || !this.documentObject) {
			return null;
		}

		return this.domPath.findInDocument(this.documentObject, path);
	}
}
