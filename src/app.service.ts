import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

export interface ProductoResponse {
  id: number;
  nombre: string;
  precio: number;
}

@Injectable()
export class AppService {
  private readonly productos: ProductoResponse[] = [
    { id: 1, nombre: 'Teclado mecánico', precio: 45.90 },
    { id: 2, nombre: 'Mouse inalámbrico', precio: 19.50 },
    { id: 3, nombre: 'Monitor 24"', precio: 129.99 },
  ];

  obtenerProducto(id: number): ProductoResponse {
    if (id <= 0) {
      throw new RpcException({ code: status.INVALID_ARGUMENT, message: 'ID debe ser mayor a 0' });
    }
    const producto = this.productos.find((p) => p.id === id);
    if (!producto) {
      throw new RpcException({ code: status.NOT_FOUND, message: `Producto ${id} no existe` });
    }
    return producto;
  }

  listarProductos(): ProductoResponse[] {
    return this.productos;
  }

  buscarPorPrecioMaximo(precioMaximo: number): ProductoResponse[] {
    if (precioMaximo < 0) {
      throw new RpcException({ code: status.INVALID_ARGUMENT, message: 'El precio máximo no puede ser negativo' });
    }
    return this.productos.filter((p) => p.precio <= precioMaximo);
  }
}
