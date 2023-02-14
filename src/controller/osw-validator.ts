import { Core } from "nodets-ms-core";
import { ILoggable } from "nodets-ms-core/lib/core/logger/abstracts/ILoggable";
import { QueueMessage } from "nodets-ms-core/lib/core/queue";
import { ITopicSubscription } from "nodets-ms-core/lib/core/queue/abstracts/IMessage-topic";
import { Topic } from "nodets-ms-core/lib/core/queue/topic";
import { FileEntity } from "nodets-ms-core/lib/core/storage";
import { unescape } from "querystring";
import { environment } from "../environment/environment";
import { OswUpload } from "../model/event/osw-upload";
import { QueueMessageContent } from "../model/queue-message-model";
import { IValidator } from "./interface/IValidator";


export class OswValidator implements IValidator, ITopicSubscription {

    readonly listeningTopicName = environment.eventBus.uploadTopic ?? "";
    readonly publishingTopicName = environment.eventBus.validationTopic ?? "";
    readonly subscriptionName = environment.eventBus.uploadSubscription ?? "";
    listeningTopic: Topic;
    publishingTopic: Topic;
    logger: ILoggable;

    constructor() {
        Core.initialize();
        this.listeningTopic = Core.getTopic(this.listeningTopicName);
        this.publishingTopic = Core.getTopic(this.publishingTopicName);
        this.logger = Core.getLogger();
        this.listeningTopic.subscribe(this.subscriptionName, this).catch((error) => {
            console.error('Error while subscribing');
            console.error(error);
        });
    }

    onReceive(message: QueueMessage) {
        console.log('Received message');
        console.log(message);
        this.validate(message);

    }

    onError(error: Error) {
        console.error('Received error');
        console.error(error);
    }


    async validate(messageReceived: QueueMessage): Promise<void> {
        var queueMessage: QueueMessageContent = QueueMessageContent.from(messageReceived.data);
        if (!queueMessage.response.success) {
            console.error("Received failed workflow request:", messageReceived);
            return;
        }

        if (!queueMessage.meta.file_upload_path) {
            console.error("Request does not have valid file path specified.", messageReceived);
            return;
        }

        if (!await queueMessage.hasPermission(["tdei-admin", "poc", "osw_data_generator"])) {
            return;
        }

        console.log(queueMessage.meta.file_upload_path);
        //https://xxxx-namespace.blob.core.windows.net/osw/2022%2FNOVEMBER%2F101%2Ffile_1669110207839_1518e1dd1d4741a19a5dbed8f9b8d0a1.zip
        let url = unescape(queueMessage.meta.file_upload_path)
        let fileEntity = await Core.getStorageClient()?.getFileFromUrl(url);
        if (fileEntity) {
            // get the validation result
            let validationResult = await this.validateOSW(fileEntity, queueMessage);
            this.sendStatus(queueMessage, validationResult);
        }
        else {
            this.sendStatus(queueMessage, { isValid: false, validationMessage: 'File entity not found' });
        }
    }

    validateOSW(file: FileEntity, queueMessage: QueueMessageContent): Promise<ValidationResult> {
        const gtfsUploadRequestInfo = OswUpload.from(queueMessage.request);

        return new Promise((resolve, reject) => {

            try {
                // let content = file.getStream() // This gets the data stream of the file. This can be used for actual validation
                const fileName = unescape(file.fileName);
                console.log(fileName);
                if (fileName.includes('invalid')) {
                    // validation failed
                    resolve({
                        isValid: false,
                        validationMessage: 'file name contains invalid'
                    });
                }
                else {
                    // validation is successful
                    resolve({
                        isValid: true,
                        validationMessage: ''
                    });
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }

    private sendStatus(receivedQueueMessage: QueueMessageContent, result: ValidationResult) {
        receivedQueueMessage.meta.isValid = result.isValid;
        receivedQueueMessage.meta.validationTime = 90; // This is hardcoded.
        receivedQueueMessage.meta.validationMessage = result.validationMessage;
        this.publishingTopic.publish(QueueMessage.from(
            {
                messageType: 'osw-validation',
                data: receivedQueueMessage
            }
        ));
    }

}


interface ValidationResult {
    isValid: boolean,
    validationMessage: string
}