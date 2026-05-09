import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { CampaignStatus, Prisma } from "@prisma/client";
import type { Queue } from "bullmq";
import type { AuthUser } from "../../shared/types/auth-user";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { ApproveCampaignDto, CreateCampaignDto, UpdateCampaignDto } from "./dto/campaign.dto";

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly ai: AiService,
    private readonly wallet: WalletService,
    @Optional() @InjectQueue("meta-launch") private readonly launchQueue?: Queue
  ) {}

  async create(user: AuthUser, dto: CreateCampaignDto) {
    await this.workspaces.assertMembership(user.sub, user.role, dto.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER"]);
    return this.prisma.campaign.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        goal: dto.goal,
        platform: dto.platform ?? "META",
        objective: dto.objective,
        durationDays: dto.durationDays,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        productDetails: dto.productDetails as Prisma.InputJsonValue | undefined,
        createdById: user.sub
      }
    });
  }

  async list(user: AuthUser, workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    return this.prisma.campaign.findMany({
      where: { workspaceId, status: { not: "ARCHIVED" } },
      include: { creatives: true, policyReviews: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" }
    });
  }

  async get(user: AuthUser, campaignId: string) {
    const campaign = await this.findCampaignForUser(user, campaignId);
    return this.prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: {
        copies: true,
        creatives: true,
        leadQuestions: true,
        policyReviews: true,
        launchJobs: true,
        metrics: { orderBy: { date: "desc" }, take: 30 }
      }
    });
  }

  async update(user: AuthUser, campaignId: string, dto: UpdateCampaignDto) {
    const campaign = await this.findCampaignForUser(user, campaignId, true);
    return this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        name: dto.name,
        objective: dto.objective,
        status: dto.status,
        productDetails: dto.productDetails as Prisma.InputJsonValue | undefined
      }
    });
  }

  async archive(user: AuthUser, campaignId: string) {
    const campaign = await this.findCampaignForUser(user, campaignId, true);
    return this.prisma.campaign.update({ where: { id: campaign.id }, data: { status: "ARCHIVED" } });
  }

  async generateAi(user: AuthUser, campaignId: string, mode?: string) {
    const campaign = await this.findCampaignForUser(user, campaignId, true);
    await this.wallet.deduct(campaign.workspaceId, 20, "AI campaign generation", campaign.id);
    const output = await this.ai.generateCampaign(user, campaign.workspaceId, campaign.productDetails as Record<string, unknown>, mode);
    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        aiStrategyJson: output as Prisma.InputJsonValue,
        objective: String(output.objective ?? campaign.objective ?? "lead_generation"),
        status: "PENDING_REVIEW",
        creditCost: { increment: 20 }
      }
    });
    await this.persistGeneratedCopy(campaign.id, output);
    return output;
  }

  async reviewPolicy(user: AuthUser, campaignId: string) {
    const campaign = await this.findCampaignForUser(user, campaignId, true);
    const review = this.ai.scanPolicy({ productDetails: campaign.productDetails, aiStrategy: campaign.aiStrategyJson });
    const created = await this.prisma.policyReview.create({
      data: {
        campaignId: campaign.id,
        riskLevel: review.level,
        flaggedReasons: review.warnings,
        aiReviewJson: review,
        humanStatus: review.requiresHumanReview ? "PENDING" : "NOT_REQUIRED"
      }
    });
    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: review.level === "BLOCKED" ? "REJECTED" : "READY_TO_LAUNCH" }
    });
    return created;
  }

  async approve(user: AuthUser, campaignId: string, dto: ApproveCampaignDto) {
    const campaign = await this.findCampaignForUser(user, campaignId, true);
    if (campaign.status !== "READY_TO_LAUNCH") throw new BadRequestException("Campaign must pass policy review first.");
    await this.prisma.campaignApproval.create({
      data: { campaignId: campaign.id, userId: user.sub, approved: true, notes: dto.notes }
    });
    return this.prisma.campaign.update({ where: { id: campaign.id }, data: { approvedAt: new Date() } });
  }

  async launch(user: AuthUser, campaignId: string) {
    const campaign = await this.findCampaignForUser(user, campaignId, true);
    if (!campaign.approvedAt) throw new BadRequestException("Explicit campaign approval is required before launch.");
    const latestReview = await this.prisma.policyReview.findFirst({
      where: { campaignId },
      orderBy: { createdAt: "desc" }
    });
    if (!latestReview || latestReview.humanStatus === "PENDING" || latestReview.riskLevel === "BLOCKED") {
      throw new BadRequestException("Campaign requires policy clearance before launch.");
    }
    const integration = await this.prisma.integrationAccount.findFirst({
      where: { workspaceId: campaign.workspaceId, provider: "META", status: "CONNECTED" }
    });
    if (!integration) throw new BadRequestException("Connect a Meta account before live publishing.");
    await this.wallet.deduct(campaign.workspaceId, 50, "Meta campaign publishing", campaign.id);
    let launchJob = await this.prisma.campaignLaunchJob.create({
      data: { campaignId, provider: "META", payload: { campaignId, workspaceId: campaign.workspaceId } }
    });
    if (this.launchQueue) {
      await this.launchQueue.add("launch-meta-campaign", { launchJobId: launchJob.id, campaignId }, { attempts: 3 });
    } else {
      launchJob = await this.completeInlineLaunch(launchJob.id, campaignId);
    }
    await this.prisma.campaign.update({ where: { id: campaignId }, data: { status: "SUBMITTED", creditCost: { increment: 50 } } });
    return launchJob;
  }

  async setStatus(user: AuthUser, campaignId: string, status: CampaignStatus) {
    const campaign = await this.findCampaignForUser(user, campaignId, true);
    return this.prisma.campaign.update({ where: { id: campaign.id }, data: { status } });
  }

  async optimize(user: AuthUser, campaignId: string) {
    const campaign = await this.findCampaignForUser(user, campaignId);
    const metrics = await this.prisma.campaignMetric.findMany({
      where: { campaignId },
      orderBy: { date: "desc" },
      take: 14
    });
    const context = {
      goal: campaign.goal,
      objective: campaign.objective,
      productDetails: campaign.productDetails,
      aiStrategy: campaign.aiStrategyJson,
      status: campaign.status,
      metrics: metrics.map((metric) => ({
        date: metric.date,
        impressions: metric.impressions,
        clicks: metric.clicks,
        leads: metric.leads,
        spend: metric.spend
      }))
    };
    return this.ai.generateOptimization(user, campaign.workspaceId, context);
  }

  async attachCreatives(user: AuthUser, campaignId: string, creativeIds: string[]) {
    const campaign = await this.findCampaignForUser(user, campaignId, true);
    await this.prisma.adCreative.updateMany({
      where: { id: { in: creativeIds }, workspaceId: campaign.workspaceId },
      data: { campaignId }
    });
    return this.get(user, campaignId);
  }

  async metrics(user: AuthUser, campaignId: string) {
    const campaign = await this.findCampaignForUser(user, campaignId);
    return this.prisma.campaignMetric.findMany({ where: { campaignId: campaign.id }, orderBy: { date: "desc" } });
  }

  private async findCampaignForUser(user: AuthUser, campaignId: string, write = false) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException("Campaign not found.");
    await this.workspaces.assertMembership(
      user.sub,
      user.role,
      campaign.workspaceId,
      write ? ["OWNER", "ADMIN", "MARKETING_MANAGER"] : undefined
    );
    return campaign;
  }

  private async persistGeneratedCopy(campaignId: string, output: Record<string, unknown>) {
    const copies = Array.isArray(output.ad_copies) ? output.ad_copies : [];
    for (const copy of copies as Array<Record<string, string>>) {
      await this.prisma.adCopy.create({
        data: {
          campaignId,
          primaryText: copy.primary_text ?? "",
          headline: copy.headline ?? "",
          description: copy.description,
          callToAction: copy.cta,
          platform: "META"
        }
      });
    }
    const questions = Array.isArray(output.lead_form_questions) ? output.lead_form_questions : [];
    for (const [position, question] of questions.entries()) {
      await this.prisma.leadFormQuestion.create({
        data: { campaignId, question: String(question), position }
      });
    }
  }

  private async completeInlineLaunch(launchJobId: string, campaignId: string) {
    const externalCampaignId = `meta_local_${campaignId}`;
    const launchJob = await this.prisma.campaignLaunchJob.update({
      where: { id: launchJobId },
      data: {
        status: "SUCCESS",
        result: { externalCampaignId, message: "Local inline launch completed because queues are disabled." }
      }
    });
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { externalCampaignId }
    });
    return launchJob;
  }
}
