import type { Orientation } from '../geometry/paper';
import type { Polyline } from '../geometry/types';
import { fonts } from '../text/layout';
import type { Rotation } from './model';

export type Area = { x: number; y: number; width: number; height: number };

export type GuideLabel = { x: number; y: number; key: string };

export type Guides = {
	formatId: string;
	orientation: Orientation;
	lines: Polyline[];
	labels: GuideLabel[];
};

export type TemplateText = {
	key: string;
	text?: string;
	fontId: string;
	size: number;
	align: 'left' | 'center';
	area: Area;
	anchor: 'center' | 'start';
	rotation?: Rotation;
};

export type CardTemplate = {
	id: 'greeting' | 'envelope' | 'placeCard' | 'fontSample';
	formatId: string;
	orientation: Orientation;
	margin: number;
	lines: Polyline[];
	labels: GuideLabel[];
	texts: TemplateText[];
};

const rect = ({ x, y, width, height }: Area): Polyline => [
	{ x, y },
	{ x: x + width, y },
	{ x: x + width, y: y + height },
	{ x, y: y + height },
	{ x, y }
];

const SAMPLE_TOP = 12;
const SAMPLE_ROW = (297 - 2 * SAMPLE_TOP) / fonts.length;

const fontSample = (): TemplateText[] =>
	fonts.flatMap((font, index) => {
		const y = SAMPLE_TOP + index * SAMPLE_ROW;
		return [
			{
				key: '',
				text: font.name,
				fontId: 'ems-readability',
				size: 3,
				align: 'left',
				area: { x: 12, y, width: 186, height: 4 },
				anchor: 'start'
			},
			{
				key: 'template.fontSampleText',
				fontId: font.id,
				size: 8,
				align: 'left',
				area: { x: 12, y: y + 5, width: 186, height: 12 },
				anchor: 'start'
			}
		];
	});

const ADDRESS: Area = { x: 78, y: 54, width: 76, height: 50 };
const STAMP: Area = { x: 132, y: 8, width: 22, height: 26 };

export const CARD_TEMPLATES: CardTemplate[] = [
	{
		id: 'greeting',
		formatId: 'a5',
		orientation: 'landscape',
		margin: 10,
		lines: [
			[
				{ x: 105, y: 0 },
				{ x: 105, y: 148 }
			]
		],
		labels: [
			{ x: 52.5, y: 6, key: 'template.back' },
			{ x: 157.5, y: 6, key: 'template.front' }
		],
		texts: [
			{
				key: 'template.greetingText',
				fontId: 'hershey-script',
				size: 14,
				align: 'center',
				area: { x: 115, y: 20, width: 85, height: 108 },
				anchor: 'center'
			}
		]
	},
	{
		id: 'envelope',
		formatId: 'c6',
		orientation: 'landscape',
		margin: 8,
		lines: [rect(ADDRESS), rect(STAMP)],
		labels: [
			{ x: ADDRESS.x + ADDRESS.width / 2, y: ADDRESS.y - 1.5, key: 'template.address' },
			{ x: STAMP.x + STAMP.width / 2, y: STAMP.y + STAMP.height / 2, key: 'template.stamp' }
		],
		texts: [
			{
				key: 'template.sender',
				fontId: 'ems-readability',
				size: 3.5,
				align: 'left',
				area: { x: 10, y: 10, width: 60, height: 20 },
				anchor: 'start'
			},
			{
				key: 'template.recipient',
				fontId: 'ems-readability',
				size: 5,
				align: 'left',
				area: { x: ADDRESS.x + 4, y: ADDRESS.y + 6, width: ADDRESS.width - 8, height: 40 },
				anchor: 'start'
			}
		]
	},
	{
		id: 'placeCard',
		formatId: 'a6',
		orientation: 'landscape',
		margin: 8,
		lines: [
			[
				{ x: 0, y: 52.5 },
				{ x: 148, y: 52.5 }
			]
		],
		labels: [
			{ x: 74, y: 6, key: 'template.backUpsideDown' },
			{ x: 74, y: 58.5, key: 'template.front' }
		],
		texts: [
			{
				key: 'template.name',
				fontId: 'hershey-script',
				size: 14,
				align: 'center',
				area: { x: 8, y: 60, width: 132, height: 37 },
				anchor: 'center'
			},
			{
				key: 'template.name',
				fontId: 'hershey-script',
				size: 14,
				align: 'center',
				area: { x: 8, y: 8, width: 132, height: 37 },
				anchor: 'center',
				rotation: 180
			}
		]
	},
	{
		id: 'fontSample',
		formatId: 'a4',
		orientation: 'portrait',
		margin: 10,
		lines: [],
		labels: [],
		texts: fontSample()
	}
];
