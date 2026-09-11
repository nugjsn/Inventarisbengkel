import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import ToolCard from '../components/ToolCard';
import { useAuth } from '../context/AuthContext';
import { Search, Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const SkeletonCard = () => (
    <div className="skeleton-card">
        <div className="skeleton-image" />
        <div className="skeleton-body">
            <div className="skeleton-line short" />
            <div className="skeleton-line long" />
            <div className="skeleton-line medium" />
        </div>
    </div>
);

const Dashboard = () => {
    const { tools, loading } = useInventory();
    const { getJurusan, isAdmin } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const userJurusan = getJurusan();

    const [selectedJurusan, setSelectedJurusan] = useState(isAdmin ? 'All' : (userJurusan || 'All'));

    const jurusans = [
        { id: 'All', label: 'Semua' },
        { id: 'TKR', label: 'TKR' },
        { id: 'TSM', label: 'TSM' },
        { id: 'Mesin', label: 'Teknik Mesin' },
        { id: 'Elind', label: 'Elind' },
        { id: 'Listrik', label: 'Listrik' },
        { id: 'Akuntansi', label: 'Akuntansi' },
        { id: 'Perhotelan', label: 'Perhotelan' },
        { id: 'TKI', label: 'TKI' }
    ];

    // Compute stats from visible tools (respecting user jurusan)
    const visibleTools = isAdmin
        ? (selectedJurusan === 'All' ? tools : tools.filter(t => t.jurusan === selectedJurusan))
        : tools.filter(t => t.jurusan === userJurusan);

    const stats = {
        total: visibleTools.length,
        available: visibleTools.filter(t => t.status !== 'In Use' && t.condition !== 'Broken').length,
        inUse: visibleTools.filter(t => t.status === 'In Use').length,
        maintenance: visibleTools.filter(t => t.condition === 'Broken').length,
    };

    const filteredTools = visibleTools.filter(tool => {
        const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.category.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    return (
        <div>
            {/* Dashboard Header */}
            <div className="dashboard-top">
                <div className="dashboard-header">
                    <h1>Workshop Inventory</h1>
                    <p>Manage your tools and equipment</p>
                </div>

                <div className="search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search tools..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-total">
                        <Wrench size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-number">{stats.total}</span>
                        <span className="stat-label">Total Alat</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-available">
                        <CheckCircle size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-number">{stats.available}</span>
                        <span className="stat-label">Tersedia</span>
                    </div>
                </div>
                <Link
                    to="/borrowed"
                    className="stat-card"
                    style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                    title="Buka Dashboard Khusus Alat Dipinjam & Laporan Export"
                >
                    <div className="stat-icon stat-icon-inuse">
                        <Clock size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-number">{stats.inUse}</span>
                        <span className="stat-label">Digunakan ↗</span>
                    </div>
                </Link>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-maintenance">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-number">{stats.maintenance}</span>
                        <span className="stat-label">Maintenance</span>
                    </div>
                </div>
            </div>

            {/* Department Filter */}
            {isAdmin && (
                <div className="dept-nav-container" style={{ position: 'relative', marginBottom: '24px' }}>
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

            {/* Tool Grid */}
            <div className="grid-layout">
                {loading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : filteredTools.length > 0 ? (
                    filteredTools.map((tool, index) => (
                        <ToolCard key={tool.id} tool={tool} index={index} />
                    ))
                ) : (
                    <div className="text-muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px' }}>
                        <Wrench size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.3 }} />
                        <p style={{ fontSize: '1rem' }}>No tools found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
