"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const trips_controller_1 = require("./trips.controller");
const registration_requests_controller_1 = require("./registration-requests.controller");
const content_pages_controller_1 = require("./content-pages.controller");
const users_controller_1 = require("./users.controller");
const whatsapp_group_requests_controller_1 = require("./whatsapp-group-requests.controller");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            admin_controller_1.AdminController,
            trips_controller_1.AdminTripsController,
            registration_requests_controller_1.AdminRegistrationRequestsController,
            content_pages_controller_1.AdminContentPagesController,
            users_controller_1.AdminUsersController,
            whatsapp_group_requests_controller_1.AdminWhatsappGroupRequestsController,
        ],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map