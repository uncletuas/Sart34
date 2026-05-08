import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { WalletModule } from "../wallet/wallet.module";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { CampaignLaunchProcessor } from "./campaign-launch.processor";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";

const queuesEnabled = process.env.DISABLE_QUEUES !== "true";

@Module({
  imports: [...(queuesEnabled ? [BullModule.registerQueue({ name: "meta-launch" })] : []), WorkspacesModule, AiModule, WalletModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, ...(queuesEnabled ? [CampaignLaunchProcessor] : [])],
  exports: [CampaignsService]
})
export class CampaignsModule {}
