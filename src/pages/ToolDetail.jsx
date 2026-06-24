import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { ArrowLeft, Printer, Trash2, QrCode, Edit, Download, Wrench, History, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const ToolDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const isScanView = query.get('view') === 'scan';

    const { getToolById, deleteTool, borrowTool, returnTool, getBorrowHistory, loading, fetchToolWithImage } = useInventory();
    const globalTool = getToolById(id);
    const [toolImage, setToolImage] = useState(null);
    const [fetchingImage, setFetchingImage] = useState(false);

    useEffect(() => {
        if (id) {
            setFetchingImage(true);
            fetchToolWithImage(id).then(data => {
                if (data && data.image) setToolImage(data.image);
                setFetchingImage(false);
            });
        }
    }, [id, fetchToolWithImage]);

    const tool = globalTool ? { ...globalTool, image: toolImage || globalTool.image } : null;
    const [showQR, setShowQR] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Borrow Modal State
    const [showBorrowModal, setShowBorrowModal] = useState(false);
    const [borrowerData, setBorrowerData] = useState({ name: '', unit: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const qrRef = useRef();
    const { getJurusan, isAdmin } = useAuth();
    const userJurusan = getJurusan();

    useEffect(() => {
        if (tool) {
            fetchHistory();
        }
    }, [id]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        const data = await getBorrowHistory(id);
        setHistory(data);
        setLoadingHistory(false);
    };

    // Security: Only owner or admin can edit/delete
    const canManage = isAdmin || (tool?.jurusan === userJurusan);

    if (loading || (globalTool && fetchingImage && !toolImage)) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', flexDirection: 'column' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Memuat data alat...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!tool) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', flexDirection: 'column', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--text-primary)' }}>Alat tidak ditemukan</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Alat mungkin telah dihapus atau ID tidak valid.</p>
                <button onClick={() => navigate('/')} className="btn btn-outline">
                    <ArrowLeft size={16} /> Kembali ke Dashboard
                </button>
            </div>
        );
    }

    const qrUrl = window.location.origin + `/tool/${id}?view=scan`;

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this tool?')) {
            await deleteTool(id);
            navigate('/');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleBorrow = async (e) => {
        e.preventDefault();
        if (!borrowerData.name || !borrowerData.unit) return;

        setIsSubmitting(true);
        const result = await borrowTool(id, borrowerData);
        if (result.success) {
            setShowBorrowModal(false);
            setBorrowerData({ name: '', unit: '' });
            fetchHistory();
        } else {
            alert('Gagal meminjam alat. Silakan coba lagi.');
        }
        setIsSubmitting(false);
    };

    const handleReturn = async () => {
        if (!window.confirm('Konfirmasi pengembalian alat ini?')) return;

        setIsSubmitting(true);
        const result = await returnTool(id);
        if (result.success) {
            fetchHistory();
        } else {
            alert('Gagal mengembalikan alat. Silakan coba lagi.');
        }
        setIsSubmitting(false);
    };

    // Current borrower info
    const currentBorrow = history.find(h => h.status === 'borrowed');

    // --- SCAN / PDF VIEW ---
    if (isScanView) {
        const getStatusLabel = () => {
            if (tool.condition === 'Broken') return { text: 'MAINTENANCE', cls: 'scan-badge-danger' };
            if (tool.status === 'In Use') return { text: 'IN USE', cls: 'scan-badge-warning' };
            return { text: 'AVAILABLE', cls: 'scan-badge-success' };
        };
        const statusInfo = getStatusLabel();

        return (
            <div className="layout scan-pdf-container">
                <div className="scan-pdf-card">
                    {/* HEADER: Tool name + subtitle + badge */}
                    <header className="scan-header-v2">
                        <div className="scan-header-text">
                            <h1>{tool.name}</h1>
                            <p>Jurusan: {tool.jurusan} | Kategori: {tool.category}</p>
                        </div>
                        <span className={`scan-status-badge ${statusInfo.cls}`}>{statusInfo.text}</span>
                    </header>

                    {/* IMAGE */}
                    {tool.image && (
                        <div className="scan-image-wrapper">
                            <img src={tool.image} alt={tool.name} />
                        </div>
                    )}

                    {/* SPESIFIKASI ALAT */}
                    <div className="scan-section">
                        <h2 className="scan-section-title">📋 Spesifikasi Alat</h2>
                        <table className="scan-spec-table">
                            <tbody>
                                <tr><td className="scan-spec-label">Nama Alat</td><td>{tool.name}</td></tr>
                                {tool.code && <tr><td className="scan-spec-label">Kode Alat</td><td>{tool.code}</td></tr>}
                                <tr><td className="scan-spec-label">Kategori</td><td>{tool.category}</td></tr>
                                <tr><td className="scan-spec-label">Jurusan</td><td>{tool.jurusan}</td></tr>
                                <tr><td className="scan-spec-label">Kondisi</td><td>{tool.condition}</td></tr>
                                <tr><td className="scan-spec-label">Status</td><td>{tool.status}</td></tr>
                                <tr><td className="scan-spec-label">Tahun Pembelian</td><td>{tool.purchaseYear || (tool.purchaseDate ? tool.purchaseDate.substring(0, 4) : '-')}</td></tr>
                                <tr><td className="scan-spec-label">Deskripsi</td><td>{tool.description || '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {/* SOP */}
                    {tool.sop && tool.sop.length > 0 && (
                        <div className="scan-section">
                            <h2 className="scan-section-title">📖 SOP - Langkah Penggunaan</h2>
                            <div className="scan-sop-list">
                                {tool.sop.map((step, idx) => (
                                    <div key={idx} className="scan-sop-item">
                                        <span className="scan-sop-number">{idx + 1}</span>
                                        <p>{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* FOOTER */}
                    <footer className="scan-footer-v2">
                        <p>Dokumen ini di-generate otomatis oleh sistem BengkelQR</p>
                    </footer>
                </div>

                {/* DOWNLOAD BUTTON */}
                <div className="no-print" style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '40px' }}>
                    <button onClick={handlePrint} className="btn btn-primary scan-download-btn">
                        <Download size={18} /> Download / Print PDF
                    </button>
                </div>
            </div>
        );
    }

    // --- NORMAL VIEW ---
    return (
        <div className={`detail-container ${showQR ? 'has-qr' : ''}`}>
            <div className={`detail-main ${showQR ? 'no-print' : ''}`}>
                <div className="minimal-info">
                    <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {tool.image && (
                            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', maxWidth: '350px', flex: '1 1 300px' }}>
                                <img src={tool.image} alt={tool.name} style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }} />
                            </div>
                        )}

                        <div style={{ flex: '2 1 300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h1 className="minimal-title" style={{ margin: 0 }}>{tool.name}</h1>
                                <span className={`status-badge ${tool.status.toLowerCase().replace(' ', '-')}`}>
                                    {tool.status === 'In Use' ? <History size={14} /> : <CheckCircle size={14} />}
                                    {tool.status}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                                <div className="minimal-field">
                                    <label>Jurusan</label>
                                    <p className="minimal-value">{tool.jurusan}</p>
                                </div>
                                <div className="minimal-field">
                                    <label>Category</label>
                                    <p className="minimal-value">{tool.category}</p>
                                </div>
                                {tool.code && (
                                    <div className="minimal-field">
                                        <label>Kode Alat</label>
                                        <p className="minimal-value">{tool.code}</p>
                                    </div>
                                )}
                                <div className="minimal-field">
                                    <label>Condition</label>
                                    <p className="minimal-value">{tool.condition}</p>
                                </div>
                                <div className="minimal-field">
                                    <label>Tahun Pembelian</label>
                                    <p className="minimal-value">{tool.purchaseYear || (tool.purchaseDate ? tool.purchaseDate.substring(0, 4) : '-')}</p>
                                </div>
                            </div>

                            {/* CURRENT BORROWER STATUS */}
                            {tool.status === 'In Use' && currentBorrow && (
                                <div className="card" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)', marginBottom: '20px', padding: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b', marginBottom: '8px', fontWeight: 'bold' }}>
                                        <AlertCircle size={18} />
                                        Sedang Dipinjam
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Peminjam</label>
                                            <span style={{ fontWeight: '500' }}>{currentBorrow.borrower_name}</span>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Kelas/Unit</label>
                                            <span style={{ fontWeight: '500' }}>{currentBorrow.borrower_unit}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ACTION BUTTONS (Borrow/Return) */}
                            {canManage && (
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                                    {tool.status === 'Available' ? (
                                        <button onClick={() => setShowBorrowModal(true)} className="btn btn-primary" style={{ flex: 1 }}>
                                            <Wrench size={18} /> Pinjam Alat
                                        </button>
                                    ) : tool.status === 'In Use' ? (
                                        <button onClick={handleReturn} className="btn btn-primary" style={{ flex: 1, background: '#10b981' }}>
                                            <CheckCircle size={18} /> Kembalikan Alat
                                        </button>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="minimal-field">
                        <label>Description</label>
                        <p className="minimal-value" style={{ fontWeight: '400', lineHeight: '1.6' }}>
                            {tool.description || 'No description provided.'}
                        </p>
                    </div>

                    {tool.sop && tool.sop.length > 0 && (
                        <div className="minimal-field" style={{ marginTop: '20px' }}>
                            <label>SOP Penggunaan</label>
                            <ol style={{ paddingLeft: '20px', marginTop: '10px', color: 'var(--text-primary)' }}>
                                {tool.sop.map((step, idx) => (
                                    <li key={idx} style={{ marginBottom: '8px' }}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* BORROW HISTORY SECTION */}
                    <div style={{ marginTop: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <History size={20} className="text-muted" />
                            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Riwayat Peminjaman</h2>
                        </div>

                        <div className="table-responsive">
                            <table className="card" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '600px', padding: 0, overflow: 'hidden' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <tr>
                                        <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>Peminjam</th>
                                        <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>Pinjam</th>
                                        <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>Kembali</th>
                                        <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingHistory ? (
                                        <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat riwayat...</td></tr>
                                    ) : history.length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada riwayat peminjaman.</td></tr>
                                    ) : (
                                        history.slice(0, 5).map((log) => (
                                            <tr key={log.id}>
                                                <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                                                    <div style={{ fontWeight: '500' }}>{log.borrower_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.borrower_unit}</div>
                                                </td>
                                                <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Clock size={12} className="text-muted" />
                                                        {new Date(log.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                                                    {log.return_date ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <Clock size={12} className="text-muted" />
                                                            {new Date(log.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                                                    <span className={`jurusan-chip ${log.status === 'borrowed' ? 'status-in-use' : 'status-available'}`} style={{ fontSize: '0.7rem' }}>
                                                        {log.status === 'borrowed' ? 'Masih Dipinjam' : 'Dikembalikan'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {!isScanView && (
                    <div className="no-print mt-4" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingTop: '30px', borderTop: '1px solid var(--border)', marginTop: '40px' }}>
                        <button onClick={() => navigate('/')} className="btn btn-outline">
                            <ArrowLeft size={16} /> Dashboard
                        </button>

                        {canManage && (
                            <>
                                <button onClick={() => navigate(`/edit/${tool.id}`)} className="btn btn-outline">
                                    <Edit size={16} /> Edit Tool
                                </button>
                                {!showQR && (
                                    <button onClick={() => setShowQR(true)} className="btn btn-outline">
                                        <QrCode size={16} /> Manage QR
                                    </button>
                                )}
                                <button onClick={handleDelete} className="btn btn-outline" style={{ color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}>
                                    <Trash2 size={16} /> Delete
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* QR Section */}
            {(showQR) && (
                <div className="qr-section no-print">
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div className="no-print" style={{ width: '100%', textAlign: 'right', marginBottom: '10px' }}>
                            <button onClick={() => setShowQR(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Close</button>
                        </div>
                        <h3 className="text-xl no-print">QR Code Label</h3>
                        <div className="printable-qr-label" ref={qrRef}>
                            <div className="qr-printable-content">
                                <QRCodeCanvas value={qrUrl} size={180} />
                                <div className="qr-tool-name">
                                    {tool.name}
                                </div>
                            </div>
                        </div>
                        <div className="no-print" style={{ marginTop: '20px', width: '100%' }}>
                            <button onClick={handlePrint} className="btn btn-primary" style={{ width: '100%' }}>
                                <Printer size={18} /> Print QR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BORROW MODAL */}
            {showBorrowModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div className="card modal-content" style={{ width: '90%', maxWidth: '400px', animation: 'fadeInUp 0.3s ease-out' }}>
                        <h2 className="text-xl" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Wrench size={24} className="text-accent" />
                            Form Peminjaman
                        </h2>
                        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
                            Silakan isi data peminjam untuk alat <strong>{tool.name}</strong>.
                        </p>

                        <form onSubmit={handleBorrow}>
                            <div className="form-group">
                                <label>Nama Peminjam</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nama Lengkap"
                                        style={{ paddingLeft: '40px' }}
                                        value={borrowerData.name}
                                        onChange={e => setBorrowerData({ ...borrowerData, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Unit / Kelas</label>
                                <div style={{ position: 'relative' }}>
                                    <History size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: XI TKR 1 / Bengkel"
                                        style={{ paddingLeft: '40px' }}
                                        value={borrowerData.unit}
                                        onChange={e => setBorrowerData({ ...borrowerData, unit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                                <button type="button" onClick={() => setShowBorrowModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={isSubmitting}>
                                    {isSubmitting ? 'Memproses...' : 'Konfirmasi Pinjam'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolDetail;

