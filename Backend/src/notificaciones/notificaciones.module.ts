import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { NotificacionesService } from './notificaciones.service';
import { WhatsAppClient } from './whatsapp.client';

@Module({
  imports: [PrismaModule],
  providers: [NotificacionesService, WhatsAppClient],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
