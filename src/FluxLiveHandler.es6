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
		this.timerId = null;
		this.inFlight = false;
	}

	register(updateType, element) {
		this.updateTargetRegistry.add(element, updateType);
		this.ensureRunning();
	}

	ensureRunning() {
		if(this.timerId !== null || !this.hasLiveElements()) {
			return;
		}

		this.timerId = this.scheduler(this.pollDocument, this.intervalMs);
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
		if(!this.hasLiveElements()) {
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
				this.onDocument,
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
			for(let element of [...this.updateTargetRegistry.getElements(type)]) {
				if(element?.isConnected) {
					hasLiveElements = true;
					continue;
				}

				this.updateTargetRegistry.remove(type, element);
			}
		}

		if(this.debug) {
			this.logger.debug("Flux live target count", hasLiveElements);
		}

		return hasLiveElements;
	}
}
