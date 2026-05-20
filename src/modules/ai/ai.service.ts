import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MessageChannel, PolicyRiskLevel, Prisma } from "@prisma/client";
import OpenAI from "openai";
import type { AuthUser } from "../../shared/types/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";

const BLOCKED_PATTERNS = [
  /guaranteed profit/i,
  /guaranteed sales/i,
  /instant success/i,
  /before and after/i,
  /crypto/i,
  /loan/i,
  /political/i,
  /adult/i,
  /gambling/i
];

@Injectable()
export class AiService {
  private readonly client?: OpenAI;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly config: ConfigService
  ) {
    const apiKey = config.get<string>("OPENAI_API_KEY");
    this.model = config.get<string>("OPENAI_MODEL", "gpt-4.1-mini");
    this.client = apiKey ? new OpenAI({ apiKey }) : undefined;
  }

  async generateCampaign(user: AuthUser, workspaceId: string, input: Record<string, unknown>, mode = "quick") {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    const platforms = Array.isArray((input as { targetPlatforms?: unknown }).targetPlatforms)
      ? ((input as { targetPlatforms: string[] }).targetPlatforms)
      : ["META"];
    const output = await this.structuredJson("campaign-generation", {
      mode,
      targetPlatforms: platforms,
      instruction:
        "Generate ad copy tailored to each target platform. Respect each platform's limits: " +
        "META primary_text max 125 chars and headline max 40 chars; " +
        "GOOGLE headlines max 30 chars (provide several) and descriptions max 90 chars; " +
        "TIKTOK a short spoken hook plus an on-screen caption; " +
        "WHATSAPP a concise opening message under 250 chars. " +
        "Return only JSON with campaign_name, objective, audiences, " +
        "ad_copies (array, one or more per platform, each with platform, primary_text, headline, description, cta), " +
        "lead_form_questions, follow_up_messages, budget_recommendation, policy_risk.",
      input
    });
    await this.prisma.aiGeneration.create({
      data: {
        workspaceId,
        type: "campaign-generation",
        prompt: JSON.stringify(input),
        outputJson: output as Prisma.InputJsonValue,
        provider: this.client ? "openai" : "mock",
        model: this.model,
        creditCost: 20
      }
    });
    return output;
  }

  async generatePost(
    user: AuthUser,
    workspaceId: string,
    input: { prompt: string; platforms?: string[]; tone?: string }
  ) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    const output = await this.structuredJson("post-draft", {
      instruction:
        "Draft one engaging organic social media caption that works across the given platforms. " +
        "Keep it concise, native to social feeds, and free of policy-risky or guaranteed-result claims. " +
        "Return only JSON with caption (string), hashtags (array of words without the # symbol), and " +
        "variants (array of { platform, caption } only for platforms that clearly benefit from a tailored version).",
      input
    });
    await this.prisma.aiGeneration.create({
      data: {
        workspaceId,
        type: "post-draft",
        prompt: JSON.stringify(input),
        outputJson: output as Prisma.InputJsonValue,
        provider: this.client ? "openai" : "mock",
        model: this.model,
        creditCost: 5
      }
    });
    return output;
  }

  async reviewPolicy(user: AuthUser, workspaceId: string, content: Record<string, unknown>) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    return this.scanPolicy(content);
  }

  async generateFollowUp(
    user: AuthUser,
    workspaceId: string,
    leadContext: Record<string, unknown>,
    channel: MessageChannel
  ) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    const output = await this.structuredJson("follow-up-message", {
      channel,
      instruction: "Generate one concise follow-up message. Return JSON with message, suggested_next_action, temperature.",
      leadContext
    });
    return output;
  }

  async generateOptimization(user: AuthUser, workspaceId: string, campaignContext: Record<string, unknown>) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    const output = await this.structuredJson("optimization", {
      instruction:
        "Review this campaign and suggest concrete improvements. Return JSON with sections: copy, creative, audience, budget, follow_up. Each section is an array of short, actionable suggestions.",
      campaignContext
    });
    return output;
  }

  scanPolicy(content: unknown): { level: PolicyRiskLevel; warnings: string[]; requiresHumanReview: boolean } {
    const text = JSON.stringify(content);
    const warnings = BLOCKED_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) =>
      pattern.source.replace(/\\/g, "")
    );
    const level: PolicyRiskLevel = warnings.length >= 3 ? "BLOCKED" : warnings.length > 0 ? "HIGH" : "LOW";
    return { level, warnings, requiresHumanReview: level === "HIGH" || level === "BLOCKED" };
  }

  private async structuredJson(type: string, payload: Record<string, unknown>) {
    if (!this.client) return this.mockOutput(type, payload);
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are Sart34's ad operations AI. Return strict JSON only. Avoid guarantees and policy-risky claims."
        },
        { role: "user", content: JSON.stringify(payload) }
      ],
      response_format: { type: "json_object" }
    });
    const text = response.choices[0]?.message.content ?? "{}";
    return JSON.parse(text) as Record<string, unknown>;
  }

  private mockOutput(type: string, payload: Record<string, unknown>) {
    if (type === "post-draft") {
      return {
        caption: "We just dropped something we think you'll love. Tap in, take a look, and tell us what you think.",
        hashtags: ["smallbusiness", "newdrop", "shoplocal"],
        variants: []
      };
    }
    if (type === "optimization") {
      return {
        copy: ["Lead with a stronger 3 word hook", "Add a price anchor to set expectations"],
        creative: ["Test a 9:16 vertical version for Reels and TikTok", "Try a UGC-style talking head against the polished cut"],
        audience: ["Narrow age to 25 to 45 if cost per lead is rising", "Test a 1% lookalike of recent leads"],
        budget: ["Hold daily spend for 4 days before optimizing", "Shift 30 percent of budget to the best ad set after day 5"],
        follow_up: ["Reply within 5 minutes to lift conversion 2x", "Send a follow-up the next morning if no response in 24 hours"]
      };
    }
    if (type === "follow-up-message") {
      return {
        message: "Thanks for your interest. Would you like more details or should we schedule a quick follow-up?",
        suggested_next_action: "Ask for preferred contact time",
        temperature: "WARM"
      };
    }
    return {
      campaign_name: "Sart34 Generated Campaign",
      objective: "lead_generation",
      audiences: [{ name: "Local High-Intent Buyers", description: "People likely to enquire about the offer." }],
      ad_copies: [
        {
          primary_text: "Discover this offer and request details today.",
          headline: "Request Details Today",
          description: "Chat with the business for availability and next steps.",
          cta: "Send Message"
        }
      ],
      lead_form_questions: ["What is your budget?", "When would you like to be contacted?"],
      follow_up_messages: [{ stage: "new_lead", message: "Thank you for your interest. Would you like details?" }],
      budget_recommendation: { daily_budget: 5000, currency: "NGN" },
      policy_risk: this.scanPolicy(payload)
    };
  }
}
