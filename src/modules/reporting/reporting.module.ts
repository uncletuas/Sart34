import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { ReportingController } from "./reporting.controller";

@Module({
  imports: [WorkspacesModule],
  controllers: [ReportingController]
})
export class ReportingModule {}
