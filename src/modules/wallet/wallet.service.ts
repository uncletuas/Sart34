import * as crypto from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import type { AuthUser } from "../../shared/types/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { BuyCreditsDto } from "./dto/wallet.dto";

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {}

  async getWallet(user: AuthUser, workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    return this.prisma.creditWallet.findUnique({ where: { workspaceId }, include: { transactions: true } });
  }

  async transactions(user: AuthUser, workspaceId: string) {
    await this.workspaces.assertMembership(user.sub, user.role, workspaceId);
    return this.prisma.creditTransaction.findMany({
      where: { wallet: { workspaceId } },
      orderBy: { createdAt: "desc" }
    });
  }

  async buyCredits(user: AuthUser, dto: BuyCreditsDto) {
    await this.workspaces.assertMembership(user.sub, user.role, dto.workspaceId, ["OWNER", "ADMIN"]);
    const bundle = await this.prisma.creditBundle.findFirst({ where: { id: dto.bundleId, active: true } });
    if (!bundle) throw new BadRequestException("Credit bundle not found.");
    const reference = `sart34_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const workspace = await this.prisma.workspace.findUniqueOrThrow({ where: { id: dto.workspaceId } });
    const secret = this.config.get<string>("PAYSTACK_SECRET_KEY");
    let authorizationUrl: string | undefined;

    if (secret) {
      const response = await firstValueFrom(
        this.http.post(
          "https://api.paystack.co/transaction/initialize",
          {
            email: workspace.email ?? user.email,
            amount: Number(bundle.amount) * 100,
            reference,
            currency: bundle.currency,
            metadata: { workspaceId: dto.workspaceId, credits: bundle.credits }
          },
          { headers: { Authorization: `Bearer ${secret}` } }
        )
      );
      authorizationUrl = response.data?.data?.authorization_url as string | undefined;
    }

    const payment = await this.prisma.paymentTransaction.create({
      data: {
        workspaceId: dto.workspaceId,
        amount: bundle.amount,
        currency: bundle.currency,
        creditsPurchased: bundle.credits,
        providerReference: reference,
        authorizationUrl,
        status: secret ? "PENDING" : "SUCCESS"
      }
    });

    if (!secret) await this.credit(dto.workspaceId, bundle.credits, "Mock credit purchase", reference);
    return payment;
  }

  async verifyPayment(user: AuthUser, reference: string) {
    const payment = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { providerReference: reference } });
    await this.workspaces.assertMembership(user.sub, user.role, payment.workspaceId, ["OWNER", "ADMIN"]);
    return this.finalizePayment(reference);
  }

  async deduct(workspaceId: string, amount: number, reason: string, reference?: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.findUnique({ where: { workspaceId } });
      if (!wallet || wallet.balance < amount) throw new ForbiddenException("Insufficient Sart34 credits.");
      const updated = await tx.creditWallet.update({
        where: { workspaceId },
        data: { balance: { decrement: amount } }
      });
      await tx.creditTransaction.create({
        data: { walletId: wallet.id, type: "DEDUCTION", amount: -amount, reason, reference }
      });
      return updated;
    });
  }

  async credit(workspaceId: string, amount: number, reason: string, reference?: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.upsert({
        where: { workspaceId },
        create: { workspaceId, balance: amount },
        update: { balance: { increment: amount } }
      });
      await tx.creditTransaction.create({
        data: { walletId: wallet.id, type: "PURCHASE", amount, reason, reference }
      });
      return wallet;
    });
  }

  async adjustCredits(adminId: string, workspaceId: string, amount: number, reason: string) {
    const wallet = await this.prisma.creditWallet.upsert({
      where: { workspaceId },
      create: { workspaceId, balance: amount },
      update: { balance: { increment: amount } }
    });
    await this.prisma.creditTransaction.create({
      data: { walletId: wallet.id, type: "ADJUSTMENT", amount, reason, reference: adminId }
    });
    return wallet;
  }

  async handlePaystackWebhook(signature: string | undefined, body: unknown) {
    const secret = this.config.get<string>("PAYSTACK_WEBHOOK_SECRET");
    if (secret && signature) {
      const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(body)).digest("hex");
      if (hash !== signature) throw new ForbiddenException("Invalid Paystack signature.");
    }
    const payload = body as { event?: string; data?: { reference?: string } };
    await this.prisma.webhookEvent.create({
      data: {
        provider: "paystack",
        event: payload.event ?? "unknown",
        reference: payload.data?.reference,
        payload: body as object
      }
    });
    if (payload.event === "charge.success" && payload.data?.reference) {
      await this.finalizePayment(payload.data.reference);
    }
    return { success: true };
  }

  private async finalizePayment(reference: string) {
    const payment = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { providerReference: reference } });
    if (payment.status === "SUCCESS") return payment;
    const updated = await this.prisma.paymentTransaction.update({
      where: { providerReference: reference },
      data: { status: "SUCCESS" }
    });
    await this.credit(payment.workspaceId, payment.creditsPurchased, "Credit purchase", reference);
    return updated;
  }
}
