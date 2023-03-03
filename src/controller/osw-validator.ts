import { randomUUID } from "crypto";
import { Core } from "nodets-ms-core";
import { ILoggable } from "nodets-ms-core/lib/core/logger/abstracts/ILoggable";
import { QueueMessage } from "nodets-ms-core/lib/core/queue";
import { ITopicSubscription } from "nodets-ms-core/lib/core/queue/abstracts/IMessage-topic";
import { Topic } from "nodets-ms-core/lib/core/queue/topic";
import { FileEntity } from "nodets-ms-core/lib/core/storage";
import { resolve } from "path";
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
        this.validate(message);
    }

    onError(error: Error) {
        console.error('Received error');
        console.error(error);
    }


    async validate(messageReceived: QueueMessage): Promise<void> {
        var tdeiRecordId = "";
        try {
            var queueMessage: QueueMessageContent = QueueMessageContent.from(messageReceived.data);
            tdeiRecordId = queueMessage.tdeiRecordId!;

            console.log("Received message for : ", queueMessage.tdeiRecordId, "Message received for osw validation !");

            if (!queueMessage.response.success) {
                let errorMessage = "Received failed workflow request";
                console.error(queueMessage.tdeiRecordId, errorMessage, messageReceived);
                return Promise.resolve();
            }

            if (!queueMessage.meta.file_upload_path) {
                let errorMessage = "Request does not have valid file path specified.";
                console.error(queueMessage.tdeiRecordId, errorMessage, messageReceived);
                throw Error(errorMessage);
            }

            if (!await queueMessage.hasPermission(["tdei-admin", "poc", "osw_data_generator"])) {
                let errorMessage = "Unauthorized request !";
                console.error(queueMessage.tdeiRecordId, errorMessage);
                throw Error(errorMessage);
            }

            let url = unescape(queueMessage.meta.file_upload_path)
            let fileEntity = await Core.getStorageClient()?.getFileFromUrl(url);
            if (fileEntity) {
                let validationResult = await this.dummyValidateOSW(fileEntity, queueMessage);//TODO: Replace this with validateOSW actual function.
                this.sendStatus(validationResult, messageReceived);
            }
            else {
                throw Error("File entity not found");
            }
        } catch (error) {
            console.error(tdeiRecordId, 'Error occured while validating osw request', error);
            this.sendStatus({ isValid: false, validationMessage: 'Error occured while validating osw request' + error }, messageReceived);
            return Promise.resolve();
        }
    }

    getFileEntity(queueMessage: QueueMessageContent) { }

    /**
    * Actual validateOSW function to be prefilled and sent back
    * @param file - FileEntity
    * @param queueMessage - QueueMessageContent
    * @returns Promise<ValidationResult>  with the validation result and message
    */
    validateOSW(file: FileEntity, queueMessage: QueueMessageContent): Promise<ValidationResult> {
        return new Promise(async (resolve, reject) => {
            // Write the actual validation code here.

            // Get the file stream from the below code
            let fileStream = await file.getStream();
            // Do the rest of the processing

            // To return validation true, use the below line
            // resolve({isValid:true,validationMessage:''});

            // To return validation fail with message, use the line below
            // resolve({isValid:false,validationMessage:'Validation Error message'});


        });
    }


    /**
     * Dummy validation using file name
     * @param file - FileEntity
     * @param queueMessage  - QueueMessage
     * @returns Promise<ValidationResult> 
     */
    dummyValidateOSW(fileEntity: FileEntity, queueMessage: QueueMessageContent): Promise<ValidationResult> {
        var request: OswUpload = OswUpload.from(queueMessage.request);
        console.log(queueMessage.tdeiRecordId, "Validating osw request started !");

        return new Promise(async (resolve, reject) => {
            try {
                // let content = file.getStream() // This gets the data stream of the file. This can be used for actual validation
                const fileName = unescape(fileEntity.fileName);
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
                console.log(queueMessage.tdeiRecordId, "Validating osw request completed !");
            }
            catch (e) {
                console.error(queueMessage.tdeiRecordId, "Validating osw request encountered error !", e);
                reject({
                    isValid: false,
                    validationMessage: e
                });
            }
        });
    }

    private sendStatus(result: ValidationResult, queueMessage: QueueMessage) {
        var queueMessageContent: QueueMessageContent = QueueMessageContent.from(queueMessage.data);
        //Set validation result
        queueMessageContent.meta.isValid = result.isValid;
        queueMessageContent.meta.validationMessage = result.validationMessage;
        queueMessageContent.stage = 'osw-validation';
        //Set response
        queueMessageContent.response.success = result.isValid;
        queueMessageContent.response.message = result.validationMessage;
        this.publishingTopic.publish(QueueMessage.from(
            {
                messageType: 'osw-validation',
                data: queueMessageContent,
                publishedDate: new Date(),
                message: "OSW validation output",
                messageId: randomUUID().toString()
            }
        ));
        console.log("Publishing message for : ", queueMessageContent.tdeiRecordId);
    }
}


interface ValidationResult {
    isValid: boolean,
    validationMessage: string
}