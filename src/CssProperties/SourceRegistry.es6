import {ControlSource} from "./ControlSource.es6";
import {GeometrySource} from "./GeometrySource.es6";
import {PaletteSource} from "./PaletteSource.es6";

/** The complete CSS source catalogue: construction and scheduling policy in one place. */
export const CSS_SOURCES = Object.freeze({
	"flux-pointer": {source: GeometrySource, pointer: true, resize: true},
	"flux-pointer-global": {source: GeometrySource, pointer: true},
	"flux-size": {source: GeometrySource, resize: true},
	"flux-visible": {source: GeometrySource, always: true},
	"flux-first-visible": {source: GeometrySource, always: true},
	"flux-range": {source: ControlSource, always: true},
	"flux-select": {source: ControlSource, always: true},
	"flux-color": {source: ControlSource, always: true},
	"flux-field": {source: ControlSource, always: true},
	"flux-form": {source: ControlSource, always: true},
	"flux-palette": {source: PaletteSource},
	"flux-truncated": {source: GeometrySource, resize: true},
});
