import { ArrayNotEmpty, IsArray, IsOptional, IsString } from "class-validator";

export class CreatePostDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  caption!: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  platforms!: string[];
}
