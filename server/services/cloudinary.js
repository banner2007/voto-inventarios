import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

let isConfigured = false;

if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET
  });
  isConfigured = true;
} else {
  console.warn('⚠️ ADVERTENCIA: Credenciales de Cloudinary incompletas en .env. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.');
}

/**
 * Sube un buffer de imagen a Cloudinary en una carpeta específica
 * @param {Buffer} fileBuffer - El buffer del archivo de imagen
 * @param {string} folder - Nombre de la carpeta en Cloudinary (ej: 'proveedores', 'productos')
 * @returns {Promise<string>} URL segura de la imagen subida
 */
export async function uploadImageBuffer(fileBuffer, folder = 'inventory') {
  if (!isConfigured) {
    throw new Error('Servicio de Cloudinary no configurado. Verifique las credenciales en su archivo .env.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `voto_nacional/${folder}`,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          console.error('Error al subir a Cloudinary:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    
    uploadStream.end(fileBuffer);
  });
}
