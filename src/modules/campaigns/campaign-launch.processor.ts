import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
@Processor("meta-launch")
export class CampaignLaunchProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ launchJobId: string; campaignId: string }>) {
    await this.prisma.campaignLaunchJob.update({
      where: { id: job.data.launchJobId },
      data: { status: "RUNNING" }
    });

    try {
      const externalCampaignId = `meta_mock_${job.data.campaignId}`;
      await this.prisma.campaign.update({
        where: { id: job.data.campaignId },
        data: { status: "SUBMITTED", externalCampaignId }
      });
      return this.prisma.campaignLaunchJob.update({
        where: { id: job.data.launchJobId },
        data: { status: "SUCCESS", result: { externalCampaignId, message: "Queued for Meta live publishing adapter." } }
      });
    } catch (error) {
      await this.prisma.campaign.update({ where: { id: job.data.campaignId }, data: { status: "FAILED" } });
      return this.prisma.campaignLaunchJob.update({
        where: { id: job.data.launchJobId },
        data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown launch error" }
      });
    }
  }
}
