import { useState } from "react";

function ClassModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const cleanName = name.trim();

    // Validar nombre obligatorio
    if (!cleanName) {
      setError("El nombre de la clase es obligatorio.");
      return;
    }

    // Validar longitud máxima
    if (cleanName.length > 150) {
      setError("El nombre no puede superar 150 caracteres.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      // Llamar a createClass() de DiagramCanvas.jsx
      await onCreate(cleanName);

      // DiagramCanvas cierra el modal cuando Django guarda correctamente.
    } catch (err) {
      setError(
        err.message || "No se pudo crear la clase."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div
        className="class-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-modal-title"
      >
        {/* ENCABEZADO */}

        <div className="modal-header">
          <h2 id="class-modal-title">
            Nueva clase
          </h2>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* FORMULARIO */}

        <form onSubmit={handleSubmit}>
          <label htmlFor="class-name">
            Nombre de la clase
          </label>

          <input
            id="class-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Cliente"
            maxLength={150}
            disabled={saving}
            autoFocus
          />

          <p className="modal-description">
            La clase se creará en la posición donde la soltaste.
          </p>

          {/* MENSAJE DE ERROR */}

          {error && (
            <p className="modal-error">
              {error}
            </p>
          )}

          {/* BOTONES */}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-create"
              disabled={saving}
            >
              {saving ? "Creando..." : "Crear clase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClassModal;