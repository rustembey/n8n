<template>
	<div ref="htmlEditor" class="ph-no-capture html-editor"></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import prettier from 'prettier/standalone';
import htmlParser from 'prettier/parser-html';
import cssParser from 'prettier/parser-postcss';
import jsParser from 'prettier/parser-babel';
import { htmlLanguage, autoCloseTags, html } from 'codemirror-lang-html-n8n';
import { insertNewlineAndIndent } from '@codemirror/commands';
import { bracketMatching, ensureSyntaxTree, LanguageSupport } from '@codemirror/language';

import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { htmlEditorEventBus } from '@/event-bus';
import { nonTakenRanges } from './HtmlEditor/utils';
import type { Range, Section } from './HtmlEditor/types';
import { codeEditorTheme } from './theme';
import useEditor from '@/composables/useEditor';

type HtmlEditorProps = {
	value: string;
	isReadOnly?: boolean;
	rows?: number;
	disableExpressionColoring?: boolean;
	disableExpressionCompletions?: boolean;
};

const htmlEditor = ref<HTMLDivElement>();
const props = withDefaults(defineProps<HtmlEditorProps>(), {
	isReadOnly: false,
	rows: -1,
	disableExpressionColoring: false,
	disableExpressionCompletions: false,
});

const emit = defineEmits<{
	(event: 'valueChanged', value: string | undefined): void;
}>();

const htmlWithCompletions = () =>
	new LanguageSupport(
		htmlLanguage,
		n8nCompletionSources().map((source) => htmlLanguage.data.of(source)),
	);

const getHighlighter = () => {
	if (props.disableExpressionColoring) return;
	return highlighter;
};

const { editor, content } = useEditor({
	container: htmlEditor,
	emit,
	value: props.value,
	isReadOnly: props.isReadOnly,
	rows: props.rows,
	extensions: {
		base: [
			props.disableExpressionCompletions ? html() : htmlWithCompletions(),
			codeEditorTheme({ isReadOnly: props.isReadOnly }),
		],
		writable: [autoCloseTags, bracketMatching(), expressionInputHandler()],
		keymap: [{ key: 'Enter', run: insertNewlineAndIndent }],
	},
	beforeValueChanged: (editor) => {
		// TODO: Implement this!
		// getHighlighter()?.removeColor(editor, this.htmlSegments);
		// getHighlighter()?.addColor(editor, this.resolvableSegments);
	},
});

const sections = computed<Section[]>(() => {
	const { state } = editor.value!;
	const doc = content.value!;

	const fullTree = ensureSyntaxTree(state, doc.length);

	if (fullTree === null) {
		throw new Error(`Failed to parse syntax tree for: ${doc}`);
	}

	let documentRange: Range = [-1, -1];
	const styleRanges: Range[] = [];
	const scriptRanges: Range[] = [];

	fullTree.cursor().iterate((node) => {
		if (node.type.name === 'Document') {
			documentRange = [node.from, node.to];
		}

		if (node.type.name === 'StyleSheet') {
			styleRanges.push([node.from - '<style>'.length, node.to + '</style>'.length]);
		}

		if (node.type.name === 'Script') {
			scriptRanges.push([node.from - '<script>'.length, node.to + ('<' + '/script>').length]);
			// typing the closing script tag in full causes ESLint, Prettier and Vite to crash
		}
	});

	const htmlRanges = nonTakenRanges(documentRange, [...styleRanges, ...scriptRanges]);

	const styleSections: Section[] = styleRanges.map(([start, end]) => ({
		kind: 'style' as const,
		range: [start, end],
		content: state.sliceDoc(start, end).replace(/<\/?style>/g, ''),
	}));

	const scriptSections: Section[] = scriptRanges.map(([start, end]) => ({
		kind: 'script' as const,
		range: [start, end],
		content: state.sliceDoc(start, end).replace(/<\/?script>/g, ''),
	}));

	const htmlSections: Section[] = htmlRanges.map(([start, end]) => ({
		kind: 'html' as const,
		range: [start, end] as Range,
		content: state.sliceDoc(start, end).replace(/<\/html>/g, ''),
		// opening tag may contain attributes, e.g. <html lang="en">
	}));

	return [...styleSections, ...scriptSections, ...htmlSections].sort(
		(a, b) => a.range[0] - b.range[0],
	);
});

const isMissingHtmlTags = () => {
	const zerothSection = sections.value.at(0);

	return (
		!zerothSection?.content.trim().startsWith('<html') &&
		!zerothSection?.content.trim().endsWith('</html>')
	);
};

const format = () => {
	if (sections.value.length === 1 && isMissingHtmlTags()) {
		const zerothSection = sections.value.at(0) as Section;

		const formatted = prettier
			.format(zerothSection.content, {
				parser: 'html',
				plugins: [htmlParser],
			})
			.trim();

		return editor.value!.dispatch({
			changes: { from: 0, to: content.value!.length, insert: formatted },
		});
	}

	const formatted = [];

	for (const { kind, content } of sections.value) {
		if (kind === 'style') {
			const formattedStyle = prettier.format(content, {
				parser: 'css',
				plugins: [cssParser],
			});

			formatted.push(`<style>\n${formattedStyle}</style>`);
		}

		if (kind === 'script') {
			const formattedScript = prettier.format(content, {
				parser: 'babel',
				plugins: [jsParser],
			});

			formatted.push(`<script>\n${formattedScript}<` + '/script>');
			// typing the closing script tag in full causes ESLint, Prettier and Vite to crash
		}

		if (kind === 'html') {
			const match = content.match(/(?<pre>[\s\S]*<html[\s\S]*?>)(?<rest>[\s\S]*)/);

			if (!match?.groups?.pre || !match.groups?.rest) continue;

			// Prettier cannot format pre-HTML section, e.g. <!DOCTYPE html>, so keep as is

			const { pre, rest } = match.groups;

			const formattedRest = prettier.format(rest, {
				parser: 'html',
				plugins: [htmlParser],
			});

			formatted.push(`${pre}\n${formattedRest}</html>`);
		}
	}

	if (formatted.length === 0) return;

	editor.value!.dispatch({
		changes: { from: 0, to: content.value!.length, insert: formatted.join('\n\n') },
	});
};

onMounted(() => {
	htmlEditorEventBus.on('format-html', format);

	// getHighlighter()?.addColor(editor.value!, resolvableSegments);
});

onUnmounted(() => {
	htmlEditorEventBus.off('format-html', format);
});
</script>

<script lang="ts">
import { defineComponent } from 'vue';
import { expressionManager } from '@/mixins/expressionManager';

export default defineComponent({ mixins: [expressionManager] });
</script>
