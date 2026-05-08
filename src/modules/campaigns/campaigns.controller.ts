import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import {
  ApproveCampaignDto,
  AttachCreativeDto,
  CreateCampaignDto,
  GenerateCampaignAiDto,
  UpdateCampaignDto
} from "./dto/campaign.dto";
import { CampaignsService } from "./campaigns.service";

@ApiBearerAuth()
@ApiTags("Campaigns")
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("workspaceId") workspaceId: string) {
    return this.campaigns.list(user, workspaceId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.campaigns.get(user, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaigns.update(user, id, dto);
  }

  @Delete(":id")
  archive(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.campaigns.archive(user, id);
  }

  @Post(":id/generate-ai")
  generateAi(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: GenerateCampaignAiDto) {
    return this.campaigns.generateAi(user, id, dto.mode);
  }

  @Post(":id/review-policy")
  reviewPolicy(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.campaigns.reviewPolicy(user, id);
  }

  @Post(":id/approve")
  approve(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ApproveCampaignDto) {
    return this.campaigns.approve(user, id, dto);
  }

  @Post(":id/launch")
  launch(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.campaigns.launch(user, id);
  }

  @Post(":id/pause")
  pause(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.campaigns.setStatus(user, id, "PAUSED");
  }

  @Post(":id/resume")
  resume(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.campaigns.setStatus(user, id, "ACTIVE");
  }

  @Post(":id/creatives")
  attachCreatives(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: AttachCreativeDto) {
    return this.campaigns.attachCreatives(user, id, dto.creativeIds);
  }

  @Get(":id/metrics")
  metrics(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.campaigns.metrics(user, id);
  }
}
