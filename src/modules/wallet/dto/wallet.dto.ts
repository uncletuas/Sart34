import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class BuyCreditsDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  bundleId!: string;
}

export class VerifyPaymentDto {
  @IsString()
  reference!: string;
}

export class AdjustCreditsDto {
  @IsString()
  workspaceId!: string;

  @IsInt()
  amount!: number;

  @IsString()
  reason!: string;
}

export class DeductCreditsDto {
  @IsString()
  workspaceId!: string;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class PaystackWebhookDto {
  @IsString()
  event!: string;

  @IsOptional()
  data?: unknown;
}
