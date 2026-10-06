import { configureApp } from './configure-app';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApp(app);

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
  console.log(`⏱️ Rate Limiting habilitado`);
}
bootstrap();
