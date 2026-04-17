"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicModule = void 0;
const common_1 = require("@nestjs/common");
const public_geo_controller_1 = require("./public-geo.controller");
const public_registration_controller_1 = require("./public-registration.controller");
const public_content_controller_1 = require("./public-content.controller");
const public_settings_controller_1 = require("./public-settings.controller");
const public_staff_controller_1 = require("./public-staff.controller");
let PublicModule = class PublicModule {
};
exports.PublicModule = PublicModule;
exports.PublicModule = PublicModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            public_geo_controller_1.PublicGeoController,
            public_registration_controller_1.PublicRegistrationController,
            public_content_controller_1.PublicContentController,
            public_settings_controller_1.PublicSettingsController,
            public_staff_controller_1.PublicStaffController,
        ],
    })
], PublicModule);
//# sourceMappingURL=public.module.js.map