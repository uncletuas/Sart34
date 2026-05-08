import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { MessageChannel } from "@prisma/client";

export class GenerateCampaignDto {
  @IsString()
  workspaceId!: string;

  @IsObject()
  campaignInput!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  mode?: string;
}

export class PolicyReviewDto {
  @IsString()
  workspaceId!: string;

  @IsObject()
  content!: Record<string, unknown>;
}

export class FollowUpDto {
  @IsString()
  workspaceId!: string;

  @IsObject()
  leadContext!: Record<string, unknown>;

  @IsEnum(MessageChannel)
  channel!: MessageChannel;
}
