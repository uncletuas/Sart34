import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Public } from "../../shared/decorators/public.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import { MetaCallbackDto, MetaConnectDto } from "./dto/integrations.dto";
import { IntegrationsService } from "./integrations.service";

@ApiBearerAuth()
@ApiTags("Integrations")
@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("workspaceId") workspaceId: string) {
    return this.integrations.list(user, workspaceId);
  }

  @Post("meta/connect")
  metaConnect(@CurrentUser() user: AuthUser, @Body() dto: MetaConnectDto) {
    return this.integrations.metaConnect(user, dto.workspaceId);
  }

  @Public()
  @Post("meta/callback")
  metaCallback(@Body() dto: MetaCallbackDto) {
    return this.integrations.metaCallback(dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.integrations.remove(user, id);
  }

  @Post(":id/sync")
  sync(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.integrations.sync(user, id);
  }
}
