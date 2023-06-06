<template>
	<div ref="jsEditor" class="ph-no-capture js-editor"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { javascript } from '@codemirror/lang-javascript';
import useEditor from '@/composables/useEditor';
type JsEditorProps = {
	value: string;
	isReadOnly?: boolean;
	rows?: number;
};
const jsEditor = ref<HTMLDivElement>();
const { value, isReadOnly, rows } = withDefaults(defineProps<JsEditorProps>(), {
	isReadOnly: false,
	rows: 3,
});
const emit = defineEmits<{
	(event: 'valueChanged', value: string | undefined): void;
}>();
useEditor({
	container: jsEditor,
	emit,
	value,
	isReadOnly,
	rows,
	extensions: {
		base: [javascript()],
	},
});
</script>
