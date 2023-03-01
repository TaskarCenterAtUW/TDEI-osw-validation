/**
 * Test harness for OSW validation service.
 * 1. Picks up tests from tests.json
 * 2. Uploads the input files to Azure.
 * 3. Sends out an uploaded message to the appropriate queue.
 * 4. Listens for the test results
 */
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { Core } from 'nodets-ms-core';
import path from 'path';
import * as fs from 'fs';
dotenv.config();
console.log('Starting tests');
import harnesstests from '../asset/tests.json';
import { environment } from '../../environment/environment';

import messageFormat from '../asset/test_data/osw_test_case1.json';
import { QueueMessageContent } from '../../model/queue-message-model';
import { QueueMessage } from 'nodets-ms-core/lib/core/queue';



Core.initialize();

async function runAllTests() {

var oswContainer = await Core.getStorageClient()?.getContainer('osw');

var validationTopic = Core.getTopic(environment.eventBus.validationTopic ?? "");
validationTopic.subscribe(process.env.VALIDATION_SUBSCRIPTION ?? "",{
    onReceive(message) {
        // console.log(message);
        // var content = QueueMessageContent.from(message.data);
        // console.log(content.meta);
        onResultReceive(message);

    },
    onError(error) {
        console.log(error);
    },
});

harnesstests.tests.forEach(async singleTest => {
    console.log(singleTest.name);
    const extension = path.extname(singleTest.input_file);
    const fileName = path.parse(singleTest.input_file).name;
    const suffix = randomUUID().toString();
    const uploadFileName = fileName+suffix+extension;
    // Read the local file
    var parentDir = path.join(__dirname,'..');
    const fh = fs.createReadStream(path.join(parentDir,singleTest.input_file));
    const newFileOnAzure = oswContainer?.createFile(uploadFileName,'');
    var fileDetails = await newFileOnAzure?.upload(fh);
    // Send message to the controller with upload path.
    var uploadtopic = Core.getTopic( environment.eventBus.uploadTopic ?? "");
    var templateMessage = QueueMessageContent.from(messageFormat);
    templateMessage.meta.file_upload_path = "https://tdeisamplestorage.blob.core.windows.net/osw/"+uploadFileName;
    const message = QueueMessage.from({
        messageType:'osw-upload',
        data:templateMessage,
        message:singleTest.name,
        messageId:randomUUID().toString()
    });
    await uploadtopic.publish(message);
    
});


}

function onResultReceive( message: QueueMessage) {
    // Get the test name from the message
    var testName = message.message;
    var content = QueueMessageContent.from(message.data);
    var result = content.meta.isValid;
    // get the actual test case expected result
    var actualTestCase = harnesstests.tests.find((e)=>{
       return e.name == testName;
    });
    console.log("<---Test case--->")
    console.log(actualTestCase);
    console.log("<---RESULT-->");
    console.log(result);
}


// console.log(templateMessage);

runAllTests().then((e)=>{
    console.log('Completed');
});