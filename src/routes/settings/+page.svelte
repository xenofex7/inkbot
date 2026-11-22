<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import { listModels, type ProviderId } from '#lib/ai/images.ts';
	import { aiSettings } from '#lib/ai/settings.svelte.ts';

	let models = $state<string[]>([]);
	let testState = $state<'idle' | 'testing' | 'ok' | 'error'>('idle');
	let testMessage = $state('');

	const providers: [ProviderId, string][] = [
		['openai', 'OpenAI'],
		['compatible', 'OpenAI-compatible (e.g. LiteLLM)']
	];

	async function test() {
		testState = 'testing';
		testMessage = '';
		try {
			models = await listModels(aiSettings.config);
			testState = 'ok';
			testMessage = `Connected, found ${models.length} models.`;
		} catch (error) {
			testState = 'error';
			testMessage = error instanceof Error ? error.message : String(error);
		}
	}

	const field = 'h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 text-ink';
	const label = 'mb-1.5 block text-[13px] font-medium text-ink-mute';
</script>

<main class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-2">
	<section class="space-y-5 rounded-lg border border-hairline bg-canvas p-6">
		<div>
			<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">AI provider</h1>
			<p class="mt-2 text-sm text-ink-mute">
				The key is stored in this browser only and goes straight to the provider, never to an inkbot
				server.
			</p>
		</div>

		<div>
			<label class={label} for="provider">Provider</label>
			<select id="provider" bind:value={aiSettings.provider} class={field}>
				{#each providers as [value, name] (value)}
					<option {value}>{name}</option>
				{/each}
			</select>
		</div>

		{#if aiSettings.provider === 'compatible'}
			<div>
				<label class={label} for="base-url">Base URL</label>
				<input
					id="base-url"
					bind:value={aiSettings.baseUrl}
					class={field}
					placeholder="https://litellm.example.com/v1"
					autocomplete="off"
				/>
				<p class="mt-1.5 text-[13px] text-ink-mute">
					The server must allow requests from the browser (CORS). LiteLLM can also route to other
					providers such as Higgsfield.
				</p>
			</div>
		{/if}

		<div>
			<label class={label} for="api-key">API key</label>
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
				<label class={label} for="model">Model</label>
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
				<label class={label} for="size">Image size</label>
				<select id="size" bind:value={aiSettings.size} class={field}>
					<option value="1024x1024">1024 × 1024</option>
					<option value="1536x1024">1536 × 1024 (landscape)</option>
					<option value="1024x1536">1024 × 1536 (portrait)</option>
				</select>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<Button onclick={test} disabled={testState === 'testing'}>Test connection</Button>
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
				Prompt template
			</h2>
			<p class="mt-2 text-sm text-ink-mute">
				Wrapped around your image idea so the result is a clean line drawing. <code
					class="font-mono"
				>
					{'{prompt}'}
				</code> stands for your input.
			</p>
		</div>
		<div>
			<label class="sr-only" for="template">Prompt template</label>
			<textarea
				id="template"
				bind:value={aiSettings.promptTemplate}
				rows="9"
				class="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 font-mono text-sm text-ink"
			></textarea>
		</div>
		<Button onclick={() => aiSettings.resetPrompt()}>Restore default</Button>
	</section>
</main>
