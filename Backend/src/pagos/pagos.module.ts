import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { WompiClient } from './wompi.client';

@Module({
  imports: [PrismaModule],
  controllers: [PagosController],
  providers: [PagosService, WompiClient],
})
export class PagosModule {}
