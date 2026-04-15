import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
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

export type AuthedRequest = Request & { user: AuthedUser };

const AUTH_META = {
  required: 'auth.required',
  roles: 'auth.roles',
};

export function RequireAuth(...roles: string[]) {
  return applyDecorators(SetMetadata(AUTH_META.required, true), SetMetadata(AUTH_META.roles, roles));
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(AUTH_META.required, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const authHeader = (req.headers as any)?.authorization as string | undefined;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required');

    let sub: string;
    try {
      const res = await jwtVerify(token, new TextEncoder().encode(secret));
      sub = res.payload.sub as string;
      if (!sub) throw new Error('Missing sub');
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.userProfile.findUnique({
      where: { id: sub },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const preference = (user as any).displayNamePreference ?? 'FULL_NAME';
    const nickname = ((user as any).nickname ?? null) as string | null;
    const displayName = (user.displayName ?? null) as string | null;
    const displayLabel =
      preference === 'NICKNAME' && nickname && nickname.trim().length
        ? nickname.trim()
        : displayName && displayName.trim().length
          ? displayName.trim()
          : user.email;

    (req as any).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      displayName: user.displayName,
      nickname,
      displayNamePreference: preference,
      displayLabel,
      profilePhotoUrl: ((user as any).profilePhotoUrl ?? null) as string | null,
      primaryProvinceId: user.primaryProvinceId ?? null,
    };

    const roles =
      this.reflector.getAllAndOverride<string[] | undefined>(AUTH_META.roles, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];
    if (roles.length > 0 && !roles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
