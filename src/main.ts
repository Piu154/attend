import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // /t/<token> (the page customers open after scanning) lives outside /api
  app.setGlobalPrefix('api', { exclude: [{ path: 't/:token', method: RequestMethod.GET }] });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`ATTEND API running on http://localhost:${port}/api`);
}
bootstrap();
