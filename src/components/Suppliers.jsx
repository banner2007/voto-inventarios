import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Phone, MapPin, Upload, X, Loader2 } from 'lucide-react';

/**
 * Módulo 1: Gestión de Proveedores
 */
export default function Suppliers({ token, showToast }) {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cargar proveedores.');
      setSuppliers(data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setNombre('');
    setTelefono('');
    setDireccion('');
    setLogoUrl('');
    setModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setNombre(supplier.Nombre);
    setTelefono(supplier.Telefono);
    setDireccion(supplier.Direccion);
    setLogoUrl(supplier.LogoUrl || '');
    setModalOpen(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, seleccione un archivo de imagen válido.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const response = await fetch('/api/upload?folder=proveedores', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al subir imagen.');
      setLogoUrl(data.url);
      showToast('Logotipo subido correctamente a Cloudinary.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim() || !direccion.trim()) {
      showToast('Los campos Nombre, Teléfono y Dirección son obligatorios.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const url = editingSupplier 
        ? `/api/suppliers/${editingSupplier.IdProveedor}` 
        : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, telefono, direccion, logoUrl })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar proveedor.');

      showToast(
        editingSupplier ? 'Proveedor actualizado con éxito.' : 'Proveedor creado con éxito.',
        'success'
      );
      setModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.Nombre.toLowerCase().includes(search.toLowerCase()) ||
    s.Telefono.toLowerCase().includes(search.toLowerCase()) ||
    s.Direccion.toLowerCase().includes(search.toLowerCase()) ||
    s.IdProveedor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Gestión de Proveedores</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Visualizar, agregar y modificar proveedores</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          <span>Agregar Proveedor</span>
        </button>
      </div>

      <div className="card">
        {/* Barra de búsquedas */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por ID, nombre, teléfono o dirección..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Listado */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Cargando proveedores...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No se encontraron proveedores que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>ID Proveedor</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((s) => (
                  <tr key={s.IdProveedor}>
                    <td>
                      {s.LogoUrl ? (
                        <img 
                          src={s.LogoUrl} 
                          alt={s.Nombre} 
                          style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: '#fdfdfd' }} 
                        />
                      ) : (
                        <div 
                          style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}
                        >
                          N/A
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.IdProveedor}</td>
                    <td style={{ fontWeight: 500 }}>{s.Nombre}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                        <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{s.Telefono}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{s.Direccion}</span>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-icon-only" onClick={() => openEditModal(s)}>
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
              <h3>{editingSupplier ? `Editar Proveedor: ${editingSupplier.IdProveedor}` : 'Nuevo Proveedor'}</h3>
              <button className="btn-secondary btn-icon-only" onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>ID Proveedor</label>
                  <input 
                    type="text" 
                    value={editingSupplier ? editingSupplier.IdProveedor : 'Generado automáticamente'} 
                    disabled 
                    readOnly
                  />
                </div>
                
                <div className="form-group">
                  <label className="required">Nombre</label>
                  <input 
                    type="text" 
                    placeholder="Nombre del proveedor"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="required">Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="Número telefónico"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="required">Dirección</label>
                  <input 
                    type="text" 
                    placeholder="Dirección física"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    required
                  />
                </div>

                {/* Subida de Logotipo */}
                <div className="upload-container">
                  <label>Logotipo (Opcional)</label>
                  {logoUrl ? (
                    <div className="upload-preview-container">
                      <img src={logoUrl} alt="Preview" className="upload-preview" />
                      <button type="button" className="upload-remove-btn" onClick={() => setLogoUrl('')}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="upload-dropzone">
                      {uploading ? (
                        <>
                          <Loader2 className="spinner" size={24} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Subiendo a Cloudinary...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                          <span>Haz clic para subir logotipo</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Formatos permitidos: PNG, JPG, JPEG</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
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
                  {saving ? 'Guardando...' : 'Guardar Proveedor'}
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
