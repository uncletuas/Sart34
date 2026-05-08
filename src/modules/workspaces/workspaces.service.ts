import * as crypto from "node:crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole, WorkspaceRole, WorkspaceType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAgencyClientDto, CreateWorkspaceDto, InviteMemberDto, UpdateWorkspaceDto } from "./dto/workspace.dto";

const WRITE_ROLES: WorkspaceRole[] = ["OWNER", "ADMIN", "MARKETING_MANAGER"];
const ADMIN_ROLES: WorkspaceRole[] = ["OWNER", "ADMIN"];

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          ownerId: userId,
          type: dto.type ?? "BUSINESS",
          name: dto.name,
          industry: dto.industry,
          description: dto.description,
          location: dto.location,
          website: dto.website,
          whatsappNumber: dto.whatsappNumber,
          email: dto.email,
          phone: dto.phone,
          defaultCurrency: dto.defaultCurrency ?? "NGN",
          socialHandles: dto.socialHandles as Prisma.InputJsonValue | undefined,
          businessGoals: dto.businessGoals as Prisma.InputJsonValue | undefined,
          targetCustomerProfile: dto.targetCustomerProfile,
          members: { create: { userId, role: "OWNER" } },
          wallet: { create: { balance: 0 } }
        }
      });
      return workspace;
    });
  }

  list(userId: string, role: UserRole) {
    if (role === "SUPER_ADMIN") return this.prisma.workspace.findMany({ include: { wallet: true } });
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      include: { wallet: true, agencyParent: true, agencyClients: true }
    });
  }

  async get(userId: string, role: UserRole, workspaceId: string) {
    await this.assertMembership(userId, role, workspaceId);
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { include: { user: true } }, wallet: true, agencyClients: { include: { client: true } } }
    });
  }

  async update(userId: string, role: UserRole, workspaceId: string, dto: UpdateWorkspaceDto) {
    await this.assertMembership(userId, role, workspaceId, WRITE_ROLES);
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: dto.name,
        industry: dto.industry,
        description: dto.description,
        location: dto.location,
        website: dto.website,
        whatsappNumber: dto.whatsappNumber,
        email: dto.email,
        phone: dto.phone,
        defaultCurrency: dto.defaultCurrency,
        socialHandles: dto.socialHandles as Prisma.InputJsonValue | undefined,
        businessGoals: dto.businessGoals as Prisma.InputJsonValue | undefined,
        targetCustomerProfile: dto.targetCustomerProfile
      }
    });
  }

  async remove(userId: string, role: UserRole, workspaceId: string) {
    await this.assertMembership(userId, role, workspaceId, ["OWNER"]);
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
    return { success: true };
  }

  async invite(userId: string, role: UserRole, workspaceId: string, dto: InviteMemberDto) {
    await this.assertMembership(userId, role, workspaceId, ADMIN_ROLES);
    return this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: dto.email.toLowerCase(),
        role: dto.role,
        invitedById: userId,
        token: crypto.randomBytes(24).toString("hex"),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      }
    });
  }

  async createAgencyClient(userId: string, role: UserRole, dto: CreateAgencyClientDto) {
    await this.assertMembership(userId, role, dto.agencyWorkspaceId, ["OWNER", "ADMIN"]);
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.workspace.create({
        data: {
          ownerId: userId,
          type: "CLIENT",
          name: dto.name,
          industry: dto.industry,
          description: dto.description,
          defaultCurrency: dto.defaultCurrency ?? "NGN",
          members: { create: { userId, role: "OWNER" } },
          wallet: { create: { balance: 0 } }
        }
      });
      await tx.agencyClient.create({ data: { agencyId: dto.agencyWorkspaceId, clientId: client.id } });
      return client;
    });
  }

  async assertMembership(
    userId: string,
    userRole: UserRole,
    workspaceId: string,
    allowedRoles?: WorkspaceRole[]
  ) {
    if (userRole === "SUPER_ADMIN") return;
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    });
    if (!membership) throw new NotFoundException("Workspace not found.");
    if (allowedRoles && !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException("Insufficient workspace permissions.");
    }
  }

  async ensureAgencyWorkspace(userId: string, userRole: UserRole, workspaceId: string) {
    await this.assertMembership(userId, userRole, workspaceId, ADMIN_ROLES);
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace || workspace.type !== WorkspaceType.AGENCY) {
      throw new ForbiddenException("Workspace is not an agency workspace.");
    }
  }
}
