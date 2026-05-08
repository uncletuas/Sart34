import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";

@ApiBearerAuth()
@ApiTags("Reporting")
@Controller("reports")
export class ReportingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService
  ) {}

  @Get("overview")
  async overview(@CurrentUser() user: AuthUser, @Query("workspaceId") workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    const [campaigns, leads, wallet] = await Promise.all([
      this.prisma.campaign.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
      this.prisma.lead.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
      this.prisma.creditWallet.findUnique({ where: { workspaceId } })
    ]);
    return { campaigns, leads, walletBalance: wallet?.balance ?? 0 };
  }
}
