<script lang="ts">
	import { i18n, LOCALES, t } from '#lib/i18n.svelte.ts';
	import { Download, Eye, EyeOff, FolderSync, Upload } from '@lucide/svelte';
	import { createBackup, restoreBackup } from '#lib/backup.svelte.ts';
	import { autoBackup } from '#lib/autoBackup.svelte.ts';
	import { download } from '#lib/download.ts';
	import Button from '#lib/components/Button.svelte';
	import { listModels, type ProviderId } from '#lib/ai/images.ts';
	import { aiSettings } from '#lib/ai/settings.svelte.ts';

	let models = $state<string[]>([]);
	let testState = $state<'idle' | 'testing' | 'ok' | 'error'>('idle');
	let testMessage = $state('');
	let showKeyStart = $state(false);
	let backupError = $state('');
	let backupInput: HTMLInputElement;

	async function exportBackup() {
		backupError = '';
		try {
			const date = new Date().toISOString().slice(0, 10);
			const blob = new Blob([await createBackup()], { type: 'application/json' });
			download(blob, `inkbot-backup-${date}.json`);
		} catch (error) {
			backupError = error instanceof Error ? error.message : String(error);
		}
	}

	async function importBackup(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file || !confirm(t('backup.confirm'))) return;
		backupError = '';
		try {
			await restoreBackup(await file.text());
			location.reload();
		} catch (error) {
			backupError = error instanceof Error ? error.message : String(error);
		}
	}

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
			<div class="relative">
				<input
					id="api-key"
					type="password"
					bind:value={aiSettings.apiKey}
					class="{field} pr-11"
					autocomplete="off"
				/>
				<button
					type="button"
					class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-mute hover:text-ink"
					aria-label={t('settings.showKeyStart')}
					aria-pressed={showKeyStart}
					onclick={() => (showKeyStart = !showKeyStart)}
				>
					{#if showKeyStart}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
				</button>
			</div>
			{#if showKeyStart && aiSettings.apiKey}
				<p class="mt-1.5 text-[13px] text-ink-mute">
					{t('settings.keyStart')}
					<code class="font-mono text-ink">{aiSettings.apiKey.slice(0, 10)}…</code>
				</p>
			{/if}
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

	<section class="space-y-4 rounded-lg border border-hairline bg-canvas p-6 lg:col-span-2">
		<div>
			<h2 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
				{t('backup.title')}
			</h2>
			<p class="mt-2 text-sm text-ink-mute">{t('backup.hint')}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button onclick={exportBackup}>
				<Download size={16} />
				{t('backup.export')}
			</Button>
			<Button onclick={() => backupInput.click()}>
				<Upload size={16} />
				{t('backup.import')}
			</Button>
			<input
				bind:this={backupInput}
				type="file"
				accept="application/json,.json"
				class="hidden"
				onchange={importBackup}
			/>
		</div>
		{#if backupError}
			<p class="text-sm text-danger" role="alert">{backupError}</p>
		{/if}

		<div class="space-y-3 border-t border-hairline-soft pt-4">
			<h3 class="font-semibold text-ink">{t('autoBackup.title')}</h3>
			<p class="text-sm text-ink-mute">{t('autoBackup.hint')}</p>
			{#if !autoBackup.supported}
				<p class="text-sm text-ink-mute">{t('autoBackup.unsupported')}</p>
			{:else if autoBackup.status === 'off'}
				<Button onclick={() => autoBackup.choose()}>
					<FolderSync size={16} />
					{t('autoBackup.choose')}
				</Button>
			{:else}
				<p class="text-sm text-ink">
					{autoBackup.status === 'active'
						? t('autoBackup.active', { folder: autoBackup.folder })
						: t('autoBackup.paused', { folder: autoBackup.folder })}
					{#if autoBackup.savedAt}
						<span class="text-ink-mute">
							· {t('autoBackup.savedAt', {
								time: new Date(autoBackup.savedAt).toLocaleTimeString('de-CH', {
									hour: '2-digit',
									minute: '2-digit'
								})
							})}
						</span>
					{/if}
				</p>
				<div class="flex flex-wrap gap-2">
					{#if autoBackup.status === 'paused'}
						<Button variant="primary" onclick={() => autoBackup.resume()}>
							<FolderSync size={16} />
							{t('autoBackup.resume')}
						</Button>
					{:else}
						<Button onclick={() => autoBackup.save()}>{t('autoBackup.saveNow')}</Button>
					{/if}
					<Button onclick={() => autoBackup.choose()}>{t('autoBackup.change')}</Button>
					<Button onclick={() => autoBackup.stop()}>{t('autoBackup.stop')}</Button>
				</div>
			{/if}
			{#if autoBackup.error}
				<p class="text-sm text-danger" role="alert">{autoBackup.error}</p>
			{/if}
		</div>
	</section>
</main>
