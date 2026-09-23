import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { Transport, MicroserviceOptions, ClientsModule, ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { lastValueFrom, Observable } from 'rxjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProductoService {
  obtenerProducto(data: { id: number }): Observable<{ nombre: string }>;
}

describe('AppController (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientGrpc;
  let productoService: ProductoService;

  beforeAll(async () => {
    const protoPath = join(__dirname, '../src/productos.proto');
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ClientsModule.register([
          {
            name: 'PRODUCTO_PACKAGE',
            transport: Transport.GRPC,
            options: {
              package: 'productos',
              protoPath,
              url: '0.0.0.0:5001', // Puerto distinto al de dev
            },
          },
        ]),
      ],
    }).compile();

    app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'productos',
        protoPath,
        url: '0.0.0.0:5001',
      },
    });

    await app.listen();
    client = app.get<ClientGrpc>('PRODUCTO_PACKAGE');
    productoService = client.getService<ProductoService>('ProductoService');
  });

  it('ObtenerProducto (gRPC)', async () => {
    const result = await lastValueFrom(productoService.obtenerProducto({ id: 1 }));
    expect(result.nombre).toBe('Teclado mecánico');
  });

  afterAll(async () => {
    await app.close();
  });
});
