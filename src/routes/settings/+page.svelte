<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import { listModels, type ProviderId } from '#lib/ai/images.ts';
	import { aiSettings } from '#lib/ai/settings.svelte.ts';

	let models = $state<string[]>([]);
	let testState = $state<'idle' | 'testing' | 'ok' | 'error'>('idle');
	let testMessage = $state('');

	const providers: [ProviderId, string][] = [
		['openai', 'OpenAI'],
		['compatible', 'OpenAI-kompatibel (z.B. LiteLLM)']
	];

	async function test() {
		testState = 'testing';
		testMessage = '';
		try {
			models = await listModels(aiSettings.config);
			testState = 'ok';
			testMessage = `Verbunden, ${models.length} Modelle gefunden.`;
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
			<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">KI-Anbieter</h1>
			<p class="mt-2 text-sm text-ink-mute">
				Der Schlüssel bleibt nur in diesem Browser gespeichert und geht direkt an den Anbieter, nie
				an einen inkbot-Server.
			</p>
		</div>

		<div>
			<label class={label} for="provider">Anbieter</label>
			<select id="provider" bind:value={aiSettings.provider} class={field}>
				{#each providers as [value, name] (value)}
					<option {value}>{name}</option>
				{/each}
			</select>
		</div>

		{#if aiSettings.provider === 'compatible'}
			<div>
				<label class={label} for="base-url">Basis-URL</label>
				<input
					id="base-url"
					bind:value={aiSettings.baseUrl}
					class={field}
					placeholder="https://litellm.example.com/v1"
					autocomplete="off"
				/>
				<p class="mt-1.5 text-[13px] text-ink-mute">
					Der Server muss Anfragen aus dem Browser erlauben (CORS). Über LiteLLM lassen sich auch
					andere Anbieter wie Higgsfield einbinden.
				</p>
			</div>
		{/if}

		<div>
			<label class={label} for="api-key">API-Schlüssel</label>
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
				<label class={label} for="model">Modell</label>
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
				<label class={label} for="size">Bildgrösse</label>
				<select id="size" bind:value={aiSettings.size} class={field}>
					<option value="1024x1024">1024 × 1024</option>
					<option value="1536x1024">1536 × 1024 (quer)</option>
					<option value="1024x1536">1024 × 1536 (hoch)</option>
				</select>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<Button onclick={test} disabled={testState === 'testing'}>Verbindung testen</Button>
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
			<h2 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">Prompt-Vorlage</h2>
			<p class="mt-2 text-sm text-ink-mute">
				Wird um Deine Bildidee gelegt, damit saubere Strichzeichnungen entstehen. <code
					class="font-mono"
				>
					{'{prompt}'}
				</code> steht für Deine Eingabe.
			</p>
		</div>
		<div>
			<label class="sr-only" for="template">Prompt-Vorlage</label>
			<textarea
				id="template"
				bind:value={aiSettings.promptTemplate}
				rows="9"
				class="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 font-mono text-sm text-ink"
			></textarea>
		</div>
		<Button onclick={() => aiSettings.resetPrompt()}>Standard wiederherstellen</Button>
	</section>
</main>
