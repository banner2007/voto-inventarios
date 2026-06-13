# Sistema de Gestión de Inventarios - VOTO Nacional

Este es un sistema modular y moderno de gestión de inventarios, optimizado para uso empresarial y diseñado para ser desplegado en un dominio web.

La aplicación utiliza **Google Sheets** como base de datos centralizada (independizando los cálculos operacionales en un servicio del backend para evitar concurrencia y facilitar futuras migraciones de base de datos) y **Cloudinary** para almacenar fotos de productos y logotipos.

---

## Características Principales

* **Dashboard Ejecutivo**: Resumen con totalizadores, valorización en tiempo real del inventario, bitácora de movimientos y alertas de bajo stock.
* **Módulo 1: Gestión de Proveedores**: Creación, consulta, edición y subida de logotipos a Cloudinary.
* **Módulo 2: Entrada de Inventario (Compras)**: Cabecera de factura, tabla dinámica de artículos con cálculo automático de IVA y costos, y actualización de existencias en lote.
* **Módulo 3: Catálogo de Productos**: Registro de especificaciones, carga obligatoria de fotos y generación interactiva de códigos de barra en formato **Code39** a partir de referencias.
* **Módulo 4: Egresos / Salidas**: Interfaz rápida diseñada para escaneo físico de códigos de barra, validación de stock disponible e impedimento de inventario negativo.
* **Módulo 5: Configuración de Precios**: Panel exclusivo de administración con costo de solo lectura y cálculo de margen sugerido (40%), además del histórico de cambios.
* **Seguridad & Roles**: Inicio de sesión cifrado para roles de **Administrador** y **Operador**, con bitácora de auditoría automática.
* **Interfaz Premium**: Diseño responsive, con menús adaptables y soporte completo de **Tema Claro y Oscuro**.

---

## Configuración y Requisitos Previos

### 1. Configuración de Google Sheets (Base de Datos)

Para conectar la aplicación con la hoja de cálculo de Google:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto nuevo, ingresa a la biblioteca de API y activa la **Google Sheets API**.
3. Dirígete a la sección de **API y Servicios > Credenciales** y crea una **Cuenta de Servicio (Service Account)**.
4. Genera una clave en formato **JSON** para esa Cuenta de Servicio. Abre el archivo JSON descargado; necesitarás el `client_email` y la `private_key` para configurarlos en el archivo `.env`.
5. Ve a tu hoja de Google Sheets (puedes usar la proporcionada):  
   `https://docs.google.com/spreadsheets/d/13-KsRVfaohWqH0cLQitGY6xCmSBlAxoxZITvLVMUJyw/edit?usp=sharing`  
   y haz clic en **Compartir**. Añade el correo de tu Cuenta de Servicio (ej: `xxxx@yyyy.iam.gserviceaccount.com`) con permisos de **Editor**.

> [!NOTE]
> Al iniciar por primera vez, el servidor creará de manera automatizada todas las pestañas necesarias (`Productos`, `Proveedores`, `Compras`, etc.) en la hoja de cálculo, sembrando además los usuarios por defecto (`admin`/`admin123` y `operador`/`operador123`).

### 2. Configuración de Cloudinary (Imágenes)

1. Regístrate o inicia sesión en [Cloudinary](https://cloudinary.com/).
2. Copia tu **Cloud Name**, **API Key** y **API Secret** desde tu consola de administración (Dashboard).
3. Añade estos valores al archivo `.env` del proyecto.

### 3. Configuración de Variables de Entorno (.env)

Asegúrate de agregar las siguientes claves en tu archivo `.env` en el servidor o localmente:

```env
# Configuración del servidor
PORT=3000
SESSION_SECRET=voto_nacional_jwt_secret_secreto

# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-cuenta-de-servicio@nombre-de-proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\n-----END PRIVATE KEY-----"
GOOGLE_SPREADSHEET_ID=13-KsRVfaohWqH0cLQitGY6xCmSBlAxoxZITvLVMUJyw

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

---

## Ejecución Local

Para tu comodidad, el proyecto incluye un entorno portable de Node.js. No necesitas instalar software global en tu computadora.

### Modo Desarrollo
Haz doble clic en el archivo **`dev.bat`** en la raíz del proyecto. Este script:
1. Detectará el entorno de Node.js portable.
2. Instalará automáticamente las dependencias si la carpeta `node_modules` no existe.
3. Iniciará en paralelo el servidor backend (puerto `3000`) y el frontend de desarrollo (puerto `5173`).
4. Abre [http://localhost:5173](http://localhost:5173) en tu navegador web.

---

## Compilación y Despliegue en Producción

### 1. Compilación
Antes de subir la aplicación a tu hosting o dominio, debes compilar el frontend. Haz doble clic en el archivo **`build.bat`**.
Este script generará la carpeta `/dist` con los archivos optimizados de producción (HTML, JS, CSS).

### 2. Arrancar en Producción
Una vez compilado, puedes iniciar el servidor Express en producción. Este servirá automáticamente tanto las API como los archivos compilados del frontend en el mismo puerto:
```bash
node-portable\node.exe server/app.js
```
El sistema estará disponible en [http://localhost:3000](http://localhost:3000).

### 3. Despliegue en un Dominio Web (Hosting / Nube)
Puedes desplegar esta aplicación en servicios populares como **Render**, **Heroku**, **Railway** o cualquier servidor **VPS**:

* **Render / Railway / Heroku**:
  1. Conecta tu repositorio de Git.
  2. Configura las variables de entorno en el panel del servicio (copiando los valores del `.env`).
  3. Define el comando de instalación como: `npm install`
  4. Define el comando de compilación (Build Command) como: `npm run build`
  5. Define el comando de inicio (Start Command) como: `npm start`
* **Servidor VPS (Ubuntu / Debian / Windows Server)**:
  1. Clona el proyecto en tu servidor.
  2. Crea el archivo `.env` con tus credenciales de producción.
  3. Ejecuta `npm install` y luego `npm run build`.
  4. Levanta el servidor Express usando un administrador de procesos como `pm2` para mantenerlo activo 24/7:
     ```bash
     pm2 start server/app.js --name "voto-inventarios"
     ```
  5. Configura un servidor web proxy inverso como Nginx para apuntar tu dominio (ej. `inventario.votonacional.com`) al puerto interno `3000`.
