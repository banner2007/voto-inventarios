import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

let EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let KEY = process.env.GOOGLE_PRIVATE_KEY;
let SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// Clean up wrapping quotes (common hosting env issue)
if (EMAIL && EMAIL.startsWith('"') && EMAIL.endsWith('"')) EMAIL = EMAIL.slice(1, -1);
if (SPREADSHEET_ID && SPREADSHEET_ID.startsWith('"') && SPREADSHEET_ID.endsWith('"')) SPREADSHEET_ID = SPREADSHEET_ID.slice(1, -1);
if (KEY) {
  if (KEY.startsWith('"') && KEY.endsWith('"')) {
    KEY = KEY.slice(1, -1);
  }
  KEY = KEY.replace(/\\n/g, '\n');
}


let auth;
let sheets;

if (EMAIL && KEY && SPREADSHEET_ID) {
  auth = new google.auth.JWT(
    EMAIL,
    null,
    KEY,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  sheets = google.sheets({ version: 'v4', auth });
} else {
  console.warn('⚠️ ADVERTENCIA: Credenciales de Google Sheets incompletas en .env. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY y GOOGLE_SPREADSHEET_ID.');
}

// Estructura de las tablas y sus cabeceras obligatorias
const REQUIRED_SHEETS = {
  'Usuarios': ['Username', 'PasswordHash', 'Role', 'Nombre', 'FechaCreacion'],
  'Proveedores': ['IdProveedor', 'Nombre', 'Telefono', 'Direccion', 'LogoUrl', 'FechaRegistro'],
  'Productos': ['IdProducto', 'Referencia', 'Nombre', 'Caracteristicas', 'FotoUrl', 'PrecioCompra', 'PrecioVenta', 'StockActual', 'FechaRegistro'],
  'Compras': ['IdCompra', 'IdProveedor', 'ProveedorNombre', 'FacturaNum', 'FechaCompra', 'TotalIva', 'TotalCompra', 'Usuario', 'FechaRegistro'],
  'CompraDetalles': ['IdCompraDetalle', 'IdCompra', 'ReferenciaProducto', 'NombreProducto', 'Cantidad', 'PrecioCosto', 'IvaPagado', 'Total'],
  'Movimientos': ['IdMovimiento', 'ReferenciaProducto', 'Tipo', 'Cantidad', 'PrecioUnitario', 'ReferenciaDocumento', 'Usuario', 'Fecha'],
  'PreciosHistorial': ['IdHistorial', 'ReferenciaProducto', 'PrecioCompra', 'PrecioVentaAnterior', 'PrecioVentaNuevo', 'Usuario', 'Fecha'],
  'Auditoria': ['IdAuditoria', 'Usuario', 'Accion', 'Fecha']
};

/**
 * Asegura que todas las pestañas necesarias existan en el Google Sheet
 * y tengan las cabeceras correspondientes. También siembra usuarios por defecto.
 */
export async function initializeSheets() {
  if (!sheets) {
    throw new Error('Google Sheets API no está inicializado. Faltan variables de entorno.');
  }

  try {
    // 1. Obtener metadatos del Spreadsheet para ver qué hojas ya existen
    const spreadsheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const existingSheetNames = new Set(
      spreadsheetMetadata.data.sheets.map(s => s.properties.title)
    );

    // 2. Crear las pestañas faltantes
    const requests = [];
    for (const sheetName of Object.keys(REQUIRED_SHEETS)) {
      if (!existingSheetNames.has(sheetName)) {
        requests.push({
          addSheet: {
            properties: {
              title: sheetName,
            }
          }
        });
      }
    }

    if (requests.length > 0) {
      console.log(`Creando pestañas faltantes en Google Sheets: ${requests.map(r => r.addSheet.properties.title).join(', ')}...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests }
      });
    }

    // 3. Escribir las cabeceras obligatorias en cada pestaña si están vacías
    for (const [sheetName, headers] of Object.entries(REQUIRED_SHEETS)) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1:Z1`,
      });

      if (!response.data.values || response.data.values.length === 0) {
        console.log(`Inicializando cabeceras para pestaña: ${sheetName}`);
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers]
          }
        });
      }
    }

    // 4. Sembrar usuarios por defecto si 'Usuarios' está vacía
    const users = await readTable('Usuarios');
    if (users.length === 0) {
      console.log('Sembrando usuarios por defecto...');
      const adminPassHash = await bcrypt.hash('admin123', 10);
      const operatorPassHash = await bcrypt.hash('operador123', 10);
      const defaultUsers = [
        {
          Username: 'admin',
          PasswordHash: adminPassHash,
          Role: 'Administrador',
          Nombre: 'Administrador Principal',
          FechaCreacion: new Date().toISOString()
        },
        {
          Username: 'operador',
          PasswordHash: operatorPassHash,
          Role: 'Operador',
          Nombre: 'Operador General',
          FechaCreacion: new Date().toISOString()
        }
      ];
      await appendRows('Usuarios', defaultUsers);
      console.log('Usuarios por defecto creados con éxito (admin/admin123, operador/operador123).');
    }

    console.log('✅ Base de datos Google Sheets inicializada correctamente.');
  } catch (error) {
    console.error('❌ Error al inicializar Google Sheets:', error);
    throw error;
  }
}

