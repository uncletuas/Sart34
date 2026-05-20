import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IntegrationProvider, Prisma } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import type { AuthUser } from "../../shared/types/auth-user";
import { EncryptionService } from "../../shared/crypto/encryption.service";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { MetaCallbackDto } from "./dto/integrations.dto";

type OAuthProvider = "META" | "GOOGLE" | "TIKTOK" | "WHATSAPP";

type ExchangedToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountName?: string;
  externalAccountId?: string;
};

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly http: HttpService
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

  async googleConnect(user: AuthUser, workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId, ["OWNER", "ADMIN"]);
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID", "");
    const redirect = encodeURIComponent(this.config.get<string>("GOOGLE_REDIRECT_URI", ""));
    const state = encodeURIComponent(JSON.stringify({ workspaceId, userId: user.sub }));
    const scope = encodeURIComponent("https://www.googleapis.com/auth/adwords openid email");
    return {
      authorizationUrl: clientId
        ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&access_type=offline&prompt=consent&include_granted_scopes=true&scope=${scope}&state=${state}`
        : null,
      message: clientId ? "Redirect the user to authorizationUrl." : "GOOGLE_CLIENT_ID is not configured."
    };
  }

  async tiktokConnect(user: AuthUser, workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId, ["OWNER", "ADMIN"]);
    const appId = this.config.get<string>("TIKTOK_APP_ID", "");
    const redirect = encodeURIComponent(this.config.get<string>("TIKTOK_REDIRECT_URI", ""));
    const state = encodeURIComponent(JSON.stringify({ workspaceId, userId: user.sub }));
    return {
      authorizationUrl: appId
        ? `https://business-api.tiktok.com/portal/auth?app_id=${appId}&redirect_uri=${redirect}&state=${state}`
        : null,
      message: appId ? "Redirect the user to authorizationUrl." : "TIKTOK_APP_ID is not configured."
    };
  }

  async whatsappConnect(user: AuthUser, workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId, ["OWNER", "ADMIN"]);
    const appId = this.config.get<string>("WHATSAPP_APP_ID", this.config.get<string>("META_APP_ID", ""));
    const redirect = encodeURIComponent(this.config.get<string>("WHATSAPP_REDIRECT_URI", this.config.get<string>("META_REDIRECT_URI", "")));
    const state = encodeURIComponent(JSON.stringify({ workspaceId, userId: user.sub, channel: "WHATSAPP" }));
    const scope = encodeURIComponent("whatsapp_business_management,whatsapp_business_messaging,business_management");
    return {
      authorizationUrl: appId
        ? `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirect}&state=${state}&scope=${scope}`
        : null,
      message: appId ? "Redirect the user to authorizationUrl." : "WHATSAPP_APP_ID (or META_APP_ID) is not configured."
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

  async handleOAuthCallback(provider: OAuthProvider, code?: string, stateRaw?: string, error?: string): Promise<string> {
    const appUrl = this.config.get<string>("APP_BASE_URL", "http://localhost:5173").replace(/\/$/, "");
    const fail = (reason: string) => `${appUrl}/?connect_error=${provider.toLowerCase()}&reason=${encodeURIComponent(reason)}`;
    if (error) return fail(error);
    if (!code || !stateRaw) return fail("missing_code");

    let workspaceId: string;
    try {
      const state = JSON.parse(decodeURIComponent(stateRaw)) as { workspaceId?: string };
      if (!state.workspaceId) return fail("missing_workspace");
      workspaceId = state.workspaceId;
    } catch {
      return fail("bad_state");
    }

    try {
      const token = await this.exchangeOAuthCode(provider, code);
      const id = `${workspaceId}-${provider.toLowerCase()}`;
      const fields = {
        accessTokenEncrypted: this.encryption.encrypt(token.accessToken),
        refreshTokenEncrypted: token.refreshToken ? this.encryption.encrypt(token.refreshToken) : undefined,
        accountName: token.accountName,
        externalAccountId: token.externalAccountId,
        expiresAt: token.expiresAt,
        status: "CONNECTED" as const
      };
      await this.prisma.integrationAccount.upsert({
        where: { id },
        update: fields,
        create: { id, workspaceId, provider: provider as IntegrationProvider, ...fields }
      });
      return `${appUrl}/?connected=${provider.toLowerCase()}`;
    } catch (callbackError) {
      return fail(callbackError instanceof Error ? callbackError.message : "exchange_failed");
    }
  }

  private async exchangeOAuthCode(provider: OAuthProvider, code: string): Promise<ExchangedToken> {
    if (provider === "META" || provider === "WHATSAPP") {
      const appId = this.config.get<string>(provider === "META" ? "META_APP_ID" : "WHATSAPP_APP_ID")
        || this.config.get<string>("META_APP_ID");
      const appSecret = this.config.get<string>(provider === "META" ? "META_APP_SECRET" : "WHATSAPP_APP_SECRET")
        || this.config.get<string>("META_APP_SECRET");
      const redirectUri = this.config.get<string>(provider === "META" ? "META_REDIRECT_URI" : "WHATSAPP_REDIRECT_URI")
        || this.config.get<string>("META_REDIRECT_URI");
      if (!appId || !appSecret) throw new Error("provider_not_configured");
      const tokenResponse = await firstValueFrom(
        this.http.get("https://graph.facebook.com/v20.0/oauth/access_token", {
          params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }
        })
      );
      const accessToken = tokenResponse.data?.access_token as string | undefined;
      if (!accessToken) throw new Error("no_access_token");
      const expiresIn = Number(tokenResponse.data?.expires_in ?? 0);
      let accountName: string | undefined;
      try {
        const me = await firstValueFrom(
          this.http.get("https://graph.facebook.com/v20.0/me", { params: { fields: "name", access_token: accessToken } })
        );
        accountName = me.data?.name as string | undefined;
      } catch {
        accountName = undefined;
      }
      return {
        accessToken,
        accountName,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined
      };
    }

    if (provider === "GOOGLE") {
      const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
      const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
      const redirectUri = this.config.get<string>("GOOGLE_REDIRECT_URI", "");
      if (!clientId || !clientSecret) throw new Error("provider_not_configured");
      const tokenResponse = await firstValueFrom(
        this.http.post(
          "https://oauth2.googleapis.com/token",
          new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code"
          }).toString(),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )
      );
      const accessToken = tokenResponse.data?.access_token as string | undefined;
      if (!accessToken) throw new Error("no_access_token");
      const expiresIn = Number(tokenResponse.data?.expires_in ?? 0);
      return {
        accessToken,
        refreshToken: tokenResponse.data?.refresh_token as string | undefined,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined
      };
    }

    const appId = this.config.get<string>("TIKTOK_APP_ID");
    const appSecret = this.config.get<string>("TIKTOK_APP_SECRET");
    if (!appId || !appSecret) throw new Error("provider_not_configured");
    const tokenResponse = await firstValueFrom(
      this.http.post("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
        app_id: appId,
        secret: appSecret,
        auth_code: code,
        grant_type: "auth_code"
      })
    );
    const data = tokenResponse.data?.data;
    const accessToken = data?.access_token as string | undefined;
    if (!accessToken) throw new Error("no_access_token");
    return {
      accessToken,
      refreshToken: data?.refresh_token as string | undefined,
      externalAccountId: Array.isArray(data?.advertiser_ids) ? String(data.advertiser_ids[0]) : undefined
    };
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
