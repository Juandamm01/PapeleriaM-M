import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma.module';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}
