import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma.module';
import { DigitacionController } from './digitacion.controller';
import { DigitacionService } from './digitacion.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DigitacionController],
  providers: [DigitacionService],
})
export class DigitacionModule {}
