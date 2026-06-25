import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { initializeSheets } from './services/googleSheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicialización diferida de Google Sheets para entornos Serverless
let isSheetsInitialized = false;
let sheetsInitializationPromise = null;

async function ensureSheetsInitialized() {
  if (isSheetsInitialized) return;
  if (!sheetsInitializationPromise) {
    console.log('🔄 Inicializando base de datos en Google Sheets para Serverless...');
    sheetsInitializationPromise = initializeSheets()
      .then(() => {
        isSheetsInitialized = true;
        console.log('✅ Base de datos Google Sheets inicializada correctamente en Serverless.');
      })
      .catch((err) => {
        sheetsInitializationPromise = null;
        console.error('❌ Error fatal al iniciar Google Sheets en Serverless:', err.message);
        throw err;
      });
  }
  await sheetsInitializationPromise;
}

// Middleware para asegurar que Sheets esté inicializado antes de procesar cualquier endpoint
app.use(async (req, res, next) => {
  try {
    await ensureSheetsInitialized();
    next();
  } catch (error) {
    next(); // Continuar el flujo según diseño original de app.js
  }
});

// Rutas de la API
app.use('/api', apiRoutes);

// Servir la compilación estática del frontend (React Vite) - útil para desarrollo local
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback para SPA (Single Page Application) en rutas no encontradas
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Arrancar puerto sólo si se ejecuta de manera local (no serverless en Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  ensureSheetsInitialized().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose localmente en: http://localhost:${PORT}`);
    });
  }).catch(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en modo degradado localmente en: http://localhost:${PORT}`);
    });
  });
}

export default app;
