export class UpdateTargetRegistry {
	collection = {};

	add(element, updateType) {
		let type = updateType ?? "_none";
		if(this.collection[type] === undefined) {
			this.collection[type] = [];
		}

		this.collection[type].push(element);
	}

	getTypes() {
		return Object.keys(this.collection);
	}

	getElements(type) {
		return this.collection[type] ?? [];
	}

	replace(type, existingElement, newElement) {
		let index = this.getElements(type).indexOf(existingElement);
		if(index < 0) {
			return;
		}

		this.collection[type][index] = newElement;
	}
}
