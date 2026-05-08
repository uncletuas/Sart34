import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import { CreateAgencyClientDto, CreateWorkspaceDto, InviteMemberDto, UpdateWorkspaceDto } from "./dto/workspace.dto";
import { WorkspacesService } from "./workspaces.service";

@ApiBearerAuth()
@ApiTags("Workspaces")
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.workspaces.list(user.sub, user.role);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.workspaces.get(user.sub, user.role, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspaces.update(user.sub, user.role, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.workspaces.remove(user.sub, user.role, id);
  }

  @Post(":id/invitations")
  invite(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: InviteMemberDto) {
    return this.workspaces.invite(user.sub, user.role, id, dto);
  }

  @Post("agency-clients")
  createAgencyClient(@CurrentUser() user: AuthUser, @Body() dto: CreateAgencyClientDto) {
    return this.workspaces.createAgencyClient(user.sub, user.role, dto);
  }
}
