import { smoothCurve } from '../geometry/curve';
import { bounds, type Point, type Polyline } from '../geometry/types';
import { loadGray } from '../image/load';
import { traceImage, type Gray, type TraceMode } from '../image/trace';
import { orderPaths } from '../optimize/order';
import { parseSvgStrokes, type Stroke } from '../svg/parse';
import { penForColor } from './pens';
import { handwriting } from '../handwriting/store.svelte';
import { fonts, layoutText, type Align } from '../text/layout';
import {
	centred,
	eraseLines,
	extent,
	normalize,
	place,
	rotated,
	toLocal,
	type Erasure,
	type Placement,
	type Rotation,
	type Shape
} from './model';
import { fillPlaceholders, hasPlaceholders, type MergeList } from './merge';
import type { Area, CardTemplate, Guides } from './templates';

export type TextOptions = {
	text: string;
	fontId: string;
	size: number;
	lineHeight: number;
	align: Align;
};

export type TraceOptions = {
	mode: TraceMode;
	threshold: number;
	fill: boolean;
	spacing: number;
	detail: number;
};

type Base = Placement & {
	id: string;
	name: string;
	shape: Shape;
	pen?: number;
	hidden?: boolean;
	erasures?: Erasure[];
};

export type Tool = 'select' | 'draw' | 'erase';

export type PenGroup = { pen: number; polylines: Polyline[] };

export type TextElement = Base & { kind: 'text'; options: TextOptions };
export type RasterElement = Base & {
	kind: 'raster';
	trace: TraceOptions;
	gray: Gray;
	unit: number;
	blob: Blob;
};
export type VectorElement = Base & { kind: 'vector'; source?: Blob; freehand?: boolean };
export type DesignElement = TextElement | RasterElement | VectorElement;

export type { Area };

const RASTER_WIDTH_MM = 60;
const CURVE_STEP_MM = 0.2;

export function textShape(options: TextOptions): Shape {
	const font = handwriting.allFonts.find((f) => f.id === options.fontId) ?? fonts[0];
	const base = { font, size: options.size, lineHeight: options.lineHeight };
	const natural = bounds(layoutText(options.text, { ...base, align: 'left', width: 10_000 }));
	const width = natural ? natural.maxX : 0;
	const lines = layoutText(options.text, { ...base, align: options.align, width });
	return normalize(lines.map((line) => smoothCurve(line, CURVE_STEP_MM)));
}

export function rasterShape(gray: Gray, trace: TraceOptions, unit: number): Shape {
	const lines = traceImage(gray, {
		mode: trace.mode,
		threshold: trace.threshold,
		hatchSpacing: trace.spacing / unit,
		simplify: 0.8,
		minLength: Math.max(1, 0.8 / unit),
		fill: trace.fill
			? { spacing: trace.spacing / unit, minWidth: Math.max(3, 1.2 / unit) }
			: undefined
	});
	return normalize(
		lines.map((line) =>
			smoothCurve(
				line.map((p) => ({ x: p.x * unit, y: p.y * unit })),
				CURVE_STEP_MM
			)
		)
	);
}

function merged(element: DesignElement, row: Record<string, string>): DesignElement {
	if (element.kind !== 'text' || !hasPlaceholders(element.options.text)) return element;
	const shape = textShape({
		...element.options,
		text: fillPlaceholders(element.options.text, row)
	});
	if (element.options.align !== 'center') return { ...element, shape };
	const before = extent(element.shape, element.rotation);
	const after = extent(shape, element.rotation);
	return {
		...element,
		shape,
		x: element.x + ((before.width - after.width) * element.scale) / 2,
		y: element.y + ((before.height - after.height) * element.scale) / 2
	};
}

function erased(element: DesignElement): DesignElement {
	if (!element.erasures?.length) return element;
	return {
		...element,
		shape: { ...element.shape, lines: eraseLines(element.shape.lines, element.erasures) }
	};
}

class Design {
	elements = $state.raw<DesignElement[]>([]);
	selectedId = $state<string | undefined>();
	guides = $state.raw<Guides | undefined>();

	selected = $derived(this.elements.find((element) => element.id === this.selectedId));

