import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminTripsController } from './trips.controller';
import { AdminRegistrationRequestsController } from './registration-requests.controller';
import { AdminContentPagesController } from './content-pages.controller';
import { AdminUsersController } from './users.controller';
import { AdminWhatsappGroupRequestsController } from './whatsapp-group-requests.controller';
import { AdminSettingsController } from './settings.controller';
import { AdminPointRulesController } from './points-rules.controller';
import { AdminRewardsController } from './rewards.controller';
import { AdminRewardClaimsController } from './reward-claims.controller';
import { AdminAuditController } from './audit.controller';

@Module({
  controllers: [
    AdminController,
    AdminTripsController,
    AdminRegistrationRequestsController,
    AdminContentPagesController,
    AdminUsersController,
    AdminWhatsappGroupRequestsController,
    AdminSettingsController,
    AdminPointRulesController,
    AdminRewardsController,
    AdminRewardClaimsController,
    AdminAuditController,
  ],
})
export class AdminModule {}
