export class FluxResponseHandler {
	constructor(
		documentUpdater,
		logger = console,
		debug = false,
		scheduler = globalThis.setTimeout.bind(globalThis),
		reload = () => location.reload(),
		alerter = globalThis.alert?.bind(globalThis),
	) {
		this.documentUpdater = documentUpdater;
		this.logger = logger;
		this.debug = debug;
		this.scheduler = scheduler;
		this.reload = reload;
		this.alerter = alerter;
	}

	handleDocument = (newDocument) => {
		if(newDocument.head.children.length === 0) {
			if(this.debug && this.alerter) {
				this.alerter("Error processing new document!");
			}

			this.logger.error("Error processing new document!");
			this.reload();
			return;
		}

		this.scheduler(() => {
			this.documentUpdater.apply(newDocument);
		}, 0);
	}
}