	merge = $state.raw<MergeList | undefined>();
	mergeIndex = $state(0);
	mergeRow = $derived(this.merge?.rows[this.mergeIndex]);

	tool = $state<Tool>('select');
	eraserSize = $state(3);

	view = $derived.by(() => {
		const row = this.mergeRow;
		return this.elements
			.filter((element) => !element.hidden)
			.map((element) => erased(row ? merged(element, row) : element));
	});

	groups = $derived.by((): PenGroup[] => {
		const pens = [...new Set(this.view.map((element) => element.pen ?? 1))].sort((a, b) => a - b);
		return pens.map((pen) => ({
			pen,
			polylines: orderPaths(
				this.view
					.filter((element) => (element.pen ?? 1) === pen)
					.flatMap((element): Polyline[] => place(element.shape, element))
			)
		}));
	});

	polylines = $derived(this.groups.flatMap((group) => group.polylines));

	toggleHidden(id: string) {
		this.#update(id, (element) => ({ ...element, hidden: !element.hidden }));
		if (this.selectedId === id) this.selectedId = undefined;
	}

	erase(point: Point, radius: number) {
		const hits: Record<string, Erasure> = {};
		for (const element of this.view) {
			const size = extent(element.shape, element.rotation);
			const inside =
				point.x > element.x - radius &&
				point.x < element.x + size.width * element.scale + radius &&
				point.y > element.y - radius &&
				point.y < element.y + size.height * element.scale + radius;
			if (!inside) continue;
			const local = toLocal(element.shape, element, point);
			hits[element.id] = { ...local, r: radius / element.scale };
		}
		if (Object.keys(hits).length === 0) return;
		this.elements = this.elements.map((element) => {
			const hit = hits[element.id];
			return hit ? { ...element, erasures: [...(element.erasures ?? []), hit] } : element;
		});
	}

	clearErasures(id: string) {
		this.#update(id, (element) => ({ ...element, erasures: undefined }));
	}

