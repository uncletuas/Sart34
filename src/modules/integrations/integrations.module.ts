import { Module } from "@nestjs/common";
import { CryptoModule } from "../../shared/crypto/crypto.module";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";

@Module({
  imports: [CryptoModule, WorkspacesModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService]
})
export class IntegrationsModule {}
