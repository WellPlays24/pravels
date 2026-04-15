"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const express_1 = __importDefault(require("express"));
const promises_1 = require("node:fs/promises");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: process.env.WEB_ORIGIN?.split(',').map((s) => s.trim()) ?? true,
        credentials: true,
    });
    const staticDirs = [
        { env: 'PRAVELS_PLANES_DIR', mount: '/files/planes' },
        { env: 'PRAVELS_PAYMENTS_DIR', mount: '/files/payments' },
        { env: 'PRAVELS_MEMBERS_DIR', mount: '/files/members' },
        { env: 'PRAVELS_PROFILE_PHOTOS_DIR', mount: '/files/profile-photos' },
        { env: 'PRAVELS_CONTENT_DIR', mount: '/files/content' },
    ];
    for (const s of staticDirs) {
        const dir = process.env[s.env];
        if (!dir)
            continue;
        await (0, promises_1.mkdir)(dir, { recursive: true });
        app.use(s.mount, express_1.default.static(dir));
    }
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    await app.listen(Number(process.env.PORT ?? 3001));
}
bootstrap();
//# sourceMappingURL=main.js.map