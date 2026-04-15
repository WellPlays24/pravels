import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
export type AuthedUser = {
    id: string;
    email: string;
    role: string;
    status: string;
    displayName: string | null;
    nickname: string | null;
    displayNamePreference: string;
    displayLabel: string;
    profilePhotoUrl: string | null;
    primaryProvinceId: number | null;
};
export type AuthedRequest = Request & {
    user: AuthedUser;
};
export declare function RequireAuth(...roles: string[]): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
export declare class AuthGuard implements CanActivate {
    private readonly reflector;
    private readonly prisma;
    constructor(reflector: Reflector, prisma: PrismaService);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
