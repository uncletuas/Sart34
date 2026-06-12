import * as crypto from "node:crypto";
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

interface LeadEventPayload {
  email?: string;
  phone?: string;
  fullName?: string;
  eventId?: string;
  ip?: string;
  userAgent?: string;
  pageUrl?: string;
  value?: number;
  currency?: string;
}

@Injectable()
export class TiktokEventsService {
  private readonly logger = new Logger(TiktokEventsService.name);
  private readonly accessToken: string;
  private readonly pixelId: string;
  private readonly enabled: boolean;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {
    this.accessToken = config.get<string>("TIKTOK_PIXEL_ACCESS_TOKEN", "");
    this.pixelId = config.get<string>("TIKTOK_PIXEL_ID", "");
    this.enabled = !!(this.accessToken && this.pixelId);
    if (this.enabled) {
      this.logger.log("TikTok Events API active");
    }
  }

  async trackLead(payload: LeadEventPayload): Promise<void> {
    if (!this.enabled) return;

    const eventId = payload.eventId ?? crypto.randomUUID();
    const properties: Record<string, unknown> = {};
    if (payload.value) {
      properties.value = payload.value;
      properties.currency = payload.currency ?? "NGN";
    }

    const body = {
      pixel_code: this.pixelId,
      event: "Lead",
      event_id: eventId,
      timestamp: new Date().toISOString(),
      context: {
        user: {
          ...(payload.email ? { email: this.hashSha256(payload.email.toLowerCase().trim()) } : {}),
          ...(payload.phone ? { phone_number: this.hashSha256(payload.phone.replace(/\D/g, "")) } : {})
        },
        ...(payload.ip ? { ip: payload.ip } : {}),
        ...(payload.userAgent ? { user_agent: payload.userAgent } : {}),
        ...(payload.pageUrl ? { page: { url: payload.pageUrl } } : {})
      },
      properties
    };

    try {
      await firstValueFrom(
        this.http.post("https://business-api.tiktok.com/open_api/v1.3/pixel/track/", body, {
          headers: { "Access-Token": this.accessToken, "Content-Type": "application/json" }
        })
      );
    } catch (err) {
      this.logger.warn(`TikTok Events API error: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  private hashSha256(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
}
