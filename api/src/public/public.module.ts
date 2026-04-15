import { Module } from '@nestjs/common';
import { PublicGeoController } from './public-geo.controller';
import { PublicRegistrationController } from './public-registration.controller';
import { PublicContentController } from './public-content.controller';

@Module({
  controllers: [PublicGeoController, PublicRegistrationController, PublicContentController],
})
export class PublicModule {}
