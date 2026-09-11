import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import {
    Download,
    Calendar,
    Clock,
    CheckCircle,
    ClipboardList,
    Search,
    RotateCcw,
    ExternalLink,
    Filter,
    CalendarDays,
    CalendarCheck
} from 'lucide-react';

const BorrowedTools = () => {
    const { getAllBorrowHistory, returnTool } = useInventory();
    const { getJurusan, isAdmin } = useAuth();
    const userJurusan = getJurusan();

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState('all'); // all, today, week, month
    const [statusFilter, setStatusFilter] = useState('all'); // all, borrowed, returned
    const [selectedJurusan, setSelectedJurusan] = useState(isAdmin ? 'All' : (userJurusan || 'All'));
    const [returningId, setReturningId] = useState(null);

    const jurusans = [
        { id: 'All', label: 'Semua Jurusan' },
        { id: 'TKR', label: 'TKR' },
        { id: 'TSM', label: 'TSM' },
        { id: 'Mesin', label: 'Teknik Mesin' },
        { id: 'Elind', label: 'Elind' },
        { id: 'Listrik', label: 'Listrik' },
        { id: 'Akuntansi', label: 'Akuntansi' },
        { id: 'Perhotelan', label: 'Perhotelan' },
        { id: 'TKI', label: 'TKI' }
    ];

    const loadHistory = async () => {
        setLoading(true);
        const data = await getAllBorrowHistory();
        setHistory(data || []);
        setLoading(false);
    };

    useEffect(() => {
        loadHistory();
    }, []);

    // Filter by Jurusan
    const jurusanFiltered = useMemo(() => {
        if (isAdmin) {
            return selectedJurusan === 'All'
                ? history
                : history.filter(item => item.tools?.jurusan === selectedJurusan);
        }
        return history.filter(item => item.tools?.jurusan === userJurusan);
    }, [history, isAdmin, selectedJurusan, userJurusan]);

    // Compute stats for current visible jurusan
    const stats = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);

        const activeBorrowed = jurusanFiltered.filter(item => item.status === 'borrowed').length;
        const total = jurusanFiltered.length;
        const todayCount = jurusanFiltered.filter(item => {
            const bDate = new Date(item.borrow_date).getTime();
            return bDate >= startOfToday;
        }).length;
        const weekCount = jurusanFiltered.filter(item => {
            const bDate = new Date(item.borrow_date).getTime();
            return bDate >= oneWeekAgo;
        }).length;

        return { activeBorrowed, total, todayCount, weekCount };
    }, [jurusanFiltered]);

    // Apply Time, Status, and Search Filters
    const filteredData = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);

        return jurusanFiltered.filter(item => {
            // Status filter
            if (statusFilter !== 'all' && item.status !== statusFilter) {
                return false;
            }

            // Time filter
            if (timeFilter !== 'all') {
                const bDate = new Date(item.borrow_date);
                if (timeFilter === 'today') {
                    if (bDate.getTime() < startOfToday) return false;
                } else if (timeFilter === 'week') {
                    if (bDate.getTime() < oneWeekAgo) return false;
                } else if (timeFilter === 'month') {
                    if (bDate.getMonth() !== now.getMonth() || bDate.getFullYear() !== now.getFullYear()) {
                        return false;
                    }
                }
            }

            // Search filter
            if (searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase();
                const toolName = item.tools?.name?.toLowerCase() || '';
                const toolCode = item.tools?.code?.toLowerCase() || '';
                const borrowerName = item.borrower_name?.toLowerCase() || '';
                const borrowerUnit = item.borrower_unit?.toLowerCase() || '';

                if (
                    !toolName.includes(term) &&
                    !toolCode.includes(term) &&
                    !borrowerName.includes(term) &&
                    !borrowerUnit.includes(term)
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [jurusanFiltered, statusFilter, timeFilter, searchTerm]);

    // Direct Return action
    const handleReturn = async (item) => {
        if (!window.confirm(`Konfirmasi pengembalian alat "${item.tools?.name || 'Alat'}" oleh ${item.borrower_name}?`)) {
            return;
        }

        setReturningId(item.id);
        const res = await returnTool(item.tool_id);
        if (res.success) {
            await loadHistory();
        } else {
            alert('Gagal mengembalikan alat. Silakan coba lagi.');
        }
        setReturningId(null);
    };

    // Export to Excel (CSV Format with UTF-8 BOM)
    const exportToExcel = () => {
        if (filteredData.length === 0) {
            alert('Tidak ada data yang sesuai untuk di-export.');
            return;
        }

        const headers = [
            'ID',
            'Tanggal Pinjam',
            'Jam Pinjam',
            'Tanggal Kembali',
            'Jam Kembali',
            'Nama Alat',
            'Kode Alat',
            'Jurusan',
            'Kategori',
            'Nama Peminjam',
            'Kelas / Unit',
            'Status Peminjaman'
        ];

        const rows = filteredData.map((item, idx) => {
            const bDateObj = new Date(item.borrow_date);
            const bDate = bDateObj.toLocaleDateString('id-ID');
            const bTime = bDateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            let rDate = '-';
            let rTime = '-';
            if (item.return_date) {
                const rDateObj = new Date(item.return_date);
                rDate = rDateObj.toLocaleDateString('id-ID');
                rTime = rDateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            }

            const toolName = item.tools?.name || 'Alat Telah Dihapus';
            const toolCode = item.tools?.code || '-';
            const jurusan = item.tools?.jurusan || '-';
            const category = item.tools?.category || '-';
            const borrowerName = item.borrower_name || '-';
            const borrowerUnit = item.borrower_unit || '-';
            const statusLabel = item.status === 'borrowed' ? 'Sedang Dipinjam' : 'Sudah Dikembalikan';

            const clean = (val) => `"${String(val).replace(/"/g, '""')}"`;

            return [
                idx + 1,
                clean(bDate),
                clean(bTime),
                clean(rDate),
                clean(rTime),
                clean(toolName),
                clean(toolCode),
                clean(jurusan),
                clean(category),
                clean(borrowerName),
                clean(borrowerUnit),
                clean(statusLabel)
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const filterName = timeFilter === 'today' ? 'Hari_Ini' : timeFilter === 'week' ? 'Minggu_Ini' : timeFilter === 'month' ? 'Bulan_Ini' : 'Semua';
        const targetDept = isAdmin ? selectedJurusan : (userJurusan || 'Admin');
        const fileName = `Data_Peminjaman_${targetDept}_${filterName}_${new Date().toISOString().slice(0, 10)}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="dashboard-container" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            {/* Header & Title */}
            <div className="dashboard-top">
                <div className="dashboard-header">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ClipboardList size={28} style={{ color: 'var(--primary)' }} />
                        Dashboard Peminjaman Alat
                    </h1>
                    <p>
                        Monitoring alat yang dipinjam & laporan peminjaman jurusan{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>
                            {isAdmin ? (selectedJurusan === 'All' ? 'Semua Jurusan' : selectedJurusan) : userJurusan}
                        </strong>
                    </p>
                </div>

                {/* Search Bar */}
                <div className="search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Cari peminjam, kelas, nama/kode alat..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-inuse">
                        <Clock size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-number">{stats.activeBorrowed}</span>
                        <span className="stat-label">Sedang Dipinjam</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-available">
                        <CalendarCheck size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-number">{stats.todayCount}</span>
                        <span className="stat-label">Pinjam Hari Ini</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-maintenance">
                        <CalendarDays size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-number">{stats.weekCount}</span>
                        <span className="stat-label">Pinjam Minggu Ini</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-total">
                        <ClipboardList size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-number">{stats.total}</span>
                        <span className="stat-label">Total Riwayat</span>
                    </div>
                </div>
            </div>

            {/* Department Filter for Admin */}
            {isAdmin && (
                <div className="dept-nav-container" style={{ position: 'relative', marginBottom: '20px' }}>
                    <div className="dept-nav">
                        {jurusans.map(j => (
                            <button
                                key={j.id}
                                className={`dept-chip ${selectedJurusan === j.id ? 'active' : ''}`}
                                onClick={() => setSelectedJurusan(j.id)}
                            >
                                {j.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter Controls & Export Bar */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '12px 18px',
                    backdropFilter: 'blur(16px)'
                }}
            >
                {/* Time & Status Filter Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                    {/* Time Filter Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} /> Waktu:
                        </span>
                        {[
                            { id: 'all', label: 'Semua' },
                            { id: 'today', label: 'Hari Ini' },
                            { id: 'week', label: 'Minggu Ini' },
                            { id: 'month', label: 'Bulan Ini' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTimeFilter(t.id)}
                                style={{
                                    fontSize: '0.8rem',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    border: '1px solid',
                                    borderColor: timeFilter === t.id ? 'var(--primary)' : 'var(--border)',
                                    background: timeFilter === t.id ? 'var(--primary)' : 'transparent',
                                    color: timeFilter === t.id ? '#ffffff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: timeFilter === t.id ? '600' : '400',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

                    {/* Status Filter Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Filter size={14} /> Status:
                        </span>
                        {[
                            { id: 'all', label: 'Semua' },
                            { id: 'borrowed', label: 'Dipinjam' },
                            { id: 'returned', label: 'Selesai' }
                        ].map(s => (
                            <button
                                key={s.id}
                                onClick={() => setStatusFilter(s.id)}
                                style={{
                                    fontSize: '0.8rem',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    border: '1px solid',
                                    borderColor: statusFilter === s.id ? 'var(--primary)' : 'var(--border)',
                                    background: statusFilter === s.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    color: statusFilter === s.id ? 'var(--primary-hover)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: statusFilter === s.id ? '600' : '400',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Export Button */}
                <button
                    onClick={exportToExcel}
                    className="btn btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        fontSize: '0.85rem'
                    }}
                    title="Export data saat ini ke Excel (CSV)"
                >
                    <Download size={16} />
                    <span>Export Excel ({filteredData.length})</span>
                </button>
            </div>

            {/* Table Container */}
            <div
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    backdropFilter: 'blur(16px)'
                }}
            >
                <div style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Clock size={36} className="animate-spin" style={{ marginBottom: '12px', opacity: 0.5 }} />
                            <p>Memuat data peminjaman...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <ClipboardList size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                Tidak ada data peminjaman
                            </p>
                            <span style={{ fontSize: '0.85rem' }}>
                                Coba ubah filter waktu, status, atau kata kunci pencarian.
                            </span>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
                            <thead>
                                <tr
                                    style={{
                                        borderBottom: '1px solid var(--border)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.8rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    <th style={{ padding: '16px 20px' }}>Waktu Pinjam</th>
                                    <th style={{ padding: '16px 20px' }}>Nama Alat</th>
                                    <th style={{ padding: '16px 20px' }}>Peminjam & Unit</th>
                                    <th style={{ padding: '16px 20px' }}>Jurusan</th>
                                    <th style={{ padding: '16px 20px' }}>Status</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, idx) => {
                                    const bDate = new Date(item.borrow_date);
                                    const rDate = item.return_date ? new Date(item.return_date) : null;
                                    const isCurrentlyBorrowed = item.status === 'borrowed';

                                    return (
                                        <tr
                                            key={item.id}
                                            style={{
                                                borderBottom: idx === filteredData.length - 1 ? 'none' : '1px solid var(--border)',
                                                transition: 'background 0.2s',
                                                backgroundColor: isCurrentlyBorrowed ? 'rgba(255, 165, 0, 0.02)' : 'transparent'
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isCurrentlyBorrowed ? 'rgba(255, 165, 0, 0.02)' : 'transparent')}
                                        >
                                            {/* Date & Time */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                    {bDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                    {bDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                                </div>
                                                {rDate && (
                                                    <div style={{ color: 'var(--accent-success)', fontSize: '0.75rem', marginTop: '4px' }}>
                                                        Kembali: {rDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ({rDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                                                    </div>
                                                )}
                                            </td>

                                            {/* Tool Info */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                                        {item.tools?.name || 'Alat Dihapus'}
                                                    </span>
                                                    <Link
                                                        to={`/tool/${item.tool_id}`}
                                                        title="Buka Detail Alat"
                                                        style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        <ExternalLink size={14} />
                                                    </Link>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    Kode: {item.tools?.code || `#${item.tool_id?.substring(0, 8)}`} • {item.tools?.category || '-'}
                                                </div>
                                            </td>

                                            {/* Borrower Info */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                                    {item.borrower_name}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {item.borrower_unit || '-'}
                                                </div>
                                            </td>

                                            {/* Jurusan */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <span className={`jurusan-chip jurusan-chip-${item.tools?.jurusan || 'default'}`}>
                                                    {item.tools?.jurusan || '-'}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '16px 20px' }}>
                                                {isCurrentlyBorrowed ? (
                                                    <span className="badge badge-damaged">
                                                        Dipinjam
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-good">
                                                        Dikembalikan
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                {isCurrentlyBorrowed ? (
                                                    <button
                                                        onClick={() => handleReturn(item)}
                                                        disabled={returningId === item.id}
                                                        className="btn btn-outline"
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '0.8rem',
                                                            color: 'var(--accent-warning)',
                                                            borderColor: 'rgba(255, 165, 0, 0.3)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                        title="Kembalikan alat sekarang"
                                                    >
                                                        <RotateCcw size={14} />
                                                        <span>{returningId === item.id ? 'Memproses...' : 'Kembalikan'}</span>
                                                    </button>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                        Selesai
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BorrowedTools;
