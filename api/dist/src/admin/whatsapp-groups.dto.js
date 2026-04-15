"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWhatsappGroupDto = exports.CreateWhatsappGroupDto = void 0;
const class_validator_1 = require("class-validator");
class CreateWhatsappGroupDto {
    name;
    url;
    kind;
    provinceId;
    isActive;
}
exports.CreateWhatsappGroupDto = CreateWhatsappGroupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWhatsappGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateWhatsappGroupDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['MAIN', 'PROVINCE', 'CUSTOM']),
    __metadata("design:type", String)
], CreateWhatsappGroupDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateWhatsappGroupDto.prototype, "provinceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateWhatsappGroupDto.prototype, "isActive", void 0);
class UpdateWhatsappGroupDto {
    name;
    url;
    kind;
    provinceId;
    isActive;
}
exports.UpdateWhatsappGroupDto = UpdateWhatsappGroupDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateWhatsappGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], UpdateWhatsappGroupDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['MAIN', 'PROVINCE', 'CUSTOM']),
    __metadata("design:type", String)
], UpdateWhatsappGroupDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateWhatsappGroupDto.prototype, "provinceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateWhatsappGroupDto.prototype, "isActive", void 0);
//# sourceMappingURL=whatsapp-groups.dto.js.map