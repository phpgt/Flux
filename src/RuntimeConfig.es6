/**
 * Stores process-wide Flux settings shared by small helper modules.
 * Internally, this keeps debug mode available without making helpers import
 * the main Flux class.
 */
export const RuntimeConfig = {
	debug: false,
};
