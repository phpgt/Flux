import {TimeSource} from "./TimeSource.es6";
import {ControlSource} from "./ControlSource.es6";
import {GeometrySource} from "./GeometrySource.es6";
import {PaletteSource} from "./PaletteSource.es6";
import {ScrollSource} from "./ScrollSource.es6";

/** The complete CSS source catalogue: construction and scheduling policy in one place. */
export const CSS_SOURCES = Object.freeze({
	"flux-time": {source: TimeSource},
	"flux-date": {source: TimeSource, properties: {"day-scalar": "--flux-day-scalar"}},
	"flux-pointer": {source: GeometrySource, pointer: true, resize: true},
	"flux-pointer-global": {source: GeometrySource, pointer: true},
	"flux-size": {source: GeometrySource, resize: true},
	"flux-visible": {source: GeometrySource, always: true},
	"flux-first-visible": {source: GeometrySource, always: true},
	"flux-scroll": {source: ScrollSource, scroll: true, always: true},
	"flux-scroll-progress": {
		source: ScrollSource, scroll: true, always: true,
		properties: {"x-midway": "--flux-scroll-midway-x", "y-midway": "--flux-scroll-midway-y"},
	},
	"flux-range": {source: ControlSource, always: true},
	"flux-select": {source: ControlSource, always: true},
	"flux-color": {source: ControlSource, always: true},
	"flux-field": {source: ControlSource, always: true},
	"flux-form": {source: ControlSource, always: true},
	"flux-palette": {source: PaletteSource},
	"flux-truncated": {source: GeometrySource, resize: true},
});
