import { bounds, type Polyline } from '../geometry/types';
import { loadGray } from '../image/load';
import { traceImage, type Gray, type TraceMode } from '../image/trace';
import { orderPaths } from '../optimize/order';
import { parseSvg } from '../svg/parse';
import { fonts, layoutText, type Align } from '../text/layout';
import { centred, normalize, place, type Placement, type Shape } from './model';

export type TextOptions = {
	text: string;
	fontId: string;
	size: number;
	lineHeight: number;
	align: Align;
};

export type TraceOptions = { mode: TraceMode; threshold: number; fill: boolean };

type Base = Placement & { id: string; name: string; shape: Shape };

export type TextElement = Base & { kind: 'text'; options: TextOptions };
export type RasterElement = Base & {
	kind: 'raster';
	trace: TraceOptions;
	gray: Gray;
	unit: number;
};
export type VectorElement = Base & { kind: 'vector' };
export type DesignElement = TextElement | RasterElement | VectorElement;

export type Area = { x: number; y: number; width: number; height: number };

const RASTER_DETAIL = 400;
const RASTER_WIDTH_MM = 60;

export function textShape(options: TextOptions): Shape {
	const font = fonts.find((f) => f.id === options.fontId) ?? fonts[0];
	const base = { font, size: options.size, lineHeight: options.lineHeight };
	const natural = bounds(layoutText(options.text, { ...base, align: 'left', width: 10_000 }));
	const width = natural ? natural.maxX : 0;
	return normalize(layoutText(options.text, { ...base, align: options.align, width }));
}

export function rasterShape(gray: Gray, trace: TraceOptions, unit: number): Shape {
	const lines = traceImage(gray, {
		mode: trace.mode,
		threshold: trace.threshold,
		hatchSpacing: 1.2 / unit,
		simplify: 0.8,
		minLength: Math.max(1, 0.8 / unit),
		fill: trace.fill ? { spacing: 1.2 / unit, minWidth: Math.max(3, 1.2 / unit) } : undefined
	});
	return normalize(lines.map((line) => line.map((p) => ({ x: p.x * unit, y: p.y * unit }))));
}

class Design {
	elements = $state.raw<DesignElement[]>([]);
	selectedId = $state<string | undefined>();

	selected = $derived(this.elements.find((element) => element.id === this.selectedId));

	polylines = $derived(
		orderPaths(this.elements.flatMap((element): Polyline[] => place(element.shape, element)))
	);

	#add(element: DesignElement) {
		this.elements = [...this.elements, element];
		this.selectedId = element.id;
	}

	#update(id: string, change: (element: DesignElement) => DesignElement) {
		this.elements = this.elements.map((element) => (element.id === id ? change(element) : element));
	}

	addText(options: TextOptions, area: Area) {
		const shape = textShape(options);
		this.#add({
			kind: 'text',
			id: crypto.randomUUID(),
			name: options.text.split('\n')[0] || 'Text',
			options,
			shape,
			...centred(shape, area, 0.8)
		});
	}

	addVector(lines: Polyline[], name: string, area: Area) {
		const shape = normalize(lines);
		this.#add({ kind: 'vector', id: crypto.randomUUID(), name, shape, ...centred(shape, area) });
	}

	async addRaster(blob: Blob, name: string, area: Area) {
		const gray = await loadGray(blob, RASTER_DETAIL);
		const unit = RASTER_WIDTH_MM / gray.width;
		const trace: TraceOptions = { mode: 'lines', threshold: 140, fill: false };
		const shape = rasterShape(gray, trace, unit);
		this.#add({
			kind: 'raster',
			id: crypto.randomUUID(),
			name,
			gray,
			unit,
			trace,
			shape,
			...centred(shape, area)
		});
	}

	async addFile(file: File, area: Area) {
		if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
			this.addVector(parseSvg(await file.text()), file.name, area);
		} else {
			await this.addRaster(file, file.name, area);
		}
	}

	updateText(id: string, options: TextOptions) {
		this.#update(id, (element) =>
			element.kind === 'text'
				? {
						...element,
						options,
						shape: textShape(options),
						name: options.text.split('\n')[0] || 'Text'
					}
				: element
		);
	}

	updateTrace(id: string, trace: TraceOptions) {
		this.#update(id, (element) =>
			element.kind === 'raster'
				? { ...element, trace, shape: rasterShape(element.gray, trace, element.unit) }
				: element
		);
	}

	move(id: string, placement: Placement) {
		this.#update(id, (element) => ({ ...element, ...placement }));
	}

	reorder(id: string, direction: -1 | 1) {
		const index = this.elements.findIndex((e) => e.id === id);
		const target = index + direction;
		if (index < 0 || target < 0 || target >= this.elements.length) return;
		const next = [...this.elements];
		[next[index], next[target]] = [next[target], next[index]];
		this.elements = next;
	}

	remove(id: string) {
		this.elements = this.elements.filter((e) => e.id !== id);
		if (this.selectedId === id) this.selectedId = undefined;
	}

	duplicate(id: string) {
		const element = this.elements.find((e) => e.id === id);
		if (!element) return;
		this.#add({ ...element, id: crypto.randomUUID(), x: element.x + 5, y: element.y + 5 });
	}

	clear() {
		this.elements = [];
		this.selectedId = undefined;
	}
}

export const design = new Design();
