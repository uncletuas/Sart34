import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { CryptoModule } from "../../shared/crypto/crypto.module";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { TiktokEventsService } from "./tiktok-events.service";

@Module({
  imports: [CryptoModule, WorkspacesModule, HttpModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, TiktokEventsService],
  exports: [IntegrationsService, TiktokEventsService]
})
export class IntegrationsModule {}
