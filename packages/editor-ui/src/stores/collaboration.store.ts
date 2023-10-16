/* eslint-disable @typescript-eslint/naming-convention */
import type { PushDataUsersForWorkflow } from '@/Interface';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUsersStore } from '@/stores';

export const useCollaborationStore = defineStore('collaboration', () => {
	// const usersStore = useUsersStore();
	const usersForWorkflows = ref<PushDataUsersForWorkflow>({});

	const workflowUsersUpdated = (data: PushDataUsersForWorkflow) => {
		usersForWorkflows.value = data;
	};

	return {
		usersForWorkflows,
		workflowUsersUpdated,
	};
});
