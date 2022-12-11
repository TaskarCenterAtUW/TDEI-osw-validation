import { QueueMessage } from "nodets-ms-core/lib/core/queue";

export interface IValidator {

    validate(message:QueueMessage): void;
}