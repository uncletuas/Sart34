import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PolicyRiskLevel } from "@prisma/client";
import { Roles } from "../../shared/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { AdjustCreditsDto } from "../wallet/dto/wallet.dto";

@ApiBearerAuth()
@ApiTags("Admin")
@Roles("SUPER_ADMIN")
@Controller("admin")
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService
  ) {}

  @Get("users")
  users() {
    return this.prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  }

  @Get("workspaces")
  workspaces() {
    return this.prisma.workspace.findMany({ include: { wallet: true, members: true } });
  }

  @Get("campaigns")
  campaigns() {
    return this.prisma.campaign.findMany({ include: { workspace: true, policyReviews: true } });
  }

  @Get("flagged-campaigns")
  flaggedCampaigns() {
    return this.prisma.policyReview.findMany({
      where: { OR: [{ humanStatus: "PENDING" }, { riskLevel: { in: [PolicyRiskLevel.HIGH, PolicyRiskLevel.BLOCKED] } }] },
      include: { campaign: true },
      orderBy: { createdAt: "desc" }
    });
  }

  @Patch("campaigns/:id/review")
  reviewCampaign(@Param("id") id: string, @Body() body: { approved: boolean; reviewedById?: string }) {
    return this.prisma.policyReview.update({
      where: { id },
      data: { humanStatus: body.approved ? "APPROVED" : "REJECTED", reviewedById: body.reviewedById }
    });
  }

  @Post("credits/adjust")
  adjustCredits(@Body() dto: AdjustCreditsDto) {
    return this.wallet.adjustCredits("admin", dto.workspaceId, dto.amount, dto.reason);
  }

  @Get("logs")
  logs() {
    return this.prisma.apiLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }
}
