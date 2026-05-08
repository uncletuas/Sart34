import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Public } from "../../shared/decorators/public.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import type { AuthUser } from "../../shared/types/auth-user";
import { AdjustCreditsDto, BuyCreditsDto, VerifyPaymentDto } from "./dto/wallet.dto";
import { WalletService } from "./wallet.service";

@ApiBearerAuth()
@ApiTags("Wallet")
@Controller("wallet")
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  getWallet(@CurrentUser() user: AuthUser, @Query("workspaceId") workspaceId: string) {
    return this.wallet.getWallet(user, workspaceId);
  }

  @Get("transactions")
  transactions(@CurrentUser() user: AuthUser, @Query("workspaceId") workspaceId: string) {
    return this.wallet.transactions(user, workspaceId);
  }

  @Post("buy-credits")
  buyCredits(@CurrentUser() user: AuthUser, @Body() dto: BuyCreditsDto) {
    return this.wallet.buyCredits(user, dto);
  }

  @Post("verify")
  verify(@CurrentUser() user: AuthUser, @Body() dto: VerifyPaymentDto) {
    return this.wallet.verifyPayment(user, dto.reference);
  }

  @Public()
  @Post("webhook/paystack")
  paystackWebhook(@Headers("x-paystack-signature") signature: string | undefined, @Body() body: unknown) {
    return this.wallet.handlePaystackWebhook(signature, body);
  }

  @Roles("SUPER_ADMIN")
  @Post("admin/adjust")
  adjust(@CurrentUser() user: AuthUser, @Body() dto: AdjustCreditsDto) {
    return this.wallet.adjustCredits(user.sub, dto.workspaceId, dto.amount, dto.reason);
  }
}
