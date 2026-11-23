import { DEFAULT_SVG_PROMPT } from './drawings';
import { DEFAULT_PROMPT_TEMPLATE, type ProviderConfig, type ProviderId } from './images';

const STORAGE_KEY = 'inkbot.ai';

type Stored = ProviderConfig & {
	promptTemplate: string;
	drawingModel: string;
	svgTemplate: string;
};

const DEFAULTS: Stored = {
	provider: 'openai',
	baseUrl: '',
	apiKey: '',
	model: 'gpt-image-2',
	size: '1024x1024',
	promptTemplate: DEFAULT_PROMPT_TEMPLATE,
	drawingModel: '',
	svgTemplate: DEFAULT_SVG_PROMPT
};

function load(): Stored {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Stored>) } : DEFAULTS;
	} catch {
		return DEFAULTS;
	}
}

class AiSettings {
	provider = $state<ProviderId>(DEFAULTS.provider);
	baseUrl = $state(DEFAULTS.baseUrl);
	apiKey = $state(DEFAULTS.apiKey);
	model = $state(DEFAULTS.model);
	size = $state(DEFAULTS.size);
	promptTemplate = $state(DEFAULTS.promptTemplate);
	drawingModel = $state(DEFAULTS.drawingModel);
	svgTemplate = $state(DEFAULTS.svgTemplate);

	config = $derived<ProviderConfig>({
		provider: this.provider,
		baseUrl: this.baseUrl,
		apiKey: this.apiKey,
		model: this.model,
		size: this.size
	});

	connected = $derived(
		this.provider === 'openai' ? this.apiKey.trim() !== '' : this.baseUrl.trim() !== ''
	);

	ready = $derived(this.connected && this.model.trim() !== '');

	drawingReady = $derived(this.connected && this.drawingModel.trim() !== '');

	drawingConfig = $derived<ProviderConfig>({ ...this.config, model: this.drawingModel });

	constructor() {
		if (typeof localStorage === 'undefined') return;
		Object.assign(this, load());
		$effect.root(() => {
			$effect(() => {
				const snapshot: Stored = {
					...this.config,
					promptTemplate: this.promptTemplate,
					drawingModel: this.drawingModel,
					svgTemplate: this.svgTemplate
				};
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
				} catch {
					return;
				}
			});
		});
	}

	resetPrompt() {
		this.promptTemplate = DEFAULT_PROMPT_TEMPLATE;
	}

	resetSvgTemplate() {
		this.svgTemplate = DEFAULT_SVG_PROMPT;
	}
}

export const aiSettings = new AiSettings();
