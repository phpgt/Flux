export class FluxLiveHandler {
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
	}

	register(updateType, element) {
		this.updateTargetRegistry.add(element, updateType);
		let key = this.getTargetKey(updateType, element);
		element.fluxLiveKey = key;
		if(!this.lastRefreshMap.has(key)) {
			this.lastRefreshMap.set(key, this.now());
		}

		this.ensureRunning();
	}

	ensureRunning() {
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
		let dueTargets = this.getDueTargets();
		if(dueTargets.length === 0) {
			this.ensureRunning();
			return;
		}

		if(this.inFlight) {
			this.ensureRunning();
			return;
		}

		this.inFlight = true;
		try {
			await this.navigationController.pollDocument(
				this.locationObject.href,
				newDocument => {
					let refreshedAt = this.now();
					for(let target of dueTargets) {
						this.lastRefreshMap.set(target.key, refreshedAt);
					}

					this.onDocument(newDocument, dueTargets.map(target => target.key));
				},
			);
		}
		finally {
			this.inFlight = false;
			this.ensureRunning();
		}
	}

	hasLiveElements() {
		let hasLiveElements = false;
		for(let type of FluxLiveHandler.UPDATE_TYPES) {
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

		for(let type of FluxLiveHandler.UPDATE_TYPES) {
			for(let element of this.getConnectedElements(type)) {
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

		for(let type of FluxLiveHandler.UPDATE_TYPES) {
			for(let element of this.getConnectedElements(type)) {
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
			if(element?.isConnected) {
				connected.push(element);
				continue;
			}

			this.updateTargetRegistry.remove(type, element);
			this.lastRefreshMap.delete(this.getTargetKey(type, element));
		}

		return connected;
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
