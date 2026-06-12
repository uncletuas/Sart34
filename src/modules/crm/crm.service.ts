import { Injectable } from "@nestjs/common";
import { LeadStatus, MessageChannel } from "@prisma/client";
import type { AuthUser } from "../../shared/types/auth-user";
import { AiService } from "../ai/ai.service";
import { TiktokEventsService } from "../integrations/tiktok-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { CreateLeadDto, ScheduleFollowUpDto, UpdateLeadDto } from "./dto/crm.dto";

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly ai: AiService,
    private readonly tiktokEvents: TiktokEventsService
  ) {}

  async create(user: AuthUser, dto: CreateLeadDto) {
    await this.workspaces.assertMembership(user.sub, user.role, dto.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER", "SALES_STAFF"]);
    const lead = await this.prisma.lead.create({
      data: {
        workspaceId: dto.workspaceId,
        campaignId: dto.campaignId,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        whatsappNumber: dto.whatsappNumber,
        sourcePlatform: dto.sourcePlatform,
        interest: dto.interest,
        budget: dto.budget,
        location: dto.location
      }
    });

    // Fire TikTok server-side lead event (non-blocking, errors are swallowed in the service)
    if (dto.sourcePlatform === "TIKTOK" || !dto.sourcePlatform) {
      this.tiktokEvents.trackLead({
        email: dto.email,
        phone: dto.phone ?? dto.whatsappNumber,
        fullName: dto.fullName,
        eventId: lead.id,
        currency: "NGN"
      });
    }

    return lead;
  }

  async list(user: AuthUser, workspaceId: string, status?: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    return this.prisma.lead.findMany({
      where: { workspaceId, status: status as LeadStatus | undefined },
      include: { campaign: true, assignedTo: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async get(user: AuthUser, leadId: string) {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    await this.workspaces.assertMembership(user.sub, user.role, lead.workspaceId);
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { notes: true, messages: true, reminders: true, conversations: true, campaign: true }
    });
  }

  async update(user: AuthUser, leadId: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    await this.workspaces.assertMembership(user.sub, user.role, lead.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER", "SALES_STAFF"]);
    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: dto.status,
        assignedToId: dto.assignedToId,
        nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined
      }
    });
  }

  async remove(user: AuthUser, leadId: string) {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    await this.workspaces.assertMembership(user.sub, user.role, lead.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER"]);
    await this.prisma.lead.delete({ where: { id: leadId } });
    return { success: true };
  }

  async addNote(user: AuthUser, leadId: string, note: string) {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    await this.workspaces.assertMembership(user.sub, user.role, lead.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER", "SALES_STAFF"]);
    return this.prisma.leadNote.create({ data: { leadId, userId: user.sub, note } });
  }

  async generateFollowUp(user: AuthUser, leadId: string, channel: MessageChannel) {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { campaign: true } });
    await this.workspaces.assertMembership(user.sub, user.role, lead.workspaceId);
    const output = await this.ai.generateFollowUp(user, lead.workspaceId, lead as unknown as Record<string, unknown>, channel);
    const message = String(output.message ?? "");
    return this.prisma.followUpMessage.create({
      data: { leadId, channel, message, aiGenerated: true }
    });
  }

  async scheduleFollowUp(user: AuthUser, leadId: string, dto: ScheduleFollowUpDto) {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    await this.workspaces.assertMembership(user.sub, user.role, lead.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER", "SALES_STAFF"]);
    return this.prisma.followUpMessage.create({
      data: {
        leadId,
        channel: dto.channel,
        message: dto.message,
        status: "SCHEDULED",
        scheduledAt: new Date(dto.scheduledAt)
      }
    });
  }
}
