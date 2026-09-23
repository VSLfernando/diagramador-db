import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/login/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Usuario o contraseña incorrectos.");
      }

      const data = await response.json();

      // Guardar los datos de autenticación.
      // Por ahora usaremos sessionStorage.
      sessionStorage.setItem("access", data.access);
      sessionStorage.setItem("refresh", data.refresh);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      // Redirigir temporalmente al diagramador.
      navigate("/projects", { replace: true });

    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="class-modal">
        <div className="modal-header">
          <h2>Iniciar sesión</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-username">
            Usuario
          </label>

          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoComplete="username"
          />

          <label htmlFor="login-password">
            Contraseña
          </label>

          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="modal-error">{error}</p>
          )}

          <button
            type="submit"
            className="btn-create"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>

          <p className="modal-description">
            ¿No tienes una cuenta?{" "}
            <Link to="/register">Regístrate</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;