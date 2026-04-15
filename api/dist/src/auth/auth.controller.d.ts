import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';
import type { AuthedRequest } from './auth.guard';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.AccountStatus;
            displayName: string | null;
        };
    }>;
    me(req: AuthedRequest): Promise<import("./auth.guard").AuthedUser>;
}
