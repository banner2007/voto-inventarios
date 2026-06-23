import express from 'express';
import multer from 'multer';
import { loginUser, authenticateToken, requireRole } from '../services/auth.js';
import { uploadImageBuffer } from '../services/cloudinary.js';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  getProducts,
  createProduct,
  updateProduct,
  registerPurchase,
  registerSale,
  getSales,
  updateProductPrice,
  getDashboardStats,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase
} from '../services/inventory.js';
import { readTable } from '../services/googleSheets.js';

const router = express.Router();

// Configurar multer en memoria para recibir imágenes (límite 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// --- 1. SUBIDA DE ARCHIVOS A CLOUDINARY ---
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún archivo.' });
    }
    // Determinar subcarpeta según el query param (ej: /api/upload?folder=productos)
    const folder = req.query.folder || 'general';
    const url = await uploadImageBuffer(req.file.buffer, folder);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error al subir la imagen a Cloudinary.' });
  }
});

// --- 2. AUTENTICACIÓN ---
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña obligatorios.' });
    }
    const session = await loginUser(username, password);
    res.json(session);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// --- 3. GESTIÓN DE PROVEEDORES (MÓDULO 1) ---
router.get('/suppliers', authenticateToken, async (req, res) => {
  try {
    const suppliers = await getSuppliers();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/suppliers', authenticateToken, async (req, res) => {
  try {
    const { nombre, telefono, direccion, logoUrl } = req.body;
    if (!nombre || !telefono || !direccion) {
      return res.status(400).json({ error: 'Nombre, teléfono y dirección son obligatorios.' });
    }
    const supplier = await createSupplier(req.body, req.user.username);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body;
    if (!nombre || !telefono || !direccion) {
      return res.status(400).json({ error: 'Nombre, teléfono y dirección son obligatorios.' });
    }
    const supplier = await updateSupplier(req.params.id, req.body, req.user.username);
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 4. CATÁLOGO DE PRODUCTOS (MÓDULO 3) ---
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', authenticateToken, async (req, res) => {
  try {
    const { referencia, nombre, fotoUrl } = req.body;
    if (!referencia || !nombre || !fotoUrl) {
      return res.status(400).json({ error: 'Referencia, nombre y foto del producto son obligatorios.' });
    }
    const product = await createProduct(req.body, req.user.username);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/products/:id', authenticateToken, async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
    }
    const product = await updateProduct(req.params.id, req.body, req.user.username);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 5. ENTRADA DE COMPRAS (MÓDULO 2) ---
router.post('/purchases', authenticateToken, async (req, res) => {
  try {
    const { header, items } = req.body;
    if (!header || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Datos de cabecera y artículos comprados obligatorios.' });
    }
    const { idProveedor, facturaNum, fechaCompra } = header;
    if (!idProveedor || !facturaNum || !fechaCompra) {
      return res.status(400).json({ error: 'Proveedor, número de factura y fecha de compra obligatorios.' });
    }
    
    const result = await registerPurchase(header, items, req.user.username);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/purchases', authenticateToken, async (req, res) => {
  try {
    const purchases = await getPurchases();
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/purchases/:id', authenticateToken, async (req, res) => {
  try {
    const purchase = await getPurchaseById(req.params.id);
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/purchases/:id', authenticateToken, async (req, res) => {
  try {
    const { header, items } = req.body;
    if (!header || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Datos de cabecera y artículos comprados obligatorios.' });
    }
    const { idProveedor, facturaNum, fechaCompra } = header;
    if (!idProveedor || !facturaNum || !fechaCompra) {
      return res.status(400).json({ error: 'Proveedor, número de factura y fecha de compra obligatorios.' });
    }
    
    const result = await updatePurchase(req.params.id, header, items, req.user.username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/purchases/:id', authenticateToken, async (req, res) => {
  try {
    const result = await deletePurchase(req.params.id, req.user.username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 6. EGRESOS / SALIDA DE INVENTARIO (MÓDULO 4) ---
router.post('/sales', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Los artículos de salida son obligatorios.' });
    }
    const result = await registerSale(items, req.user.username);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sales', authenticateToken, async (req, res) => {
  try {
    const sales = await getSales();
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 7. CONFIGURACIÓN DE PRECIOS (MÓDULO 5) ---
router.put('/prices', authenticateToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { referencia, nuevoPrecioVenta } = req.body;
    if (!referencia || nuevoPrecioVenta === undefined) {
      return res.status(400).json({ error: 'Referencia y nuevo precio de venta obligatorios.' });
    }
    const result = await updateProductPrice(referencia, nuevoPrecioVenta, req.user.username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/prices/history', authenticateToken, async (req, res) => {
  try {
    const history = await readTable('PreciosHistorial');
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 8. ESTADÍSTICAS DEL DASHBOARD ---
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
