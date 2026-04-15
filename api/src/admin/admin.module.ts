import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminTripsController } from './trips.controller';
import { AdminRegistrationRequestsController } from './registration-requests.controller';
import { AdminContentPagesController } from './content-pages.controller';
import { AdminUsersController } from './users.controller';
import { AdminWhatsappGroupRequestsController } from './whatsapp-group-requests.controller';

@Module({
  controllers: [
    AdminController,
    AdminTripsController,
    AdminRegistrationRequestsController,
    AdminContentPagesController,
    AdminUsersController,
    AdminWhatsappGroupRequestsController,
  ],
})
export class AdminModule {}