/**
 * Lee una pestaña completa y la devuelve como un array de objetos mapeados por cabecera
 */
export async function readTable(sheetName) {
  if (!sheets) throw new Error('Google Sheets API no configurada.');

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:Z10000`, // Limite amplio de filas
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return dataRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        // Rellenar con string vacío si la fila es más corta que las cabeceras
        obj[header] = row[index] !== undefined ? row[index] : '';
      });
      return obj;
    });
  } catch (error) {
    console.error(`Error al leer tabla ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Agrega filas a una pestaña mapeando objetos según las cabeceras
 */
export async function appendRows(sheetName, items) {
  if (!sheets) throw new Error('Google Sheets API no configurada.');
  if (!Array.isArray(items) || items.length === 0) return;

  try {
    const headers = REQUIRED_SHEETS[sheetName];
    if (!headers) throw new Error(`Tabla ${sheetName} no reconocida.`);

    const values = items.map(item => {
      return headers.map(header => {
        const val = item[header];
        return val !== undefined && val !== null ? String(val) : '';
      });
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values
      }
    });
  } catch (error) {
    console.error(`Error al insertar en tabla ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Actualiza una fila que coincide con un valor clave
 */
export async function updateRow(sheetName, keyColumn, keyValue, updatedFields) {
  if (!sheets) throw new Error('Google Sheets API no configurada.');

  try {
    const headers = REQUIRED_SHEETS[sheetName];
    if (!headers) throw new Error(`Tabla ${sheetName} no reconocida.`);

    const keyIndex = headers.indexOf(keyColumn);
    if (keyIndex === -1) throw new Error(`Columna clave ${keyColumn} no existe en ${sheetName}.`);

    // Leer toda la hoja para ubicar el índice de la fila
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:Z10000`,
    });

    const rows = response.data.values;
    if (!rows) throw new Error(`La tabla ${sheetName} está vacía.`);

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][keyIndex] === String(keyValue)) {
        rowIndex = i + 1; // 1-indexed y considerando cabecera
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`No se encontró registro con ${keyColumn} = ${keyValue} en ${sheetName}.`);
    }

    // Preparar los nuevos valores de la fila
    const currentRow = rows[rowIndex - 1];
    const newValues = headers.map((header, idx) => {
      if (updatedFields[header] !== undefined) {
        return String(updatedFields[header]);
      }
      return currentRow[idx] !== undefined ? String(currentRow[idx]) : '';
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [newValues]
      }
    });

    return true;
  } catch (error) {
    console.error(`Error al actualizar fila en ${sheetName}:`, error);
    throw error;
  }
}
