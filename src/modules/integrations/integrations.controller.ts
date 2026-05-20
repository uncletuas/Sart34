import { Body, Controller, Delete, Get, Param, Post, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
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

  @Post("google/connect")
  googleConnect(@CurrentUser() user: AuthUser, @Body() dto: MetaConnectDto) {
    return this.integrations.googleConnect(user, dto.workspaceId);
  }

  @Post("tiktok/connect")
  tiktokConnect(@CurrentUser() user: AuthUser, @Body() dto: MetaConnectDto) {
    return this.integrations.tiktokConnect(user, dto.workspaceId);
  }

  @Post("whatsapp/connect")
  whatsappConnect(@CurrentUser() user: AuthUser, @Body() dto: MetaConnectDto) {
    return this.integrations.whatsappConnect(user, dto.workspaceId);
  }

  @Post("linkedin/connect")
  linkedinConnect(@CurrentUser() user: AuthUser, @Body() dto: MetaConnectDto) {
    return this.integrations.linkedinConnect(user, dto.workspaceId);
  }

  @Post("x/connect")
  xConnect(@CurrentUser() user: AuthUser, @Body() dto: MetaConnectDto) {
    return this.integrations.xConnect(user, dto.workspaceId);
  }

  @Public()
  @Post("meta/callback")
  metaCallback(@Body() dto: MetaCallbackDto) {
    return this.integrations.metaCallback(dto);
  }

  @Public()
  @Get("meta/callback")
  async metaOAuthCallback(@Query("code") code: string, @Query("state") state: string, @Query("error") error: string, @Res() res: Response) {
    res.redirect(await this.integrations.handleOAuthCallback("META", code, state, error));
  }

  @Public()
  @Get("google/callback")
  async googleOAuthCallback(@Query("code") code: string, @Query("state") state: string, @Query("error") error: string, @Res() res: Response) {
    res.redirect(await this.integrations.handleOAuthCallback("GOOGLE", code, state, error));
  }

  @Public()
  @Get("tiktok/callback")
  async tiktokOAuthCallback(@Query("code") code: string, @Query("auth_code") authCode: string, @Query("state") state: string, @Query("error") error: string, @Res() res: Response) {
    res.redirect(await this.integrations.handleOAuthCallback("TIKTOK", code || authCode, state, error));
  }

  @Public()
  @Get("whatsapp/callback")
  async whatsappOAuthCallback(@Query("code") code: string, @Query("state") state: string, @Query("error") error: string, @Res() res: Response) {
    res.redirect(await this.integrations.handleOAuthCallback("WHATSAPP", code, state, error));
  }

  @Public()
  @Get("linkedin/callback")
  async linkedinOAuthCallback(@Query("code") code: string, @Query("state") state: string, @Query("error") error: string, @Res() res: Response) {
    res.redirect(await this.integrations.handleOAuthCallback("LINKEDIN", code, state, error));
  }

  @Public()
  @Get("x/callback")
  async xOAuthCallback(@Query("code") code: string, @Query("state") state: string, @Query("error") error: string, @Res() res: Response) {
    res.redirect(await this.integrations.handleOAuthCallback("X", code, state, error));
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
