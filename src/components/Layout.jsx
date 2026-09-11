import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Wrench, PlusCircle, LogOut, LayoutDashboard, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, getJurusan, isAdmin } = useAuth();
    const jurusan = getJurusan();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <Link to="/" className="nav-brand">
                <Wrench size={22} />
                <span className="nav-link-text">BengkelQR</span>
            </Link>
            <div className="nav-links">
                {jurusan && (
                    <span className="badge badge-good no-print" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                        {isAdmin ? 'Admin' : jurusan}
                    </span>
                )}
                <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                    <LayoutDashboard size={18} />
                    <span className="nav-link-text" style={{ marginLeft: '6px' }}>Dashboard</span>
                </Link>
                <Link to="/borrowed" className={location.pathname === '/borrowed' ? 'active' : ''}>
                    <ClipboardList size={18} />
                    <span className="nav-link-text" style={{ marginLeft: '6px' }}>Alat Dipinjam</span>
                </Link>
                <Link to="/add" className={`btn btn-primary ${location.pathname === '/add' ? 'active' : ''}`} style={{ color: 'white' }}>
                    <PlusCircle size={18} />
                    <span className="nav-link-text">Add Tool</span>
                </Link>
                <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '8px 10px' }} title="Logout">
                    <LogOut size={18} />
                </button>
            </div>
        </nav>
    );
};

const Layout = ({ children }) => {
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const isScanView = query.get('view') === 'scan';
    const isLoginPage = location.pathname === '/login';

    // Login page has its own full-viewport layout
    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div>
            {!isScanView && <Header />}
            <main className="layout" style={{ paddingTop: isScanView ? '40px' : '' }}>
                {children}
            </main>
        </div>
    );
};

export default Layout;
