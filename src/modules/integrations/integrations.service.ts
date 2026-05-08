import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import type { AuthUser } from "../../shared/types/auth-user";
import { EncryptionService } from "../../shared/crypto/encryption.service";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { MetaCallbackDto } from "./dto/integrations.dto";

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService
  ) {}

  async list(user: AuthUser, workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    return this.prisma.integrationAccount.findMany({
      where: { workspaceId },
      select: {
        id: true,
        provider: true,
        externalAccountId: true,
        accountName: true,
        metadata: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async metaConnect(user: AuthUser, workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId, ["OWNER", "ADMIN"]);
    const appId = this.config.get<string>("META_APP_ID", "");
    const redirect = encodeURIComponent(this.config.get<string>("META_REDIRECT_URI", ""));
    const state = encodeURIComponent(JSON.stringify({ workspaceId, userId: user.sub }));
    const scope = encodeURIComponent("ads_management,ads_read,business_management,pages_read_engagement");
    return {
      authorizationUrl: appId
        ? `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirect}&state=${state}&scope=${scope}`
        : null,
      message: appId ? "Redirect the user to authorizationUrl." : "META_APP_ID is not configured."
    };
  }

  async metaCallback(dto: MetaCallbackDto) {
    return this.prisma.integrationAccount.upsert({
      where: { id: dto.externalAccountId ?? `${dto.workspaceId}-meta` },
      update: {
        accessTokenEncrypted: this.encryption.encrypt(dto.accessToken),
        refreshTokenEncrypted: dto.refreshToken ? this.encryption.encrypt(dto.refreshToken) : undefined,
        externalAccountId: dto.externalAccountId,
        accountName: dto.accountName,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        status: "CONNECTED"
      },
      create: {
        id: dto.externalAccountId ?? `${dto.workspaceId}-meta`,
        workspaceId: dto.workspaceId,
        provider: "META",
        accessTokenEncrypted: this.encryption.encrypt(dto.accessToken),
        refreshTokenEncrypted: dto.refreshToken ? this.encryption.encrypt(dto.refreshToken) : undefined,
        externalAccountId: dto.externalAccountId,
        accountName: dto.accountName,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        status: "CONNECTED"
      }
    });
  }

  async remove(user: AuthUser, id: string) {
    const integration = await this.prisma.integrationAccount.findUniqueOrThrow({ where: { id } });
    await this.workspaces.assertMembership(user.sub, user.role, integration.workspaceId, ["OWNER", "ADMIN"]);
    await this.prisma.integrationAccount.delete({ where: { id } });
    return { success: true };
  }

  async sync(user: AuthUser, id: string) {
    const integration = await this.prisma.integrationAccount.findUniqueOrThrow({ where: { id } });
    await this.workspaces.assertMembership(user.sub, user.role, integration.workspaceId, ["OWNER", "ADMIN", "MARKETING_MANAGER"]);
    return this.prisma.integrationAccount.update({
      where: { id },
      data: {
        metadata: {
          syncedAt: new Date().toISOString(),
          pages: [],
          adAccounts: [],
          pixels: [],
          note: "Meta asset sync adapter placeholder. Wire Graph API calls here after app review."
        }
      }
    });
  }
}
