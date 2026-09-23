import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { AppService } from './app.service.js';
import type { ProductoResponse } from './app.service.js';

interface ProductoRequest { id: number; }
interface FiltroPrecioRequest { precioMaximo: number; }

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @GrpcMethod('ProductoService', 'ObtenerProducto')
  obtenerProducto(data: ProductoRequest): ProductoResponse {
    return this.appService.obtenerProducto(data.id);
  }

  @GrpcMethod('ProductoService', 'ListarProductos')
  listarProductos(): Observable<ProductoResponse> {
    const productos = this.appService.listarProductos();
    
    return new Observable((subscriber) => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < productos.length) {
          subscriber.next(productos[i]);
          i++;
        } else {
          clearInterval(interval);
          subscriber.complete();
        }
      }, 300);

      // Teardown logic: limpia el timer si el cliente cancela la conexión
      return () => clearInterval(interval);
    });
  }

  @GrpcMethod('ProductoService', 'BuscarPorPrecioMaximo')
  buscarPorPrecioMaximo(data: FiltroPrecioRequest): Observable<ProductoResponse> {
    const productosFiltrados = this.appService.buscarPorPrecioMaximo(data.precioMaximo);
    
    return new Observable((subscriber) => {
      let i = 0;
      if (productosFiltrados.length === 0) {
        subscriber.complete();
        return;
      }
      
      const interval = setInterval(() => {
        if (i < productosFiltrados.length) {
          subscriber.next(productosFiltrados[i]);
          i++;
        } else {
          clearInterval(interval);
          subscriber.complete();
        }
      }, 300);

      // Teardown logic: limpia el timer si el cliente cancela la conexión
      return () => clearInterval(interval);
    });
  }
}