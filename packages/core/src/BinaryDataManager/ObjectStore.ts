import type { IBinaryDataManager } from '@/Interfaces';
import type { BinaryMetadata } from 'n8n-workflow';
import type { Readable } from 'stream';
import type { Request } from 'aws4';
import { sign } from 'aws4';

export class ObjectStoreBinaryDataManager implements IBinaryDataManager {
	async init(startPurger: boolean): Promise<void> {
		// throw new Error('Method not implemented.');
	}

	async getFileSize(filePath: string): Promise<number> {
		throw new Error('Method not implemented.');
	}

	async copyBinaryFile(filePath: string, executionId: string): Promise<string> {
		throw new Error('Method not implemented.');
	}

	async storeBinaryMetadata(identifier: string, metadata: BinaryMetadata): Promise<void> {
		throw new Error('Method not implemented.');
	}

	async getBinaryMetadata(identifier: string): Promise<BinaryMetadata> {
		throw new Error('Method not implemented.');
	}

	async storeBinaryData(binaryData: Buffer | Readable, executionId: string): Promise<string> {
		const signOpts = {
			headers: {},
			region: region || credentials.region,
			host: endpoint.host,
			method,
			path: '',
			service: 's3',
			body: {},
		} as Request;

		sign(signOpts, {
			accessKeyId: 'F0iIeXKAaZJu57Vu',
			secretAccessKey: 'KsK19cWzztODYfU7cBuZcbBjKVOEeOdz',
		});
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		throw new Error('Method not implemented.');
	}

	getBinaryPath(identifier: string): string {
		throw new Error('Method not implemented.');
	}

	getBinaryStream(identifier: string, chunkSize?: number | undefined): Readable {
		throw new Error('Method not implemented.');
	}

	async markDataForDeletionByExecutionId(executionId: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	async deleteMarkedFiles(): Promise<unknown> {
		throw new Error('Method not implemented.');
	}

	async deleteBinaryDataByIdentifier(identifier: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	async duplicateBinaryDataByIdentifier(binaryDataId: string, prefix: string): Promise<string> {
		throw new Error('Method not implemented.');
	}

	async deleteBinaryDataByExecutionId(executionId: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	async persistBinaryDataForExecutionId(executionId: string): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
