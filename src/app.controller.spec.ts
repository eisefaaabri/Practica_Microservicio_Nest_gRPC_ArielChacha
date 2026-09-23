import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RpcException } from '@nestjs/microservices';
import { lastValueFrom, toArray } from 'rxjs';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('obtenerProducto', () => {
    it('debería retornar el producto si existe', () => {
      const result = appController.obtenerProducto({ id: 1 });
      expect(result.nombre).toBe('Teclado mecánico');
    });

    it('debería lanzar RpcException NOT_FOUND si no existe', () => {
      expect(() => appController.obtenerProducto({ id: 999 })).toThrow(RpcException);
    });
  });

  describe('listarProductos', () => {
    it('debería retornar un observable con todos los productos', async () => {
      const source$ = appController.listarProductos();
      const results = await lastValueFrom(source$.pipe(toArray()));
      expect(results.length).toBe(3);
      expect(results[0].nombre).toBe('Teclado mecánico');
    });
  });

  describe('buscarPorPrecioMaximo', () => {
    it('debería filtrar correctamente y completar el stream', async () => {
      const source$ = appController.buscarPorPrecioMaximo({ precioMaximo: 50 });
      const results = await lastValueFrom(source$.pipe(toArray()));
      expect(results.length).toBe(2);
    });

    it('debería retornar stream vacío si no hay coincidencias', async () => {
      const source$ = appController.buscarPorPrecioMaximo({ precioMaximo: 5 });
      const results = await lastValueFrom(source$.pipe(toArray()));
      expect(results.length).toBe(0);
    });
  });
});
