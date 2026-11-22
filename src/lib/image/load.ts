import { grayFromRgba, type Gray } from './trace';

export async function loadGray(source: Blob, maxSide: number): Promise<Gray> {
	const bitmap = await createImageBitmap(source);
	const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Canvas wird nicht unterstützt');
	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, width, height);
	context.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	const { data } = context.getImageData(0, 0, width, height);
	return grayFromRgba(data, width, height);
}
