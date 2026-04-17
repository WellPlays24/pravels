import { Module } from '@nestjs/common';
import { PublicGeoController } from './public-geo.controller';
import { PublicRegistrationController } from './public-registration.controller';
import { PublicContentController } from './public-content.controller';
import { PublicSettingsController } from './public-settings.controller';
import { PublicStaffController } from './public-staff.controller';

@Module({
  controllers: [
    PublicGeoController,
    PublicRegistrationController,
    PublicContentController,
    PublicSettingsController,
    PublicStaffController,
  ],
})
export class PublicModule {}
