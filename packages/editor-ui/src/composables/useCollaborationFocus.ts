import { watchEffect } from 'vue';
import { useCollaborationStore, useUIStore, useWorkflowsStore } from '../stores';

export function useCollaborationFocus() {
	console.log('useCollaborationFocus');
	const uiStore = useUIStore();
	const workflowStore = useWorkflowsStore();
	const collaborationStore = useCollaborationStore();

	watchEffect(async () => {
		const selection = uiStore.selectedNodes;
		const workflowId = workflowStore.workflowId;
		console.log('newSelection', selection);

		if (workflowId) {
			collaborationStore.notifyFocusChanged(
				workflowId,
				selection.map((n) => n.id),
			);
		}
	});
}
