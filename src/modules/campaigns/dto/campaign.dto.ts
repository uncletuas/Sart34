import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";
import { CampaignGoal, CampaignStatus, Platform } from "@prisma/client";

export class CreateCampaignDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  name!: string;

  @IsEnum(CampaignGoal)
  goal!: CampaignGoal;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  productDetails?: Record<string, unknown>;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsObject()
  productDetails?: Record<string, unknown>;
}

export class GenerateCampaignAiDto {
  @IsOptional()
  @IsString()
  mode?: string;
}

export class ApproveCampaignDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AttachCreativeDto {
  @IsArray()
  @IsString({ each: true })
  creativeIds!: string[];
}
