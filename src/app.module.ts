import "dotenv/config";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AdminModule } from "./modules/admin/admin.module";
import { AiModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "./modules/auth/guards/roles.guard";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { CreativesModule } from "./modules/creatives/creatives.module";
import { CrmModule } from "./modules/crm/crm.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ReportingModule } from "./modules/reporting/reporting.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";
import { validateConfig } from "./shared/config/validate-config";

const queuesEnabled = process.env.DISABLE_QUEUES !== "true";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateConfig }),
    ...(queuesEnabled
      ? [
          BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              connection: {
                host: config.get<string>("REDIS_HOST", "localhost"),
                port: config.get<number>("REDIS_PORT", 6379)
              }
            })
          })
        ]
      : []),
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    AiModule,
    CampaignsModule,
    CreativesModule,
    IntegrationsModule,
    CrmModule,
    WalletModule,
    ReportingModule,
    AdminModule,
    NotificationsModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule {}
