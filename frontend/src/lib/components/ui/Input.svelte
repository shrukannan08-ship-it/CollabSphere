<script lang="ts">
	interface Props {
		label?: string;
		id?: string;
		type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'search';
		value?: any;
		placeholder?: string;
		error?: string;
		hint?: string;
		disabled?: boolean;
		required?: boolean;
		min?: number | string;
		max?: number | string;
		step?: number | string;
		autocomplete?: any;
		oninput?: (e: Event) => void;
		onblur?: (e: FocusEvent) => void;
		class?: string;
	}

	let {
		label = '',
		id,
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		error = '',
		hint = '',
		disabled = false,
		required = false,
		min,
		max,
		step,
		autocomplete,
		oninput,
		onblur,
		class: extraClass = ''
	}: Props = $props();

	let autoId = 'input-' + Math.random().toString(36).slice(2, 9);
	const fieldId = $derived(id || autoId);
	let showPassword = $state(false);
	const inputType = $derived(type === 'password' && showPassword ? 'text' : type);
</script>

<div class="field {extraClass}">
	{#if label}
		<label class="field-label" for={fieldId}>
			{label}
			{#if required}<span class="field-required" aria-hidden="true">*</span>{/if}
		</label>
	{/if}

	<div class="field-control" class:field-control-error={!!error}>
		<input
			id={fieldId}
			type={inputType}
			bind:value
			{placeholder}
			{disabled}
			{required}
			{min}
			{max}
			{step}
			{autocomplete}
			class="field-input"
			aria-invalid={!!error}
			aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
			{oninput}
			{onblur}
		/>
		{#if type === 'password'}
			<button
				type="button"
				class="field-toggle"
				onclick={() => (showPassword = !showPassword)}
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				{#if showPassword}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
						<line x1="1" y1="1" x2="23" y2="23"/>
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
						<circle cx="12" cy="12" r="3"/>
					</svg>
				{/if}
			</button>
		{/if}
	</div>

	{#if error}
		<p class="field-error" id="{id}-error" role="alert">{error}</p>
	{:else if hint}
		<p class="field-hint" id="{id}-hint">{hint}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.field-required {
		color: var(--color-error);
	}

	.field-control {
		position: relative;
		display: flex;
		align-items: center;
	}

	.field-input {
		width: 100%;
		height: 42px;
		padding: 0 14px;
		background: var(--color-surface);
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		color: var(--color-text-primary);
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
		outline: none;
	}

	.field-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.field-input:focus {
		border-color: var(--color-primary-400);
		box-shadow: 0 0 0 3px rgba(91, 76, 245, 0.12);
	}

	.field-input:disabled {
		background: var(--color-neutral-100);
		color: var(--color-text-tertiary);
		cursor: not-allowed;
	}

	.field-control-error .field-input {
		border-color: var(--color-error);
	}

	.field-control-error .field-input:focus {
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
	}

	.field-toggle {
		position: absolute;
		right: 12px;
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 4px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
	}
	.field-toggle:hover {
		color: var(--color-text-secondary);
	}

	/* When password toggle is present, add right padding to input */
	.field-control:has(.field-toggle) .field-input {
		padding-right: 40px;
	}

	.field-error {
		font-size: 0.8125rem;
		color: var(--color-error);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.field-hint {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
	}
</style>
