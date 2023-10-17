/* eslint-disable @typescript-eslint/naming-convention */
import type { IWorkflowData, PushDataUsersForWorkflow } from '@/Interface';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { usePushConnectionStore, useWorkflowsStore } from '@/stores';

export const useCollaborationStore = defineStore('collaboration', () => {
	const workflowStore = useWorkflowsStore();
	const pushStore = usePushConnectionStore();
	const usersForWorkflows = ref<PushDataUsersForWorkflow>({});

	const workflowUsersUpdated = (data: PushDataUsersForWorkflow) => {
		usersForWorkflows.value = data;
	};

	const getUsersForCurrentWorkflow = () => {
		const currentWorkflowId = workflowStore.workflowId;
		return usersForWorkflows.value[currentWorkflowId]?.map((u) => u.user) || [];
	};

	const notifyWorkflowOpened = (workflowId: string) => {
		pushStore.send({
			type: 'workflowOpened',
			workflowId,
		});
	};

	const notifyWorkflowClosed = (workflowId: string) => {
		pushStore.send({ type: 'workflowClosed', workflowId });
	};

	const notifyWorkflowChanged = (workflow: IWorkflowData) => {
		pushStore.send({
			type: 'workflowChanged',
			workflowId: workflow.id,
			workflowJson: workflow,
		});
	};

	return {
		usersForWorkflows,
		workflowUsersUpdated,
		getUsersForCurrentWorkflow,
		notifyWorkflowChanged,
		notifyWorkflowOpened,
		notifyWorkflowClosed,
	};
});
