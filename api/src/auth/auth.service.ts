import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { TextEncoder } from 'util';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.userProfile.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { localCredential: true },
    });

    if (!user?.localCredential) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.localCredential.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'APPROVED' && user.role !== 'SUPER_ADMIN') {
      // For dev admin usage we still want status checks.
      throw new UnauthorizedException('User is not approved');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required');

    const token = await new SignJWT({ role: user.role, status: user.status })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(new TextEncoder().encode(secret));

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        displayName: user.displayName,
      },
    };
  }
}
