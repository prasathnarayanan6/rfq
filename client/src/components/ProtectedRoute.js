import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function hasValidToken() {
  const token = localStorage.getItem('user_token');
  if (!token) return false;

  try {
    const claims = jwtDecode(token);
    return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now();
  } catch (_error) {
    localStorage.removeItem('user_token');
    return false;
  }
}

function ProtectedRoute() {
  return hasValidToken() ? <Outlet /> : <Navigate to="/" replace />;
}

export default ProtectedRoute;
