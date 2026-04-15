import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { mkdir } from 'node:fs/promises';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',').map((s) => s.trim()) ?? true,
    credentials: true,
  });

  const staticDirs: Array<{ env: string; mount: string }> = [
    { env: 'PRAVELS_PLANES_DIR', mount: '/files/planes' },
    { env: 'PRAVELS_PAYMENTS_DIR', mount: '/files/payments' },
    { env: 'PRAVELS_MEMBERS_DIR', mount: '/files/members' },
    { env: 'PRAVELS_PROFILE_PHOTOS_DIR', mount: '/files/profile-photos' },
    { env: 'PRAVELS_CONTENT_DIR', mount: '/files/content' },
  ];

  for (const s of staticDirs) {
    const dir = process.env[s.env];
    if (!dir) continue;
    await mkdir(dir, { recursive: true });
    // Serve uploaded files in dev
    app.use(s.mount, express.static(dir));
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(Number(process.env.PORT ?? 3001));
}
bootstrap();
