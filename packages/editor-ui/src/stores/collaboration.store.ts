/* eslint-disable @typescript-eslint/naming-convention */
import type { PushDataUsersForWorkflow } from '@/Interface';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useWorkflowsStore } from '@/stores';

export const useCollaborationStore = defineStore('collaboration', () => {
	const workflowStore = useWorkflowsStore();
	const usersForWorkflows = ref<PushDataUsersForWorkflow>({});

	const workflowUsersUpdated = (data: PushDataUsersForWorkflow) => {
		usersForWorkflows.value = data;
	};

	const getUsersForCurrentWorkflow = () => {
		const currentWorkflowId = workflowStore.workflowId;
		return usersForWorkflows.value[currentWorkflowId] || [];
	};

	return {
		usersForWorkflows,
		workflowUsersUpdated,
		getUsersForCurrentWorkflow,
	};
});
