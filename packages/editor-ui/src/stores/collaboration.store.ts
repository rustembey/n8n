/* eslint-disable @typescript-eslint/naming-convention */
import type { CollaborationUser } from '@/Interface';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUsersStore } from '@/stores';

type UserMap = { [userId: string]: CollaborationUser };

export const useCollaborationStore = defineStore('collaboration', () => {
	const usersStore = useUsersStore();
	const users = ref<UserMap>({});

	const mockUsers: UserMap = {
		'569af72d-d338-45ca-b81d-e1bb52614b45': {
			createdAt: '2023-01-25T16:36:13.667Z',
			id: '569af72d-d338-45ca-b81d-e1bb52614b45',
			email: 'milorad.filipovic19@gmail.com',
			firstName: 'Milorad',
			lastName: 'Filipovic',
			isOwner: true,
			fullName: 'Milorad Filipovic',
		},
		'569af72d-d338-45ca-b81d-e1bb52614b46': {
			createdAt: '2023-01-25T16:36:13.667Z',
			id: '569af72d-d338-45ca-b81d-e1bb52614b46',
			email: 'someone.else@n8n.io',
			firstName: 'Someone',
			lastName: 'Else',
			isOwner: false,
			fullName: 'Someone Else',
		},
		'569af72d-d338-45ca-b81d-e1bb52614b47': {
			createdAt: '2023-01-25T16:36:13.667Z',
			id: '569af72d-d338-45ca-b81d-e1bb52614b47',
			email: 'another.one@n8n.io',
			firstName: 'Another',
			lastName: 'One',
			isOwner: false,
			fullName: 'Another One',
		},
	};

	const onWorkflowOpened = () => {
		console.log('onWorkflowOpened');
		const currentUserId = usersStore.currentUserId;
		// Return mockUsers without current user
		users.value = Object.keys(mockUsers).reduce((acc, userId) => {
			if (userId !== currentUserId) {
				acc[userId] = mockUsers[userId];
			}
			return acc;
		}, {} as UserMap);
	};

	const onWorkflowClosed = () => {
		console.log('onWorkflowClosed');
		const currentUserId = usersStore.currentUserId;
		users.value = Object.keys(mockUsers).reduce((acc, userId) => {
			if (userId !== currentUserId) {
				acc[userId] = mockUsers[userId];
			}
			return acc;
		}, {} as UserMap);
	};

	return {
		users,
		onWorkflowOpened,
		onWorkflowClosed,
	};
});
