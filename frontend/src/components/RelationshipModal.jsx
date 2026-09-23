import { useState } from "react";

function RelationshipModal({
  sourceClass,
  targetClass,
  relationship = null,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) {
  // Si recibimos una relación, estamos editando.
  const isEditing = relationship !== null;

  const [relationshipType, setRelationshipType] = useState(
    relationship?.relationship_type || "ONE_TO_MANY",
  );

  const [name, setName] = useState(relationship?.name || "");

  const [sourceHandle, setSourceHandle] = useState(
    relationship?.source_handle || "right",
  );

  const [targetHandle, setTargetHandle] = useState(
    relationship?.target_handle || "left",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (saving || !isEditing) return;

    const confirmed = window.confirm(
      "¿Estás seguro de que deseas eliminar esta relación?",
    );

    if (!confirmed) return;

    setError("");
    setSaving(true);

    try {
      await onDelete();
    } catch (err) {
      setError(err.message || "No se pudo eliminar la relación");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSaving(true);

    try {
      const data = {
        relationship_type: relationshipType,
        name: name.trim(),
        source_handle: sourceHandle,
        target_handle: targetHandle,
      };

      if (isEditing) {
        await onUpdate(data);
      } else {
        await onCreate(data);
      }
    } catch (err) {
      setError(err.message || "No se pudo guardar la relación");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div
        className="class-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="relationship-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="relationship-title">
              {isEditing ? "Editar relación" : "Nueva relación"}
            </h2>

            <p className="editor-subtitle">Configurar relación entre clases</p>
          </div>

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

        <div className="editor-field">
          <label>Clase de origen</label>
          <input type="text" value={sourceClass.data.name} readOnly />
        </div>

        <div className="editor-field">
          <label>Clase de destino</label>
          <input type="text" value={targetClass.data.name} readOnly />
        </div>

        <form className="attribute-form" onSubmit={handleSubmit}>
          <h3>Configurar relación</h3>

          <label htmlFor="relationship-type">Cardinalidad</label>

          <select
            id="relationship-type"
            value={relationshipType}
            onChange={(event) => setRelationshipType(event.target.value)}
            disabled={saving}
          >
            <option value="ONE_TO_ONE">1:1 — Uno a uno</option>
            <option value="ONE_TO_MANY">1:N — Uno a muchos</option>
            <option value="MANY_TO_ONE">N:1 — Muchos a uno</option>
            <option value="MANY_TO_MANY">N:M — Muchos a muchos</option>
          </select>

          <label htmlFor="relationship-name">
            Nombre de la relación (opcional)
          </label>

          <input
            id="relationship-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. contiene"
            maxLength={150}
            disabled={saving}
          />

          {/* PUNTOS DE CONEXIÓN */}
          <h3>Puntos de conexión</h3>

          <label htmlFor="source-handle">Salida desde la clase de origen</label>

          <select
            id="source-handle"
            value={sourceHandle}
            onChange={(event) => setSourceHandle(event.target.value)}
            disabled={saving}
          >
            <option value="top">Arriba</option>
            <option value="right">Derecha</option>
            <option value="bottom">Abajo</option>
            <option value="left">Izquierda</option>
          </select>

          <label htmlFor="target-handle">Entrada a la clase de destino</label>

          <select
            id="target-handle"
            value={targetHandle}
            onChange={(event) => setTargetHandle(event.target.value)}
            disabled={saving}
          >
            <option value="top">Arriba</option>
            <option value="right">Derecha</option>
            <option value="bottom">Abajo</option>
            <option value="left">Izquierda</option>
          </select>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  cursor: saving ? "not-allowed" : "pointer",
                  marginRight: "auto",
                }}
              >
                Eliminar relación
              </button>
            )}

            <button type="submit" className="btn-create" disabled={saving}>
              {saving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Guardar relación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RelationshipModal;
