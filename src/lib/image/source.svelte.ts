class ImageSource {
	blob = $state<Blob | undefined>();
	url = $state<string | undefined>();
	name = $state('');

	set(blob: Blob, name: string) {
		if (this.url) URL.revokeObjectURL(this.url);
		this.blob = blob;
		this.url = URL.createObjectURL(blob);
		this.name = name;
	}
}

export const imageSource = new ImageSource();
