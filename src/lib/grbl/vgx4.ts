export const VGX4 = {
	baudRate: 115200,
	usbVendorId: 0x1a86,
	rxBufferSize: 128,
	penDownS: 905,
	penDwellSeconds: 0.3,
	jogFeed: 3000,
	drawFeed: 1500,
	pollIntervalMs: 250,
	areaWidth: 310,
	areaHeight: 256
} as const;

export const REALTIME = {
	status: '?',
	feedHold: '!',
	cycleStart: '~',
	softReset: '\x18',
	jogCancel: '\x85',
	feedReset: '\x90',
	feedFaster: '\x91',
	feedSlower: '\x92'
} as const;
