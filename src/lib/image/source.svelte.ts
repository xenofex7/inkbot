class ImageSource {
	blob = $state<Blob | undefined>();
	url = $state<string | undefined>();
	name = $state('');
	svg = $state<string | undefined>();

	set(blob: Blob, name: string) {
		this.#replace(blob, name);
		this.svg = undefined;
	}

	setSvg(text: string, name: string) {
		this.#replace(new Blob([text], { type: 'image/svg+xml' }), name);
		this.svg = text;
	}

	#replace(blob: Blob, name: string) {
		if (this.url) URL.revokeObjectURL(this.url);
		this.blob = blob;
		this.url = URL.createObjectURL(blob);
		this.name = name;
	}
}

export const imageSource = new ImageSource();
