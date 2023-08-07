import { Core } from "nodets-ms-core";
import { PermissionRequest } from "nodets-ms-core/lib/core/auth/model/permission_request";
import {OswValidator} from "../../src/controller/osw-validator";

require('dotenv').config()

import oswUploadsuccessMessage from "../test-data/osw-upload-success.json";
import oswValidationsuccessMessage from '../test-data/osw-validation-result.json';
import { QueueMessage } from "nodets-ms-core/lib/core/queue";
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
// jest.mock('../../src/controller/osw-validator')

describe("OSW Validation service Integration test", ()=>{
    afterAll((done)=>{
        done();
    })
    beforeAll(()=>{
        Core.initialize();
    })
    test('Subscribe to upload topic to verify servicebus integration', async ()=>{
        if (!process.env.QUEUECONNECTION) {
            console.error("QUEUECONNECTION environment not set");
            expect(process.env.QUEUECONNECTION != undefined && process.env.QUEUECONNECTION != null).toBeTruthy();
            return;
        }
        // Mock the osw-validation service and see if the actual receiver is getting called.
        var validator = new OswValidator();
        // Get the topic of subscription from upload topic
        const uploadTopic = Core.getTopic(process.env.UPLOAD_TOPIC as string)
        const message = QueueMessage.from(oswUploadsuccessMessage);
        const receiveFunction = jest.spyOn(validator,'onReceive').mockImplementation();
        validator.startListening();
        await uploadTopic.publish(message);
        await delay(1000); // Have to wait to get the callback
        expect(receiveFunction).toHaveBeenCalledTimes(1);

    }, 60000);

    test('Message posted to service bus is received on the target topic', async ()=>{
        if (!process.env.QUEUECONNECTION) {
            console.error("QUEUECONNECTION environment not set");
            expect(process.env.QUEUECONNECTION != undefined && process.env.QUEUECONNECTION != null).toBeTruthy();
            return;
        }
        // Mock the osw-validation service and see if the actual receiver is getting called.
        var validator = new OswValidator();
        // Get the topic of subscription from upload topic
        const validationTopic = Core.getTopic(process.env.VALIDATION_TOPIC as string)
        const receiveFn = jest.fn()
       await validationTopic.subscribe('temp-validation-result',{
            onReceive(message) {
                receiveFn();
            },
            onError(error) {
                
            },
        })
        await validator.publishingTopic.publish(QueueMessage.from(oswValidationsuccessMessage))
        await delay(300); // Have to wait to get the callback
        expect(receiveFn).toHaveBeenCalledTimes(1);
    }, 60000);

    test('Fetching a file returns a file entity to verify Storage Integration', async ()=>{
        
        const test_file_url = 'https://tdeisamplestorage.blob.core.windows.net/osw/2023/APRIL/66c85a5a-2335-4b97-a0a3-0bb93cba1ae5/osw-test-upload_19df12452cae4da5a71db3fa276f4f5e.zip';
        const file = await Core.getStorageClient()?.getFileFromUrl(test_file_url); 
        let content = await file?.getStream();
        expect(content).toBeTruthy();
    })

    test('When requesting authorization permission, expect to return true/false', async ()=>{
        if (!process.env.AUTH_PERMISSION_URL) {
            console.error("AUTH_HOST environment not set");
            expect(process.env.AUTH_PERMISSION_URL != undefined && process.env.AUTH_PERMISSION_URL != null).toBeTruthy();
            return;
        }

        //Arrange
        var permissionRequest = new PermissionRequest({
            userId: "test_userId",
            orgId: "test_orgId",
            permssions: ["tdei-admin", "poc", "osw_data_generator"],
            shouldSatisfyAll: false
        });
        const authUrl = process.env.AUTH_PERMISSION_URL as string
        const authProvider = Core.getAuthorizer({ provider: "Hosted", apiUrl: authUrl });
        //ACT
        const response = await authProvider?.hasPermission(permissionRequest);
        //Assert
        expect(response).toBeFalsy();
    },15000)
})