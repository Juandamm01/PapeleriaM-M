import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CrearPagoDto, ReferenciaPagoDto } from './dto/crear-pago.dto';
import { EventoWompi } from './firma';
import { PagosService } from './pagos.service';

@Controller('pagos')
@UseGuards(ThrottlerGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('config')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  config() {
    return this.pagosService.configuracion();
  }

  @Get('aceptacion')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  aceptacion() {
    return this.pagosService.aceptacion();
  }

  /** Inicia un cobro con Nequi. El monto sale del pedido en la base, nunca del cliente. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  crear(@Body() dto: CrearPagoDto) {
    return this.pagosService.crear(dto);
  }

  /** Webhook de Wompi: verifica la firma, responde 200 de inmediato y procesa después. */
  @Post('webhook')
  @HttpCode(200)
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  webhook(@Body() evento: Record<string, unknown>, @Headers('x-event-checksum') checksum?: string) {
    const cuerpo = evento as EventoWompi;
    if (!this.pagosService.verificarEvento(cuerpo, checksum)) {
      throw new UnauthorizedException('Firma de evento inválida');
    }
    setImmediate(() => void this.pagosService.procesarEvento(cuerpo));
    return { recibido: true };
  }

  /** La pantalla de espera consulta aquí; si hace falta, el servidor pregunta a Wompi. */
  @Get(':referencia')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  estado(@Param() params: ReferenciaPagoDto) {
    return this.pagosService.estado(params.referencia);
  }
}
