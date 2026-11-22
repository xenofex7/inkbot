import { DEFAULT_PROMPT_TEMPLATE, type ProviderConfig, type ProviderId } from './images';

const STORAGE_KEY = 'inkbot.ai';

type Stored = ProviderConfig & { promptTemplate: string };

const DEFAULTS: Stored = {
	provider: 'openai',
	baseUrl: '',
	apiKey: '',
	model: 'gpt-image-2',
	size: '1024x1024',
	promptTemplate: DEFAULT_PROMPT_TEMPLATE
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

	config = $derived<ProviderConfig>({
		provider: this.provider,
		baseUrl: this.baseUrl,
		apiKey: this.apiKey,
		model: this.model,
		size: this.size
	});

	ready = $derived(
		this.model.trim() !== '' &&
			(this.provider === 'openai' ? this.apiKey.trim() !== '' : this.baseUrl.trim() !== '')
	);

	constructor() {
		if (typeof localStorage === 'undefined') return;
		Object.assign(this, load());
		$effect.root(() => {
			$effect(() => {
				const snapshot: Stored = { ...this.config, promptTemplate: this.promptTemplate };
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
}

export const aiSettings = new AiSettings();
