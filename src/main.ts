import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const port = process.env.PORT || 5000;

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'productos',
      protoPath: join(__dirname, 'productos.proto'),
      url: `0.0.0.0:${port}`,
    },
  });
  await app.listen();
  console.log(`Microservicio gRPC escuchando en 0.0.0.0:${port}`);
}
bootstrap();