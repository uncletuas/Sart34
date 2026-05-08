import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import { CreateLeadDto, GenerateLeadFollowUpDto, LeadNoteDto, ScheduleFollowUpDto, UpdateLeadDto } from "./dto/crm.dto";
import { CrmService } from "./crm.service";

@ApiBearerAuth()
@ApiTags("CRM")
@Controller("leads")
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
    return this.crm.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("workspaceId") workspaceId: string, @Query("status") status?: string) {
    return this.crm.list(user, workspaceId, status);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.crm.get(user, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateLeadDto) {
    return this.crm.update(user, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.crm.remove(user, id);
  }

  @Post(":id/notes")
  addNote(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: LeadNoteDto) {
    return this.crm.addNote(user, id, dto.note);
  }

  @Post(":id/generate-follow-up")
  generateFollowUp(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: GenerateLeadFollowUpDto) {
    return this.crm.generateFollowUp(user, id, dto.channel);
  }

  @Post(":id/schedule-follow-up")
  scheduleFollowUp(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ScheduleFollowUpDto) {
    return this.crm.scheduleFollowUp(user, id, dto);
  }
}
