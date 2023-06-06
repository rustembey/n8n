import type { Ref } from 'vue';
import { computed, onMounted, ref } from 'vue';
import { autocompletion } from '@codemirror/autocomplete';
import { indentWithTab, history, redo, toggleComment } from '@codemirror/commands';
import { foldGutter, indentOnInput } from '@codemirror/language';
import { lintGutter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import {
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import type { ViewUpdate, KeyBinding } from '@codemirror/view';
import { codeEditorTheme } from '@/components/CodeEditors/theme';

interface Options {
	value: string;
	isReadOnly: boolean;
	rows: number;
	container: Ref<HTMLDivElement | undefined>;
	emit: (e: 'valueChanged', value: string | undefined) => void;
	beforeValueChanged?: (editor: EditorView) => void;
	extensions?: {
		base?: Extension[];
		writable?: Extension[];
		keymap?: KeyBinding[];
	};
}

export default (options: Options) => {
	const editor = ref<EditorView>();
	const content = computed(() => editor.value?.state.doc.toString());
	const { isReadOnly } = options;

	onMounted(() => {
		const parent = options.container?.value;
		if (!parent) throw new Error('Parent element does not exist');

		const extensions: Extension[] = [
			...(options.extensions?.base ?? []),
			lineNumbers(),
			EditorView.lineWrapping,
			EditorView.editable.of(!isReadOnly),
			EditorState.readOnly.of(isReadOnly),
			codeEditorTheme({ isReadOnly }),
		];

		if (!isReadOnly) {
			extensions.push(
				...(options.extensions?.writable ?? []),
				lintGutter(),
				history(),
				keymap.of([
					indentWithTab,
					{ key: 'Mod-Shift-z', run: redo },
					{ key: 'Mod-/', run: toggleComment },
					...(options.extensions?.keymap ?? []),
				]),
				autocompletion(),
				indentOnInput(),
				highlightActiveLine(),
				highlightActiveLineGutter(),
				foldGutter(),
				dropCursor(),
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					if (!viewUpdate.docChanged) return;
					options.beforeValueChanged?.(editor.value!);
					options.emit('valueChanged', content.value);
				}),
			);
		}

		let doc = options.value;
		if (doc === '' && options.rows > 0) {
			doc = '\n'.repeat(options.rows - 1);
		}

		const state = EditorState.create({ doc, extensions });
		editor.value = new EditorView({ parent, state });
	});

	return { editor, content };
};
