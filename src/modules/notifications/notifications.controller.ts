import { Controller, Get, Patch, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import { PrismaService } from "../prisma/prisma.service";

@ApiBearerAuth()
@ApiTags("Notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" }
    });
  }

  @Patch(":id/read")
  read(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.prisma.notification.update({ where: { id, userId: user.sub }, data: { readAt: new Date() } });
  }
}
