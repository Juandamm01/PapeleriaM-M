import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { ConfiguracionService } from './configuracion.service';

@Controller()
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  /** Tarifas y horarios públicos: los usa la página de precios y la cotización en vivo. */
  @Get('configuracion/publica')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  publica() {
    return this.configuracion.publica();
  }

  @Get('recogida/franjas')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  franjas() {
    return this.configuracion.franjas();
  }

  @Get('configuracion')
  @UseGuards(AuthGuard)
  async admin() {
    const { tarifas, horarios, updatedAt } = await this.configuracion.obtener();
    return { tarifas, horarios, updatedAt };
  }

  @Put('configuracion/tarifas')
  @UseGuards(AuthGuard)
  async tarifas(@Body() body: Record<string, unknown>) {
    const { tarifas, updatedAt } = await this.configuracion.actualizarTarifas(body);
    return { tarifas, updatedAt };
  }

  @Put('configuracion/horarios')
  @UseGuards(AuthGuard)
  async horarios(@Body() body: Record<string, unknown>) {
    const { horarios, updatedAt } = await this.configuracion.actualizarHorarios(body);
    return { horarios, updatedAt };
  }
}
