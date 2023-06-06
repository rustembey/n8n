<template>
	<div ref="sqlEditor" class="ph-no-capture sql-editor"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// import { MSSQL, MySQL, PostgreSQL, sql, StandardSQL } from '@codemirror/lang-sql';
import type { SQLDialect } from 'n8n-workflow';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import useEditor from '@/composables/useEditor';
import {
	keywordCompletion,
	MSSQL,
	MySQL,
	PostgreSQL,
	schemaCompletion,
	StandardSQL,
	MariaSQL,
	SQLite,
	Cassandra,
	PLSQL,
} from './SqlEditor/sql-parser-skipping-whitespace';
import type { SQLDialect as SQLDialectType } from './SqlEditor/sql-parser-skipping-whitespace';
import { LanguageSupport } from '@codemirror/language';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';

type SQLEditorProps = {
	value: string;
	dialect: SQLDialect;
	isReadOnly?: boolean;
	rows?: number;
};

const SQL_DIALECTS = {
	StandardSQL,
	PostgreSQL,
	MySQL,
	MariaSQL,
	MSSQL,
	SQLite,
	Cassandra,
	PLSQL,
} as const;

function sqlLanguageSupport(dialect: SQLDialectType) {
	return new LanguageSupport(dialect.language, [
		schemaCompletion({}),
		keywordCompletion(dialect, true),
		n8nCompletionSources().map((source) => dialect.language.data.of(source)),
	]);
}

const sqlEditor = ref<HTMLDivElement>();

const { value, dialect, isReadOnly, rows } = withDefaults(defineProps<SQLEditorProps>(), {
	isReadOnly: false,
	rows: 3,
});

const emit = defineEmits<{
	(event: 'valueChanged', value: string | undefined): void;
}>();

useEditor({
	container: sqlEditor,
	emit,
	value,
	isReadOnly,
	rows,
	extensions: {
		base: [sqlLanguageSupport(SQL_DIALECTS[dialect])],
		writable: [expressionInputHandler()],
	},
	beforeValueChanged: (editor) => {
		// TODO: Implement this:
		// highlighter.removeColor(editor, plaintextSegments);
		// highlighter.addColor(editor, resolvableSegments);
	},
});
</script>

<script lang="ts">
import { defineComponent } from 'vue';
import { expressionManager } from '@/mixins/expressionManager';
// TODO: CHECK THIS
export default defineComponent({ mixins: [expressionManager] });
</script>
