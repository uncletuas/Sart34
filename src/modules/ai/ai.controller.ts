import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import { FollowUpDto, GenerateCampaignDto, PolicyReviewDto, PostDraftDto } from "./dto/ai.dto";
import { AiService } from "./ai.service";

@ApiBearerAuth()
@ApiTags("AI")
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("campaign-generation")
  generateCampaign(@CurrentUser() user: AuthUser, @Body() dto: GenerateCampaignDto) {
    return this.ai.generateCampaign(user, dto.workspaceId, dto.campaignInput, dto.mode);
  }

  @Post("policy-review")
  reviewPolicy(@CurrentUser() user: AuthUser, @Body() dto: PolicyReviewDto) {
    return this.ai.reviewPolicy(user, dto.workspaceId, dto.content);
  }

  @Post("follow-up")
  followUp(@CurrentUser() user: AuthUser, @Body() dto: FollowUpDto) {
    return this.ai.generateFollowUp(user, dto.workspaceId, dto.leadContext, dto.channel);
  }

  @Post("post-draft")
  postDraft(@CurrentUser() user: AuthUser, @Body() dto: PostDraftDto) {
    return this.ai.generatePost(user, dto.workspaceId, {
      prompt: dto.prompt,
      platforms: dto.platforms,
      tone: dto.tone
    });
  }
}
