import type { Shape } from '../design/model';

export type AiResult =
	| { kind: 'svg'; name: string; svg: string; shape: Shape }
	| { kind: 'image'; name: string; blob: Blob; shape: Shape };
