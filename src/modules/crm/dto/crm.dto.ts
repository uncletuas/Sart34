import { Type } from "class-transformer";
import { IsDateString, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { LeadStatus, MessageChannel, Platform } from "@prisma/client";

export class CreateLeadDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsEnum(Platform)
  sourcePlatform?: Platform;

  @IsOptional()
  @IsString()
  interest?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string;
}

export class LeadNoteDto {
  @IsString()
  note!: string;
}

export class GenerateLeadFollowUpDto {
  @IsEnum(MessageChannel)
  channel!: MessageChannel;
}

export class ScheduleFollowUpDto {
  @IsDateString()
  scheduledAt!: string;

  @IsString()
  message!: string;

  @IsEnum(MessageChannel)
  channel!: MessageChannel;
}
