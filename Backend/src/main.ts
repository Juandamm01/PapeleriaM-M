import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { cabecerasDeSeguridad } from './seguridad/cabeceras';
import { origenesPermitidos, saltosDeProxy, validarEntorno } from './seguridad/entorno';

async function bootstrap() {
  validarEntorno();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.disable('x-powered-by');
  // Detrás de un proxy, sin esto el rate limit vería la IP del proxy y no la del cliente
  const saltos = saltosDeProxy();
  if (saltos > 0) app.set('trust proxy', saltos);

  app.use(cabecerasDeSeguridad);
  app.use(cookieParser());
  app.enableCors({
    origin: origenesPermitidos(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
