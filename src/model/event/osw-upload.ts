import { IsOptional } from "class-validator";
import { AbstractDomainEntity, Prop } from "nodets-ms-core/lib/models";
import { PolygonDto } from "../polygon-model";

//Describes a gtfs flex file meta data.
export class OswUpload extends AbstractDomainEntity {
    @Prop('tdei_org_id')
    tdeiOrgId?: string;
    @Prop('collected_by')
    collectedBy?: string;
    @Prop('collection_method')
    collectionMethod?: string;
    @Prop('user_id')
    userId?: string;
    @Prop('collection_date')
    collectionDate?: string;
    @Prop('valid_from')
    validFrom?: string;
    @Prop('valid_to')
    validTo?: string;
    @Prop('osw_schema_version')
    oswSchemaVersion?: string;
    @Prop('data_source')
    dataSource?: string;
    @Prop()
    @IsOptional()
    polygon!: PolygonDto;
}