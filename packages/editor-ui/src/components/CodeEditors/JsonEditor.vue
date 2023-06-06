<template>
	<div ref="jsonEditor" class="ph-no-capture json-editor"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter as createLinter } from '@codemirror/lint';
import useEditor from '@/composables/useEditor';
type JsonEditorProps = {
	value: string;
	isReadOnly?: boolean;
	rows?: number;
};
const jsonEditor = ref<HTMLDivElement>();
const { value, isReadOnly, rows } = withDefaults(defineProps<JsonEditorProps>(), {
	isReadOnly: false,
	rows: 3,
});
const emit = defineEmits<{
	(event: 'valueChanged', value: string | undefined): void;
}>();
useEditor({
	container: jsonEditor,
	emit,
	value,
	isReadOnly,
	rows,
	extensions: {
		base: [json()],
		writable: [createLinter(jsonParseLinter())],
	},
});
</script>
