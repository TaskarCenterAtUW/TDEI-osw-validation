import { createReadStream, readFile, readFileSync } from 'fs';
import { Core } from 'nodets-ms-core';
import dotenv from 'dotenv';
import { StorageClient, StorageContainer } from 'nodets-ms-core/lib/core/storage';
import { Readable } from 'stream';
import path from 'path';
import { randomUUID } from 'crypto';
import mime from 'mime';
import { QueueMessage } from 'nodets-ms-core/lib/core/queue';
import { QueueMessageContent } from '../../model/queue-message-model';
// group test using describe
describe("Simulate the OSW queue message", () => {
    dotenv.config({ path: './.test.env' });
    const dir = process.cwd();

    it("Should run the tests", async () => {
        //Load environment variables
        const validationTopic = process.env.VALIDATION_TOPIC;
        const containerName = process.env.CONTAINER_NAME ?? "osw";

        //Initialize the local provider
        Core.initialize({ provider: "Local" });
        //Read the test cases
        readFile(`${dir}/src/__test__/asset/tests.json`, 'utf8', (error, data) => {
            if (error) {
                console.log(error);
                return;
            }
            //Parse
            let test_cases: Array<{ name: string, input_file: string, message_data: string, expected_result: boolean }> = JSON.parse(data).tests;
            //Execute each test case
            test_cases.forEach(async test => {
                try {
                    // Create storage client
                    const storageClient: StorageClient = Core.getStorageClient()!;
                    // Get a container in the storage client
                    const storageContaiener: StorageContainer = await storageClient.getContainer(containerName);
                    let filePath = path.parse(test.input_file);
                    let fileName = `${filePath.name}_${randomUUID()}`;
                    let mimeType = mime.getType(filePath.ext);
                    let fileEntity = storageContaiener.createFile(`test_upload/${fileName}`, mimeType!);
                    let stream = createReadStream(`${dir}/src/__test__/${test.input_file}`);
                    //Upload file
                    let uploadedEntity = await fileEntity.upload(stream);
                    let uploadedFilePath = uploadedEntity.filePath;
                    //Read message data
                    let messageData = readFileSync(`${dir}/src/__test__/${test.message_data}`, 'utf8');
                    let data: QueueMessageContent = QueueMessageContent.from(JSON.parse(messageData));
                    data.meta.filePath = uploadedFilePath;
                    let upload_message = <QueueMessage>{
                        messageId: randomUUID(),
                        message: test.name,
                        messageType: 'OSW-Upload',
                        data: data
                    };
                    //Publish to topic
                    let topic = Core.getTopic(validationTopic!);
                    topic.publish(upload_message);

                } catch (error) {
                    console.error(error);
                }
            });
        })

    });
});