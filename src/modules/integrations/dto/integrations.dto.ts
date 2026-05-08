import { IsObject, IsOptional, IsString } from "class-validator";

export class MetaConnectDto {
  @IsString()
  workspaceId!: string;
}

export class MetaCallbackDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  accessToken!: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  externalAccountId?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
