import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTO_PATH = path.join(__dirname, 'src', 'productos.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true });
const proto = grpc.loadPackageDefinition(packageDef).productos;

const client = new proto.ProductoService('localhost:5000', grpc.credentials.createInsecure());

console.log('== ObtenerProducto (unary) ==');
client.obtenerProducto({ id: 1 }, (err, producto) => {
    if (err) {
        console.error('Error gRPC:', err.code, err.details);
        return;
    }
    console.log(`${producto.id} - ${producto.nombre} - $${producto.precio}`);

    console.log('\n== ListarProductos (server streaming) ==');
    const call = client.listarProductos({});
    call.on('data', (p) => {
        console.log(`${p.id} - ${p.nombre} - $${p.precio}  (llegó en streaming)`);
    });
    call.on('end', () => console.log('Streaming finalizado.'));
    call.on('error', (err) => console.error('Error en el stream:', err.code, err.details));

    console.log('\n== Prueba de error (id inexistente) ==');
    client.obtenerProducto({ id: 999 }, (err, producto) => {
        if (err) {
            console.log(`Error gRPC: ${err.code} - ${err.details}`);
        } else {
            console.log('No debería llegar aquí:', producto);
        }

        console.log('\n== BuscarPorPrecioMaximo (precioMaximo: 50.0) ==');
        const searchCall = client.buscarPorPrecioMaximo({ precioMaximo: 50.0 });
        searchCall.on('data', (p) => {
            console.log(`${p.id} - ${p.nombre} - $${p.precio}  (llegó en streaming)`);
        });
        searchCall.on('end', () => console.log('Búsqueda finalizada.'));
        searchCall.on('error', (err) => console.error('Error en el stream:', err.code, err.details));
    });
});