import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { initializeSheets } from './services/googleSheets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de la API
app.use('/api', apiRoutes);

// Servir la compilación estática del frontend (React Vite)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback para SPA (Single Page Application) en rutas no encontradas
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Inicializar la base de datos Google Sheets y luego arrancar el puerto
async function startServer() {
  try {
    console.log('🔄 Inicializando base de datos en Google Sheets...');
    await initializeSheets();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose correctamente en: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor de inventarios:', error.message);
    console.log('⚠️ El servidor continuará corriendo pero algunas API pueden fallar hasta que se resuelvan las credenciales.');
    
    // Iniciar el servidor de todos modos para permitir verificar logs o configuraciones
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en modo de degradación (sin DB) en: http://localhost:${PORT}`);
    });
  }
}

startServer();
