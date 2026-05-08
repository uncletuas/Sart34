import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";

@Module({
  imports: [WorkspacesModule, AiModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService]
})
export class CrmModule {}
