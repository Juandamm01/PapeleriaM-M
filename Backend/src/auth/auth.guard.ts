import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';

export interface AuthenticatedRequest extends Request {
  admin: { id: string; email: string };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.admin_token as string | undefined;

    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: { sub: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token);
    } catch {
      throw new UnauthorizedException();
    }

    // Si el admin fue eliminado o cambió su correo, el token deja de servir aunque no haya expirado
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!admin || admin.email !== payload.email) {
      throw new UnauthorizedException();
    }

    request.admin = admin;
    return true;
  }
}
