import { WorkspaceRole, WorkspaceType } from "@prisma/client";
import { IsEmail, IsEnum, IsObject, IsOptional, IsString } from "class-validator";

export class CreateWorkspaceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(WorkspaceType)
  type?: WorkspaceType;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  @IsObject()
  socialHandles?: Record<string, string>;

  @IsOptional()
  @IsObject()
  businessGoals?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  targetCustomerProfile?: string;
}

export class UpdateWorkspaceDto extends CreateWorkspaceDto {}

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}

export class CreateAgencyClientDto extends CreateWorkspaceDto {
  @IsString()
  agencyWorkspaceId!: string;
}
