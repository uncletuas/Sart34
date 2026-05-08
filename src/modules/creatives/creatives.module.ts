import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { CreativesController } from "./creatives.controller";
import { StorageService } from "./storage.service";

@Module({
  imports: [WorkspacesModule],
  controllers: [CreativesController],
  providers: [StorageService],
  exports: [StorageService]
})
export class CreativesModule {}