	addFreehand(line: Polyline, name: string) {
		if (line.length < 2) return;
		const target = this.elements.find(
			(element) =>
				element.kind === 'vector' && element.freehand && !element.hidden && !element.rotation
		);
		if (!target) {
			const box = bounds([line])!;
			this.#add({
				kind: 'vector',
				id: crypto.randomUUID(),
				name,
				freehand: true,
				shape: normalize([line]),
				x: box.minX,
				y: box.minY,
				scale: 1
			});
			return;
		}
		const local = line.map((p) => toLocal(target.shape, target, p));
		const lines = [...target.shape.lines, local];
		const box = bounds(lines)!;
		this.#update(target.id, (element) => ({
			...element,
			shape: normalize(lines),
			x: element.x + box.minX * element.scale,
			y: element.y + box.minY * element.scale,
			erasures: element.erasures?.map((e) => ({ ...e, x: e.x - box.minX, y: e.y - box.minY }))
		}));
		this.selectedId = target.id;
	}

	setPen(id: string, pen: number) {
		this.#update(id, (element) => ({ ...element, pen }));
	}

	setMerge(list: MergeList | undefined) {
		this.merge = list;
		this.mergeIndex = 0;
	}

	stepMerge(offset: number) {
		const count = this.merge?.rows.length ?? 0;
		if (count > 0) this.mergeIndex = (this.mergeIndex + offset + count) % count;
	}

	#add(element: DesignElement) {
		this.elements = [...this.elements, element];
		this.selectedId = element.id;
	}

	#update(id: string, change: (element: DesignElement) => DesignElement) {
		this.elements = this.elements.map((element) => (element.id === id ? change(element) : element));
	}

	addText(
		options: TextOptions,
		area: Area,
		anchor: 'center' | 'start' = 'center',
		rotation: Rotation = 0
	) {
		const shape = textShape(options);
		const placement =
			anchor === 'start' ? { x: area.x, y: area.y, scale: 1 } : centred(shape, area, 0.8);
		this.#add({
			kind: 'text',
			id: crypto.randomUUID(),
			name: options.text.split('\n')[0] || 'Text',
			options,
			shape,
			...placement,
			rotation
		});
	}

	applyTemplate(template: CardTemplate, text: (key: string) => string) {
		this.clear();
		const { formatId, orientation, lines, labels } = template;
		this.guides = { formatId, orientation, lines, labels };
		for (const item of template.texts) {
			this.addText(
				{
					text: text(item.key),
					fontId: item.fontId,
					size: item.size,
					lineHeight: 1.4,
					align: item.align
				},
				item.area,
				item.anchor,
				item.rotation
			);
		}
		this.selectedId = undefined;
	}

	addVector(
		lines: Polyline[],
		name: string,
		area: Area,
		options: { source?: Blob; keepPosition?: boolean } = {}
	) {
		const shape = normalize(lines);
		const box = bounds(lines);
		const placement =
			options.keepPosition && box ? { x: box.minX, y: box.minY, scale: 1 } : centred(shape, area);
		this.#add({
			kind: 'vector',
			id: crypto.randomUUID(),
			name,
			shape,
			source: options.source,
			...placement
		});
	}

	addStrokes(strokes: Stroke[], name: string, area: Area, source?: Blob) {
		const byPen: Record<number, Polyline[]> = {};
		for (const stroke of strokes) (byPen[penForColor(stroke.color)] ??= []).push(stroke.line);
		const pens = Object.keys(byPen)
			.map(Number)
			.sort((a, b) => a - b);
		if (pens.length <= 1) {
			this.addVector(
				strokes.map((stroke) => stroke.line),
				name,
				area,
				{ source }
			);
			if (pens[0] && pens[0] !== 1 && this.selectedId) this.setPen(this.selectedId, pens[0]);
			return;
		}
		const all = strokes.map((stroke) => stroke.line);
		const whole = bounds(all)!;
		const placement = centred(normalize(all), area);
		for (const pen of pens) {
			const lines = byPen[pen];
			const box = bounds(lines)!;
			this.#add({
				kind: 'vector',
				id: crypto.randomUUID(),
				name: `${name} · ${pen}`,
				shape: normalize(lines),
				source: pen === pens[0] ? source : undefined,
				pen,
				scale: placement.scale,
				x: placement.x + (box.minX - whole.minX) * placement.scale,
				y: placement.y + (box.minY - whole.minY) * placement.scale
			});
		}
	}

	async addRaster(blob: Blob, name: string, area: Area) {
		const trace: TraceOptions = {
			mode: 'lines',
			threshold: 140,
			fill: false,
			spacing: 1.2,
			detail: 400
		};
		const gray = await loadGray(blob, trace.detail);
		const unit = RASTER_WIDTH_MM / gray.width;
		const shape = rasterShape(gray, trace, unit);
		this.#add({
			kind: 'raster',
			id: crypto.randomUUID(),
			name,
			blob,
			gray,
			unit,
			trace,
			shape,
			...centred(shape, area)
		});
	}

	async addFile(file: File, area: Area) {
		if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
			this.addStrokes(parseSvgStrokes(await file.text()), file.name, area, file);
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

	async updateTrace(id: string, trace: TraceOptions) {
		const element = this.elements.find((e) => e.id === id);
		if (element?.kind !== 'raster') return;
		let { gray, unit } = element;
		if (trace.detail !== element.trace.detail) {
			gray = await loadGray(element.blob, trace.detail);
			unit = (element.unit * element.gray.width) / gray.width;
		}
		this.#update(id, (current) =>
			current.kind === 'raster'
				? { ...current, trace, gray, unit, shape: rasterShape(gray, trace, unit) }
				: current
		);
	}

	async replaceImage(id: string, blob: Blob) {
		const element = this.elements.find((e) => e.id === id);
		if (element?.kind !== 'raster') return;
		const gray = await loadGray(blob, element.trace.detail);
		const unit = (element.unit * element.gray.width) / gray.width;
		this.#update(id, (current) =>
			current.kind === 'raster'
				? { ...current, blob, gray, unit, shape: rasterShape(gray, current.trace, unit) }
				: current
		);
	}

	move(id: string, placement: Placement) {
		this.#update(id, (element) => ({ ...element, ...placement }));
	}

	rotate(id: string) {
		this.#update(id, (element) => ({ ...element, ...rotated(element.shape, element) }));
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
		this.guides = undefined;
	}
}

export const design = new Design();
