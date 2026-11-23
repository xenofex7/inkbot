<script lang="ts">
	import { i18n, LOCALES, t } from '#lib/i18n.svelte.ts';
	import Button from '#lib/components/Button.svelte';
	import { listModels, type ProviderId } from '#lib/ai/images.ts';
	import { aiSettings } from '#lib/ai/settings.svelte.ts';

	let models = $state<string[]>([]);
	let testState = $state<'idle' | 'testing' | 'ok' | 'error'>('idle');
	let testMessage = $state('');

	const providers: [ProviderId, string][] = [
		['openai', 'OpenAI'],
		['compatible', t('settings.compatible')]
	];

	async function test() {
		testState = 'testing';
		testMessage = '';
		try {
			models = await listModels(aiSettings.config);
			testState = 'ok';
			testMessage = t('settings.testOk', { count: models.length });
		} catch (error) {
			testState = 'error';
			testMessage = error instanceof Error ? error.message : String(error);
		}
	}

	const field = 'h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 text-ink';
	const label = 'mb-1.5 block text-[13px] font-medium text-ink-mute';
</script>

<main class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-2">
	<section
		class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-hairline bg-canvas p-6 lg:col-span-2"
	>
		<div>
			<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
				{t('settings.language')}
			</h1>
			<p class="mt-2 text-sm text-ink-mute">{t('settings.languageHint')}</p>
		</div>
		<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
			{#each LOCALES as [value, name] (value)}
				<button
					role="radio"
					aria-checked={i18n.locale === value}
					lang={value}
					class="rounded-pill px-3.5 py-1.5 text-sm {i18n.locale === value
						? 'bg-canvas text-ink shadow-sm'
						: 'text-ink-mute'}"
					onclick={() => i18n.set(value)}
				>
					{name}
				</button>
			{/each}
		</div>
	</section>

	<section class="space-y-5 rounded-lg border border-hairline bg-canvas p-6">
		<div>
			<h2 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
				{t('settings.provider')}
			</h2>
			<p class="mt-2 text-sm text-ink-mute">
				{t('settings.providerHint')}
			</p>
		</div>

		<div>
			<label class={label} for="provider">{t('settings.providerLabel')}</label>
			<select id="provider" bind:value={aiSettings.provider} class={field}>
				{#each providers as [value, name] (value)}
					<option {value}>{name}</option>
				{/each}
			</select>
		</div>

		{#if aiSettings.provider === 'compatible'}
			<div>
				<label class={label} for="base-url">{t('settings.baseUrl')}</label>
				<input
					id="base-url"
					bind:value={aiSettings.baseUrl}
					class={field}
					placeholder="https://litellm.example.com/v1"
					autocomplete="off"
				/>
				<p class="mt-1.5 text-[13px] text-ink-mute">
					{t('settings.baseUrlHint')}
				</p>
			</div>
		{/if}

		<div>
			<label class={label} for="api-key">{t('settings.apiKey')}</label>
			<input
				id="api-key"
				type="password"
				bind:value={aiSettings.apiKey}
				class={field}
				autocomplete="off"
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class={label} for="model">{t('settings.imageModel')}</label>
				<input
					id="model"
					bind:value={aiSettings.model}
					list="model-list"
					class={field}
					autocomplete="off"
				/>
				<datalist id="model-list">
					{#each models as model (model)}
						<option value={model}></option>
					{/each}
				</datalist>
			</div>
			<div>
				<label class={label} for="size">{t('settings.imageSize')}</label>
				<select id="size" bind:value={aiSettings.size} class={field}>
					<option value="1024x1024">1024 × 1024</option>
					<option value="1536x1024">1536 × 1024 ({t('settings.landscape')})</option>
					<option value="1024x1536">1024 × 1536 ({t('settings.portrait')})</option>
				</select>
			</div>
		</div>

		<div>
			<label class={label} for="drawing-model">{t('settings.drawingModel')}</label>
			<input
				id="drawing-model"
				bind:value={aiSettings.drawingModel}
				list="model-list"
				class={field}
				placeholder={t('settings.drawingModelPlaceholder')}
				autocomplete="off"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<Button onclick={test} disabled={testState === 'testing'}>{t('settings.test')}</Button>
			{#if testMessage}
				<span
					class="text-sm {testState === 'error' ? 'text-danger' : 'text-ink-mute'}"
					role={testState === 'error' ? 'alert' : 'status'}
				>
					{testMessage}
				</span>
			{/if}
		</div>
	</section>

	<section class="space-y-5 rounded-lg border border-hairline bg-canvas p-6">
		<div>
			<h2 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
				{t('settings.imagePrompt')}
			</h2>
			<p class="mt-2 text-sm text-ink-mute">
				{t('settings.imagePromptHint1')}
				<code class="font-mono">
					{'{prompt}'}
				</code>
				{t('settings.imagePromptHint2')}
			</p>
		</div>
		<div>
			<label class="sr-only" for="template">{t('settings.imagePrompt')}</label>
			<textarea
				id="template"
				bind:value={aiSettings.promptTemplate}
				rows="9"
				class="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 font-mono text-sm text-ink"
			></textarea>
		</div>
		<Button onclick={() => aiSettings.resetPrompt()}>{t('settings.restore')}</Button>

		<div class="border-t border-hairline-soft pt-5">
			<h2 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
				{t('settings.drawingPrompt')}
			</h2>
			<p class="mt-2 text-sm text-ink-mute">
				{t('settings.drawingPromptHint1')}
				<code class="font-mono">
					{'{width}'}
				</code>
				{t('settings.and')} <code class="font-mono">{'{height}'}</code>
				{t('settings.drawingPromptHint2')}
			</p>
		</div>
		<div>
			<label class="sr-only" for="svg-template">{t('settings.drawingPrompt')}</label>
			<textarea
				id="svg-template"
				bind:value={aiSettings.svgTemplate}
				rows="9"
				class="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 font-mono text-sm text-ink"
			></textarea>
		</div>
		<Button onclick={() => aiSettings.resetSvgTemplate()}>{t('settings.restore')}</Button>
	</section>
</main>
