import { IsOptional, IsString } from "class-validator";

export class UploadCreativeDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  campaignId?: string;
}
