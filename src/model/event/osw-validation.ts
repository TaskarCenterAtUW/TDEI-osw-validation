import { Prop } from "nodets-ms-core/lib/models";
import { OswUpload } from "./osw-upload";

export class OswValidation extends OswUpload {
    @Prop('is_valid')
    isValid: boolean = false;
    @Prop('validation_message')
    validationMessage?: string;
    @Prop('validation_time')
    validationTime: number = 0;
}