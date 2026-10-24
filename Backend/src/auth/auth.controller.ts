import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma.service';
import { AuthenticatedRequest, AuthGuard } from './auth.guard';
import { LoginDto } from './dto/login.dto';

const COOKIE_NAME = 'admin_token';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// Hash de una contraseña aleatoria: se verifica contra él cuando el correo no existe,
// para que la respuesta tarde lo mismo y no revele qué correos están registrados.
let hashSenuelo: Promise<string> | undefined;
const obtenerHashSenuelo = () =>
  (hashSenuelo ??= argon2.hash(`senuelo-${Math.random()}-${Date.now()}`));

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: loginDto.email },
    });
    const hash = admin?.passwordHash ?? (await obtenerHashSenuelo());
    const valida = await argon2.verify(hash, loginDto.password);
    if (!admin || !valida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = await this.jwtService.signAsync({ sub: admin.id, email: admin.email });
    response.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_DURATION_MS,
      path: '/',
    });
    return { id: admin.id, email: admin.email, createdAt: admin.createdAt };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.admin;
  }
}
