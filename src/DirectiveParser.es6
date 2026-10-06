/** Reads whitespace-separated directives without splitting CSS connection selectors. */
export class DirectiveParser {
	static parse(value = "") {
		let tokens = [];
		let start = 0;
		let depth = 0;
		let quote = null;
		let escaped = false;
		for(let index = 0; index < value.length; index++) {
			let character = value[index];
			if(escaped) { escaped = false; continue; }
			if(character === "\\") { escaped = true; continue; }
			if(quote) {
				if(character === quote) quote = null;
				continue;
			}
			if(character === '"' || character === "'") { quote = character; continue; }
			if(character === "(") depth++;
			if(character === ")" && --depth < 0) throw new SyntaxError("Unexpected closing Flux connection bracket.");
			if(/\s/.test(character) && depth === 0) {
				if(index > start) tokens.push(value.slice(start, index));
				start = index + 1;
			}
		}
		if(depth || quote || escaped) throw new SyntaxError("Unclosed Flux connection or quoted selector.");
		if(start < value.length) tokens.push(value.slice(start));
		return [...new Set(tokens)].map(token => this.parseToken(token));
	}

	static parseToken(token) {
		if(!token.startsWith("(")) return {names: [token], selector: null};
		let separator = token.indexOf("@");
		if(separator < 2 || !token.endsWith(")")) throw new SyntaxError(`Invalid Flux connection: ${token}`);
		let names = [...new Set(token.slice(1, separator).split(",").map(name => name.trim()))];
		let selector = token.slice(separator + 1, -1).trim();
		if(!selector || names.some(name => !/^flux-[a-z-]+$/.test(name))) {
			throw new SyntaxError(`Invalid Flux connection: ${token}`);
		}
		return {names, selector};
	}

	static has(element, name) {
		return this.parse(element.dataset["flux"]).some(token => !token.selector && token.names.includes(name));
	}
}
