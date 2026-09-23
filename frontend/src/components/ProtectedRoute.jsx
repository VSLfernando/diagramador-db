import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const access = sessionStorage.getItem("access");

  // Si no existe un token, redirigir al login.
  if (!access) {
    return <Navigate to="/login" replace />;
  }

  // Si existe, permitir el acceso.
  return children;
}

export default ProtectedRoute;