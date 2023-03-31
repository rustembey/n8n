import { vi, describe, it, expect } from 'vitest';
import Vue from 'vue';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import { faker } from '@faker-js/faker';
import { STORES } from '@/constants';
import ExecutionsList from '@/components/ExecutionsView/ExecutionsList.vue';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { showMessage } from '@/mixins/showMessage';
import { i18nInstance } from '@/plugins/i18n';
import type { IWorkflowShortResponse } from '@/Interface';
import type { IExecutionsSummary } from 'n8n-workflow';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { debounceHelper } from '@/mixins/debounce';
import * as workflowAPI from '@/api/workflows';

const waitAllPromises = () => new Promise((resolve) => setTimeout(resolve));

const workflowDataFactory = (): IWorkflowShortResponse => ({
	createdAt: faker.date.past().toDateString(),
	updatedAt: faker.date.past().toDateString(),
	id: faker.datatype.uuid(),
	name: faker.datatype.string(),
	active: faker.datatype.boolean(),
	tags: [],
});

const executionDataFactory = (): IExecutionsSummary => ({
	id: faker.datatype.uuid(),
	finished: faker.datatype.boolean(),
	mode: faker.helpers.arrayElement(['manual', 'trigger']),
	startedAt: faker.date.past(),
	stoppedAt: faker.date.past(),
	workflowId: faker.datatype.number().toString(),
	workflowName: faker.datatype.string(),
	status: faker.helpers.arrayElement(['failed', 'success']),
	nodeExecutionStatus: {},
});

const workflowsData = workflowDataFactory();

const executionsData = Array.from({ length: 2 }, () => ({
	count: 20,
	results: Array.from({ length: 10 }, executionDataFactory),
	estimated: false,
}));

const getPastExecutionsSpy = vi.fn().mockResolvedValue({ count: 0, results: [], estimated: false });

vi.spyOn(workflowAPI, 'getCurrentExecutions').mockResolvedValue([]);
vi.spyOn(workflowAPI, 'getFinishedExecutions').mockResolvedValue(executionsData[0].results);

const mockRestApiMixin = Vue.extend({
	methods: {
		restApi() {
			return {
				getWorkflow: vi.fn().mockResolvedValue(workflowsData),
				getActiveWorkflows: vi.fn().mockResolvedValue(['1', '2']),
				getPastExecutions: getPastExecutionsSpy,
				getCurrentExecutions: getPastExecutionsSpy,
			};
		},
	},
});

const mockRoute = {
	params: {
		name: '1',
	},
};

const mockRouter = {
	push: vi.fn(),
};

const renderOptions = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					templates: {
						enabled: true,
						host: 'https://api.n8n.io/api/',
					},
					license: {
						environment: 'development',
					},
					deployment: {
						type: 'default',
					},
					enterprise: {
						advancedExecutionFilters: true,
					},
				},
			},
		},
	}),
	i18n: i18nInstance,
	stubs: ['font-awesome-icon', 'router-view'],
	mixins: [executionHelpers, showMessage, mockRestApiMixin, debounceHelper, workflowHelpers],
	mocks: {
		$router: mockRouter,
		$route: mockRoute,
	},
};

function TelemetryPlugin(vue: typeof Vue): void {
	Object.defineProperty(vue, '$telemetry', {
		get() {
			return {
				track: () => {},
			};
		},
	});
	Object.defineProperty(vue.prototype, '$telemetry', {
		get() {
			return {
				track: () => {},
			};
		},
	});
}

Vue.use(TelemetryPlugin);
Vue.use(PiniaVuePlugin);

const renderComponent = async () => {
	const renderResult = render(ExecutionsList, renderOptions);
	await waitAllPromises();

	return renderResult;
};

describe('ExecutionsList.vue', () => {
	it('should render component correctly', async () => {
		const { getAllByTestId, queryByTestId, getByTestId } = await renderComponent();
		expect(queryByTestId('execution-card-temporary')).not.toBeInTheDocument();
		expect(getAllByTestId('execution-card')).toBeInTheDocument();
		// expect(getByTestId('test-div')).toHaveTextContent('1');
	});
});
