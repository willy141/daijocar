# DAIJOCAR — Gestión para taller mecánico

Aplicación local para organizar clientes, proveedores, vehículos y órdenes de trabajo. Los registros se guardan en `app/data/db.json` en el equipo donde se ejecuta Pinokio.

## Uso

1. En Pinokio, abrí **DAIJOCAR** y elegí **Instalar**.
2. Elegí **Iniciar** y después **Abrir sistema**.
3. Registrá clientes, proveedores y vehículos; luego creá órdenes vinculadas con sus vehículos.
4. Desde cada listado podés buscar, editar o borrar registros. Las órdenes permiten guardar tareas, fechas, estado, costo de mano de obra y repuestos.
5. Para hacer una copia, copiá el archivo `app/data/db.json` con la aplicación detenida. **Reiniciar base de datos** borra todos los registros.

La app no usa servicios externos ni envía información a Internet. El servidor escucha únicamente en `127.0.0.1`. La base es un archivo JSON local, apropiado para uso individual en un equipo; no está diseñada para ediciones simultáneas desde varios equipos.

## Datos guardados

- **Clientes:** nombre, apellido, teléfono, correo, dirección y notas.
- **Proveedores:** empresa o nombre, contacto, rubro, teléfono, correo, dirección y notas.
- **Vehículos:** patente, marca, modelo, año, propietario, fecha de ingreso, kilometraje y notas.
- **Órdenes de trabajo:** vehículo, ingreso, descripción del trabajo, estado, fecha de finalización, mano de obra, repuestos y observaciones.

## API HTTP

La base de URL es la que muestra Pinokio al iniciar, por ejemplo `http://127.0.0.1:3000`. Las respuestas y solicitudes usan JSON.

| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/dashboard` | Totales y trabajos recientes |
| GET | `/api/clients`, `/api/suppliers`, `/api/vehicles`, `/api/jobs` | Listar registros |
| POST | `/api/{recurso}` | Crear registro |
| PUT | `/api/{recurso}/{id}` | Actualizar registro |
| DELETE | `/api/{recurso}/{id}` | Eliminar registro |

### Ejemplo JavaScript

```js
const base = "http://127.0.0.1:3000";
const response = await fetch(`${base}/api/clients`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    firstName: "Ana",
    lastName: "Pérez",
    phone: "11 5555 1234",
    email: "ana@example.com",
    address: "Av. Siempre Viva 123"
  })
});
console.log(await response.json());
```

### Ejemplo Python

```python
import requests

response = requests.post(
    "http://127.0.0.1:3000/api/clients",
    json={
        "firstName": "Ana",
        "lastName": "Pérez",
        "phone": "11 5555 1234",
        "email": "ana@example.com",
        "address": "Av. Siempre Viva 123",
    },
)
response.raise_for_status()
print(response.json())
```

### Ejemplo cURL

```sh
curl http://127.0.0.1:3000/api/clients

curl -X POST http://127.0.0.1:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Ana","lastName":"Pérez","phone":"11 5555 1234","email":"ana@example.com","address":"Av. Siempre Viva 123"}'
```

Para vehículos, los campos mínimos son `make` y `plate`. Una orden requiere `vehicleId`, `entryDate` (formato `AAAA-MM-DD`) y `description`. Los importes `laborCost` y `partsCost` son números. El estado es `Pendiente`, `En proceso` o `Finalizado`.

## Ejecución directa

Requiere Node.js 18 o posterior; no necesita instalar paquetes.

```sh
cd app
node server.js
```
