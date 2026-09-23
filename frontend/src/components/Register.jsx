import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/register/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password: password,
            password_confirm: passwordConfirm,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const message =
          data.username?.[0] ||
          data.email?.[0] ||
          data.password?.[0] ||
          data.password_confirm?.[0] ||
          data.error ||
          "No se pudo registrar el usuario.";

        throw new Error(message);
      }

      // Registro exitoso: enviar al login.
      navigate("/login", { replace: true });

    } catch (err) {
      setError(
        err.message || "Ocurrió un error al registrarse."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="class-modal">
        <div className="modal-header">
          <h2>Crear cuenta</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="register-username">
            Nombre de usuario
          </label>

          <input
            id="register-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoComplete="username"
            maxLength={150}
          />

          <label htmlFor="register-email">
            Correo electrónico
          </label>

          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />

          <label htmlFor="register-password">
            Contraseña
          </label>

          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
          />

          <label htmlFor="register-confirm">
            Confirmar contraseña
          </label>

          <input
            id="register-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(event) =>
              setPasswordConfirm(event.target.value)
            }
            required
            autoComplete="new-password"
          />

          {error && (
            <p className="modal-error">{error}</p>
          )}

          <button
            type="submit"
            className="btn-create"
            disabled={loading}
          >
            {loading ? "Registrando..." : "Crear cuenta"}
          </button>

          <p className="modal-description">
            ¿Ya tienes una cuenta?{" "}
            <Link to="/login">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;