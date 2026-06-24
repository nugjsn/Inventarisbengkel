import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddTool from './pages/AddTool';
import EditTool from './pages/EditTool';
import ToolDetail from './pages/ToolDetail';
import LoginPage from './pages/LoginPage';
import CompressData from './pages/CompressData';
import { InventoryProvider } from './context/InventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check if it's a scan view (always public)
  const query = new URLSearchParams(location.search);
  const isScanView = query.get('view') === 'scan';

  if (loading) return null;

  // Scan view is ALWAYS public, even for protected routes if accessed this way
  // But normally scan view is on /tool/:id which we handle separately below
  if (!user && !isScanView) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Main App Navigation
const AppRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const isScanView = query.get('view') === 'scan';

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

        {/* TOOL DETAIL: Public if view=scan, otherwise protected */}
        <Route path="/tool/:id" element={
          isScanView ? <ToolDetail /> : (
            <ProtectedRoute>
              <ToolDetail />
            </ProtectedRoute>
          )
        } />

        {/* OTHER ROUTES: Always protected */}
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/add" element={
          <ProtectedRoute>
            <AddTool />
          </ProtectedRoute>
        } />
        <Route path="/edit/:id" element={
          <ProtectedRoute>
            <EditTool />
          </ProtectedRoute>
        } />
        <Route path="/compress-db" element={
          <ProtectedRoute>
            <CompressData />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </InventoryProvider>
    </AuthProvider>
  );
}

export default App;
