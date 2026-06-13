import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Upload, X, Loader2, Barcode as BarcodeIcon, FileText } from 'lucide-react';
import JsBarcode from 'jsbarcode';

/**
 * Componente para renderizar Código de Barras Code39
 */
function ProductBarcode({ value, name }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          lineColor: '#000',
          width: 1.8,
          height: 45,
          displayValue: true,
          fontSize: 12
        });
      } catch (error) {
        console.error('Error al generar código de barras:', error);
      }
    }
  }, [value]);

  const handlePrint = (e) => {
    e.stopPropagation();
    if (!svgRef.current || !value) return;

    const barcodeHtml = svgRef.current.outerHTML;
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert('Por favor, permita las ventanas emergentes (popups) para poder imprimir el código de barras.');
      return;
    }

    const doc = printWindow.document;
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Código - ${value}</title>
          <style>
            @page {
              size: 100mm 148mm portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              width: 100mm;
              height: 148mm;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #ffffff;
              overflow: hidden;
            }
            .barcode-container {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }
            .barcode-container svg {
              width: 85mm !important;
              height: auto !important;
              max-height: 130mm;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${barcodeHtml}
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 300);
            });
          <\/script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div 
      className="barcode-box clickable-barcode" 
      onClick={handlePrint}
      title="Haga clic para imprimir este código de barras"
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <svg ref={svgRef} className="barcode-svg"></svg>
      <span style={{
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        marginTop: '0.25rem',
        display: 'block'
      }}>
        🖨️ Clic para imprimir
      </span>
    </div>
  );
}

/**
 * Módulo 3: Catálogo de Productos
 */
export default function Catalog({ token, showToast }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [referencia, setReferencia] = useState('');
  const [nombre, setNombre] = useState('');
  const [caracteristicas, setCaracteristicas] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cargar productos.');
      setProducts(data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setReferencia('');
    setNombre('');
    setCaracteristicas('');
    setFotoUrl('');
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setReferencia(product.Referencia);
    setNombre(product.Nombre);
    setCaracteristicas(product.Caracteristicas || '');
    setFotoUrl(product.FotoUrl);
    setModalOpen(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, seleccione un archivo de imagen válido.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const response = await fetch('/api/upload?folder=productos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al subir imagen.');
      setFotoUrl(data.url);
      showToast('Foto de producto subida correctamente a Cloudinary.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!referencia.trim() || !nombre.trim()) {
      showToast('La Referencia y Nombre de producto son obligatorios.', 'warning');
      return;
    }
    
    // Validar foto obligatoria
    if (!fotoUrl) {
      showToast('La foto del producto es obligatoria en el catálogo.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.IdProducto}` 
        : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ referencia, nombre, caracteristicas, fotoUrl })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar producto.');

      showToast(
        editingProduct ? 'Producto actualizado con éxito.' : 'Producto creado con éxito.',
        'success'
      );
      setModalOpen(false);
      fetchProducts();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.Nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.Referencia.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Catálogo de Productos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Administrar especificaciones y códigos de barras de productos</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      <div className="card">
        {/* Buscador */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por referencia o nombre..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Listado */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Cargando catálogo...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No se encontraron productos en el catálogo.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Referencia</th>
                  <th>Código de Barras</th>
                  <th>Nombre</th>
                  <th>Características</th>
                  <th>Costo</th>
                  <th>Precio Venta</th>
                  <th>Stock</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.IdProducto}>
                    <td>
                      <img 
                        src={p.FotoUrl} 
                        alt={p.Nombre} 
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} 
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.Referencia}</td>
                    <td>
                      <ProductBarcode value={p.Referencia} name={p.Nombre} />
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.Nombre}</td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.Caracteristicas || '-'}
                    </td>
                    <td>{formatCurrency(p.PrecioCompra)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(p.PrecioVenta)}</td>
                    <td>
                      <span className={`stock-alert-badge ${p.StockActual <= 5 ? 'low' : 'ok'}`}>
                        {p.StockActual} ud.
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-icon-only" onClick={() => openEditModal(p)}>
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Crear / Editar */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingProduct ? `Editar Producto: ${editingProduct.Referencia}` : 'Registrar Nuevo Producto'}</h3>
              <button className="btn-secondary btn-icon-only" onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div className="form-group">
                  <label className="required">Referencia (Única)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: CALZ-092-B"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value.toUpperCase())}
                    required
                    disabled={!!editingProduct} // La referencia no se edita para evitar romper integridad de movimientos
                  />
                </div>

                {referencia && (
                  <div className="form-group">
                    <label>Código de Barras Previsualizado (CODE128)</label>
                    <ProductBarcode value={referencia} name={nombre || 'Previsualización'} />
                  </div>
                )}

                <div className="form-group">
                  <label className="required">Nombre del Producto</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Calzado Deportivo Running Azul"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Características (Opcional)</label>
                  <textarea 
                    placeholder="Detalles, color, talla, material..."
                    value={caracteristicas}
                    onChange={(e) => setCaracteristicas(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Subida de Foto */}
                <div className="upload-container">
                  <label className="required">Foto del Producto</label>
                  {fotoUrl ? (
                    <div className="upload-preview-container" style={{ width: '150px', height: '150px' }}>
                      <img src={fotoUrl} alt="Preview" className="upload-preview" />
                      <button type="button" className="upload-remove-btn" onClick={() => setFotoUrl('')}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="upload-dropzone">
                      {uploading ? (
                        <>
                          <Loader2 className="spinner" size={24} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Subiendo imagen...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                          <span>Haz clic para subir foto del producto</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Formatos permitidos: PNG, JPG, JPEG</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        style={{ display: 'none' }}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving || uploading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                  {saving ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
