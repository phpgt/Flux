import {LiveVisibility} from "./LiveVisibility.es6";

/**
 * Runs recurring background refreshes for live Flux regions.
 * Registers live update targets, schedules polling based on
 * data-flux-rate, and asks ResponseHandler to refresh only due elements.
 */
export class LiveHandler {
	static UPDATE_TYPES = Object.freeze([
		"live-outer",
		"live-inner",
	]);

	constructor(
		navigationController,
		updateTargetRegistry,
		onDocument,
		logger = console,
		debug = false,
		scheduler = globalThis.setTimeout.bind(globalThis),
		clearScheduler = globalThis.clearTimeout.bind(globalThis),
		locationObject = globalThis.location,
		intervalMs = 1000,
		now = () => Date.now(),
		domPath = null,
		documentObject = globalThis.document,
	) {
		this.navigationController = navigationController;
		this.updateTargetRegistry = updateTargetRegistry;
		this.onDocument = onDocument;
		this.logger = logger;
		this.debug = debug;
		this.scheduler = scheduler;
		this.clearScheduler = clearScheduler;
		this.locationObject = locationObject;
		this.intervalMs = intervalMs;
		this.now = now;
		this.domPath = domPath;
		this.timerId = null;
		this.inFlight = false;
		this.lastRefreshMap = new Map();
		this.visibility = new LiveVisibility(this.refreshSchedule, documentObject);
		this.disposed = false;
	}

	register(updateType, element) {
		this.updateTargetRegistry.add(element, updateType);
		let key = this.getTargetKey(updateType, element);
		element.fluxLiveKey = key;
		if(!this.lastRefreshMap.has(key)) {
			this.lastRefreshMap.set(key, this.now());
		}

		this.visibility.observe(element);
		// Replacement elements are initialised before adoption into the current document.
		if(this.visibility.document.contains(element)) this.ensureRunning();
		else queueMicrotask(this.refreshSchedule);
	}

	refreshSchedule = () => {
		if(this.disposed) return;
		this.visibility.prune();
		let keys = new Set();
		for(let type of LiveHandler.UPDATE_TYPES) {
			for(let element of this.getConnectedElements(type)) keys.add(this.getTargetKey(type, element));
		}
		for(let key of this.lastRefreshMap.keys()) {
			if(!keys.has(key)) this.lastRefreshMap.delete(key);
		}
		this.stop();
		this.ensureRunning();
	}

	ensureRunning() {
		if(this.disposed || this.inFlight || this.visibility.document.hidden) return;
		let nextDelay = this.getNextPollDelay();
		if(this.timerId !== null || nextDelay === null) {
			return;
		}

		this.timerId = this.scheduler(this.pollDocument, nextDelay);
	}

	stop() {
		if(this.timerId === null) {
			return;
		}

		this.clearScheduler(this.timerId);
		this.timerId = null;
	}

	pollDocument = async() => {
		this.timerId = null;
		if(this.disposed || this.inFlight) return;
		let dueTargets = this.getDueTargets();
		if(dueTargets.length === 0) {
			this.ensureRunning();
			return;
		}

		this.inFlight = true;
		try {
			let targetsRefreshed = false;
			await this.navigationController.pollDocument(
				this.locationObject.href,
				newDocument => {
					this.markTargetsRefreshed(dueTargets);
					targetsRefreshed = true;
					let activeTargets = dueTargets.filter(target => this.visibility.isActive(target.element));
					if(!this.disposed && activeTargets.length) {
						this.onDocument(newDocument, activeTargets.map(target => target.key));
					}
				},
			);

			if(!targetsRefreshed) {
				this.markTargetsRefreshed(dueTargets);
			}
		}
		finally {
			this.inFlight = false;
			this.refreshSchedule();
		}
	}

	markTargetsRefreshed(targets) {
		if(this.disposed) return;
		let refreshedAt = this.now();
		for(let target of targets) {
			this.lastRefreshMap.set(target.key, refreshedAt);
		}
	}

	markAllTargetsRefreshed = () => {
		let refreshedAt = this.now();

		for(let type of LiveHandler.UPDATE_TYPES) {
			for(let element of this.getConnectedElements(type)) {
				this.lastRefreshMap.set(this.getTargetKey(type, element), refreshedAt);
			}
		}
	}

	hasLiveElements() {
		let hasLiveElements = false;
		for(let type of LiveHandler.UPDATE_TYPES) {
			for(let element of this.getConnectedElements(type)) {
				hasLiveElements = true;
			}
		}

		if(this.debug) {
			this.logger.debug("Flux live target count", hasLiveElements);
		}

		return hasLiveElements;
	}

	getDueTargets() {
		let now = this.now();
		let dueTargets = [];

		for(let type of LiveHandler.UPDATE_TYPES) {
			for(let element of this.getConnectedElements(type)) {
				if(!this.visibility.isActive(element)) continue;
				let key = this.getTargetKey(type, element);
				let rateMs = this.getRateMs(element);
				let lastRefresh = this.lastRefreshMap.get(key) ?? -Infinity;
				if(now - lastRefresh >= rateMs) {
					dueTargets.push({type, element, key});
				}
			}
		}

		return dueTargets;
	}

	getNextPollDelay() {
		let hasTargets = false;
		let now = this.now();
		let minDelay = Infinity;

		for(let type of LiveHandler.UPDATE_TYPES) {
			for(let element of this.getConnectedElements(type)) {
				if(!this.visibility.isActive(element)) continue;
				hasTargets = true;
				let key = this.getTargetKey(type, element);
				let rateMs = this.getRateMs(element);
				let lastRefresh = this.lastRefreshMap.get(key) ?? -Infinity;
				let remaining = rateMs - (now - lastRefresh);
				minDelay = Math.min(minDelay, Math.max(0, remaining));
			}
		}

		if(!hasTargets) {
			return null;
		}

		return Number.isFinite(minDelay) ? minDelay : this.intervalMs;
	}

	getConnectedElements(type) {
		let connected = [];
		for(let element of [...this.updateTargetRegistry.getElements(type)]) {
			if(this.visibility.document.contains(element)) {
				connected.push(element);
				continue;
			}

			this.updateTargetRegistry.remove(type, element);
			this.lastRefreshMap.delete(this.getTargetKey(type, element));
		}

		return connected;
	}

	dispose() {
		this.disposed = true;
		this.stop();
		this.visibility.dispose();
		this.lastRefreshMap.clear();
	}

	getRateMs(element) {
		let rateSeconds = Number.parseFloat(element.dataset["fluxRate"] ?? "");
		if(!Number.isFinite(rateSeconds) || rateSeconds <= 0) {
			return this.intervalMs;
		}

		return rateSeconds * 1000;
	}

	getTargetKey(type, element) {
		if(element?.fluxLiveKey) {
			return element.fluxLiveKey;
		}

		if(element?.id) {
			let key = `${type}:#${element.id}`;
			element.fluxLiveKey = key;
			return key;
		}

		if(this.domPath?.getXPathForElement) {
			let key = `${type}:${this.domPath.getXPathForElement(element)}`;
			if(element) {
				element.fluxLiveKey = key;
			}
			return key;
		}

		return `${type}:${type}`;
	}
}
