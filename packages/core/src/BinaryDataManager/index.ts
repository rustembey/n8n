import { Service } from 'typedi';
import { readFile, stat } from 'fs/promises';
import type { BinaryMetadata, IBinaryData, INodeExecutionData } from 'n8n-workflow';
import prettyBytes from 'pretty-bytes';
import type { Readable } from 'stream';
import { BINARY_ENCODING } from 'n8n-workflow';
import type { BinaryData, IBinaryDataManager } from '../Interfaces';
import { FileSystemBinaryDataManager } from './FileSystem';
import { binaryToBuffer } from './utils';
import { ObjectStoreBinaryDataManager } from './ObjectStore';

@Service()
export class BinaryDataManager {
	private binaryDataMode: BinaryData.Mode = 'default';

	private managers: Partial<Record<BinaryData.Mode, IBinaryDataManager>> = {};

	async init(config: BinaryData.Config, mainManager = false) {
		this.binaryDataMode = config.mode;

		if (config.availableModes.includes('filesystem')) {
			this.managers.filesystem = new FileSystemBinaryDataManager(
				config as BinaryData.FileSystemConfig,
			);
		}
		if (config.availableModes.includes('objectStore')) {
			this.managers.objectStore = new ObjectStoreBinaryDataManager();
		}

		await Promise.all(
			Object.values(this.managers).map(async (manager) => manager.init(mainManager)),
		);
	}

	async copyBinaryFile(
		binaryData: IBinaryData,
		filePath: string,
		executionId: string,
	): Promise<IBinaryData> {
		// If a manager handles this binary, copy over the binary file and return its reference id.
		const manager = this.managers[this.binaryDataMode];
		if (manager) {
			const identifier = await manager.copyBinaryFile(filePath, executionId);
			// Add data manager reference id.
			binaryData.id = this.generateBinaryId(identifier);

			// Prevent preserving data in memory if handled by a data manager.
			binaryData.data = this.binaryDataMode;

			const fileSize = await manager.getFileSize(identifier);
			binaryData.fileSize = prettyBytes(fileSize);

			await manager.storeBinaryMetadata(identifier, {
				fileName: binaryData.fileName,
				mimeType: binaryData.mimeType,
				fileSize,
			});
		} else {
			const { size } = await stat(filePath);
			binaryData.fileSize = prettyBytes(size);
			binaryData.data = await readFile(filePath, { encoding: BINARY_ENCODING });
		}

		return binaryData;
	}

	async storeBinaryData(
		binaryData: IBinaryData,
		input: Buffer | Readable,
		executionId: string,
	): Promise<IBinaryData> {
		// If a manager handles this binary, return the binary data with its reference id.
		const manager = this.managers[this.binaryDataMode];
		if (manager) {
			const identifier = await manager.storeBinaryData(input, executionId);

			// Add data manager reference id.
			binaryData.id = this.generateBinaryId(identifier);

			// Prevent preserving data in memory if handled by a data manager.
			binaryData.data = this.binaryDataMode;

			const fileSize = await manager.getFileSize(identifier);
			binaryData.fileSize = prettyBytes(fileSize);

			await manager.storeBinaryMetadata(identifier, {
				fileName: binaryData.fileName,
				mimeType: binaryData.mimeType,
				fileSize,
			});
		} else {
			const buffer = await binaryToBuffer(input);
			binaryData.data = buffer.toString(BINARY_ENCODING);
			binaryData.fileSize = prettyBytes(buffer.length);
		}

		return binaryData;
	}

	getBinaryStream(identifier: string, chunkSize?: number): Readable {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		const manager = this.managers[mode];
		if (manager) {
			return manager.getBinaryStream(id, chunkSize);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async retrieveBinaryData(binaryData: IBinaryData): Promise<Buffer> {
		if (binaryData.id) {
			return this.retrieveBinaryDataByIdentifier(binaryData.id);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		const manager = this.managers[mode];
		if (manager) {
			return manager.retrieveBinaryDataByIdentifier(id);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	getBinaryPath(identifier: string): string {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		const manager = this.managers[mode];
		if (manager) {
			return manager.getBinaryPath(id);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async getBinaryMetadata(identifier: string): Promise<BinaryMetadata> {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		const manager = this.managers[mode];
		if (manager) {
			return manager.getBinaryMetadata(id);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async markDataForDeletionByExecutionId(executionId: string): Promise<void> {
		const manager = this.managers[this.binaryDataMode];
		await manager?.markDataForDeletionByExecutionId(executionId);
	}

	async markDataForDeletionByExecutionIds(executionIds: string[]): Promise<void> {
		const manager = this.managers[this.binaryDataMode];
		if (manager) {
			await Promise.all(
				executionIds.map(async (id) => manager.markDataForDeletionByExecutionId(id)),
			);
		}
	}

	async persistBinaryDataForExecutionId(executionId: string): Promise<void> {
		const manager = this.managers[this.binaryDataMode];
		await manager?.persistBinaryDataForExecutionId(executionId);
	}

	async deleteBinaryDataByExecutionId(executionId: string): Promise<void> {
		const manager = this.managers[this.binaryDataMode];
		await manager?.deleteBinaryDataByExecutionId(executionId);
	}

	async duplicateBinaryData(
		inputData: Array<INodeExecutionData[] | null> | unknown,
		executionId: string,
	): Promise<INodeExecutionData[][]> {
		const manager = this.managers[this.binaryDataMode];
		if (inputData && manager) {
			const returnInputData = (inputData as INodeExecutionData[][]).map(
				async (executionDataArray) => {
					if (executionDataArray) {
						return Promise.all(
							executionDataArray.map(async (executionData) => {
								if (executionData.binary) {
									return this.duplicateBinaryDataInExecData(executionData, executionId);
								}

								return executionData;
							}),
						);
					}

					return executionDataArray;
				},
			);

			return Promise.all(returnInputData);
		}

		return inputData as INodeExecutionData[][];
	}

	private generateBinaryId(filename: string) {
		return `${this.binaryDataMode}:${filename}`;
	}

	private splitBinaryModeFileId(fileId: string): { mode: BinaryData.Mode; id: string } {
		const [mode, id] = fileId.split(':');
		return { mode: mode as BinaryData.Mode, id };
	}

	private async duplicateBinaryDataInExecData(
		executionData: INodeExecutionData,
		executionId: string,
	): Promise<INodeExecutionData> {
		const manager = this.managers[this.binaryDataMode];
		if (executionData.binary) {
			const binaryDataKeys = Object.keys(executionData.binary);
			const bdPromises = binaryDataKeys.map(async (key: string) => {
				if (!executionData.binary) {
					return { key, newId: undefined };
				}

				const binaryDataId = executionData.binary[key].id;
				if (!binaryDataId) {
					return { key, newId: undefined };
				}

				// TODO: use awaits instead of chaining
				return manager
					?.duplicateBinaryDataByIdentifier(
						this.splitBinaryModeFileId(binaryDataId).id,
						executionId,
					)
					.then((filename) => ({
						newId: this.generateBinaryId(filename),
						key,
					}));
			});

			return Promise.all(bdPromises).then((b) => {
				return b.reduce((acc, curr) => {
					if (acc.binary && curr) {
						acc.binary[curr.key].id = curr.newId;
					}

					return acc;
				}, executionData);
			});
		}

		return executionData;
	}
}
