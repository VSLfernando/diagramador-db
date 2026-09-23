import { useState } from "react";

const DATA_TYPES = [
  "INTEGER",
  "BIGINT",
  "VARCHAR",
  "TEXT",
  "BOOLEAN",
  "DATE",
  "DATETIME",
  "DECIMAL",
  "FLOAT",
  "UUID",
];

function ClassEditorModal({
  diagramClass,
  onClose,
  onAddAttribute,
  onUpdateAttribute,
  onDeleteAttribute,
  onDeleteClass,
}) {
  const [showForm, setShowForm] = useState(false);

  // null = crear atributo
  // ID = editar atributo
  const [editingAttributeId, setEditingAttributeId] = useState(null);

  const [name, setName] = useState("");
  const [dataType, setDataType] = useState("VARCHAR");
  const [length, setLength] = useState("100");

  const [isPrimaryKey, setIsPrimaryKey] = useState(false);
  const [isNullable, setIsNullable] = useState(true);
  const [isUnique, setIsUnique] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!diagramClass) {
    return null;
  }

  const attributes = diagramClass.data.attributes || [];
  const isEditing = editingAttributeId !== null;

  // =========================================
  // REINICIAR FORMULARIO
  // =========================================

  function resetForm() {
    setName("");
    setDataType("VARCHAR");
    setLength("100");

    setIsPrimaryKey(false);
    setIsNullable(true);
    setIsUnique(false);

    // IMPORTANTE: limpiar el atributo seleccionado
    setEditingAttributeId(null);

    setError("");
    setShowForm(false);
  }

  // =========================================
  // ABRIR FORMULARIO PARA CREAR
  // =========================================

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  // =========================================
  // ABRIR FORMULARIO PARA EDITAR
  // =========================================

  function openEditForm(attribute) {
    if (saving) return;

    setEditingAttributeId(attribute.id);

    setName(attribute.name);
    setDataType(attribute.data_type);

    setLength(
      attribute.length !== null && attribute.length !== undefined
        ? String(attribute.length)
        : "100",
    );

    setIsPrimaryKey(attribute.is_primary_key);
    setIsNullable(attribute.is_nullable);
    setIsUnique(attribute.is_unique);

    setError("");
    setShowForm(true);
  }

  // =========================================
  // GUARDAR ATRIBUTO: POST O PATCH
  // =========================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const cleanName = name.trim();

    // Validar nombre obligatorio
    if (!cleanName) {
      setError("El nombre del atributo es obligatorio");
      return;
    }

    // Validar longitud del nombre
    if (cleanName.length > 150) {
      setError("El nombre no puede superar 150 caracteres");
      return;
    }

    // Validar nombres duplicados.
    // Si estamos editando, excluir el atributo actual.
    const duplicate = attributes.some((attribute) => {
      const isCurrentAttribute =
        isEditing && String(attribute.id) === String(editingAttributeId);

      const sameName =
        attribute.name.trim().toLowerCase() === cleanName.toLowerCase();

      return !isCurrentAttribute && sameName;
    });

    if (duplicate) {
      setError("Ya existe un atributo con ese nombre");
      return;
    }

    // Validar clave primaria.
    // No contar la PK del propio atributo editado.
    const anotherPrimaryKey = attributes.some((attribute) => {
      const isCurrentAttribute =
        isEditing && String(attribute.id) === String(editingAttributeId);

      return !isCurrentAttribute && attribute.is_primary_key;
    });

    if (isPrimaryKey && anotherPrimaryKey) {
      setError("Esta clase ya tiene una clave primaria");
      return;
    }

    // Validar longitud de VARCHAR
    let parsedLength = null;

    if (dataType === "VARCHAR") {
      parsedLength = Number(length);

      if (!Number.isInteger(parsedLength) || parsedLength <= 0) {
        setError("La longitud debe ser un entero mayor que cero");
        return;
      }
    }

    // Preparar datos para Django
    const attributeData = {
      name: cleanName,
      data_type: dataType,
      length: parsedLength,
      is_primary_key: isPrimaryKey,
      is_nullable: isPrimaryKey ? false : isNullable,
      is_unique: isPrimaryKey ? true : isUnique,
    };

    setError("");
    setSaving(true);

    try {
      if (isEditing) {
        // EDITAR: PATCH
        await onUpdateAttribute(editingAttributeId, attributeData);
      } else {
        // CREAR: POST
        await onAddAttribute(diagramClass.id, {
          ...attributeData,
          order: attributes.length,
        });
      }

      // Limpiar solamente después de guardar correctamente
      resetForm();
    } catch (err) {
      setError(err.message || "No se pudo guardar el atributo");
    } finally {
      setSaving(false);
    }
  }

  // =========================================
  // ELIMINAR ATRIBUTO: DELETE
  // =========================================

  async function handleDelete(attribute) {
    if (saving) return;

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el atributo "${attribute.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSaving(true);

    try {
      await onDeleteAttribute(attribute.id);

      // Si eliminamos el atributo que estábamos editando,
      // cerrar y limpiar el formulario.
      if (String(editingAttributeId) === String(attribute.id)) {
        resetForm();
      }
    } catch (err) {
      setError(err.message || "No se pudo eliminar el atributo");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClass() {
    if (saving) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar la clase "${diagramClass.data.name}"?`,
    );

    if (!confirmed) return;

    setError("");
    setSaving(true);

    try {
      await onDeleteClass(diagramClass.id);
    } catch (err) {
      setError(err.message || "No se pudo eliminar la clase");
    } finally {
      setSaving(false);
    }
  }

  // =========================================
  // INTERFAZ
  // =========================================

  return (
    <div className="modal-overlay">
      <div
        className="class-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        {/* ENCABEZADO */}

        <div className="modal-header">
          <div>
            <h2 id="editor-title">Editar clase</h2>

            <p className="editor-subtitle">
              Configurar atributos de {diagramClass.data.name}
            </p>
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

        {/* NOMBRE DE LA CLASE */}

        <div className="editor-field">
          <label htmlFor="editor-class-name">Nombre de la clase</label>

          <input
            id="editor-class-name"
            type="text"
            value={diagramClass.data.name}
            readOnly
          />
        </div>

        {/* ENCABEZADO DE ATRIBUTOS */}

        <div className="editor-attributes-header">
          <h3>Atributos</h3>

          <span className="editor-count">{attributes.length} atributos</span>
        </div>

        {/* LISTA DE ATRIBUTOS */}

        <div className="editor-attributes-list">
          {attributes.length === 0 ? (
            <p className="editor-empty">
              Esta clase todavía no tiene atributos.
            </p>
          ) : (
            attributes.map((attribute) => (
              <div key={attribute.id} className="editor-attribute">
                <span className="editor-attribute-icon">
                  {attribute.is_primary_key ? "🔑" : "≡"}
                </span>

                <div className="editor-attribute-info">
                  <strong>{attribute.name}</strong>

                  <small>
                    {attribute.data_type}

                    {attribute.length ? `(${attribute.length})` : ""}

                    {attribute.is_primary_key ? " · PK" : ""}
                  </small>
                </div>

                {/* EDITAR */}

                <button
                  type="button"
                  className="editor-icon-button"
                  onClick={() => openEditForm(attribute)}
                  disabled={saving}
                  title="Editar atributo"
                  aria-label={`Editar ${attribute.name}`}
                >
                  ✎
                </button>

                {/* ELIMINAR */}

                <button
                  type="button"
                  className="editor-icon-button"
                  onClick={() => handleDelete(attribute)}
                  disabled={saving}
                  title="Eliminar atributo"
                  aria-label={`Eliminar ${attribute.name}`}
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>

        {/* ERROR CUANDO EL FORMULARIO ESTÁ CERRADO */}

        {error && !showForm && <p className="modal-error">{error}</p>}

        {/* BOTÓN AGREGAR */}

        {!showForm && (
          <button
            type="button"
            className="editor-add-button"
            onClick={openCreateForm}
            disabled={saving}
          >
            + Agregar atributo
          </button>
        )}

        {/* FORMULARIO CREAR / EDITAR */}

        {showForm && (
          <form className="attribute-form" onSubmit={handleSubmit}>
            <h3>{isEditing ? "Editar atributo" : "Nuevo atributo"}</h3>

            {/* NOMBRE */}

            <label htmlFor="attribute-name">Nombre</label>

            <input
              id="attribute-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. precio"
              maxLength={150}
              disabled={saving}
              autoFocus
            />

            {/* TIPO DE DATO */}

            <label htmlFor="attribute-type">Tipo de dato</label>

            <select
              id="attribute-type"
              value={dataType}
              onChange={(event) => setDataType(event.target.value)}
              disabled={saving}
            >
              {DATA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* LONGITUD */}

            {dataType === "VARCHAR" && (
              <>
                <label htmlFor="attribute-length">Longitud</label>

                <input
                  id="attribute-length"
                  type="number"
                  min="1"
                  step="1"
                  value={length}
                  onChange={(event) => setLength(event.target.value)}
                  disabled={saving}
                />
              </>
            )}

            {/* RESTRICCIONES */}

            <div className="attribute-checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={isPrimaryKey}
                  onChange={(event) => {
                    const checked = event.target.checked;

                    setIsPrimaryKey(checked);

                    if (checked) {
                      setIsNullable(false);
                      setIsUnique(true);
                    }
                  }}
                  disabled={saving}
                />
                Clave primaria (PK)
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={isNullable}
                  onChange={(event) => setIsNullable(event.target.checked)}
                  disabled={saving || isPrimaryKey}
                />
                Permitir valores nulos
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={isUnique}
                  onChange={(event) => setIsUnique(event.target.checked)}
                  disabled={saving || isPrimaryKey}
                />
                Valor único (UNIQUE)
              </label>
            </div>

            {/* ERRORES DEL FORMULARIO */}

            {error && <p className="modal-error">{error}</p>}

            {/* BOTONES DEL FORMULARIO */}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar
              </button>

              <button type="submit" className="btn-create" disabled={saving}>
                {saving
                  ? "Guardando..."
                  : isEditing
                    ? "Guardar cambios"
                    : "Guardar atributo"}
              </button>
            </div>
          </form>
        )}

        {/* CERRAR EDITOR */}

        {!showForm && (
          <div className="modal-actions">
            <button
              type="button"
              onClick={handleDeleteClass}
              disabled={saving}
              style={{
                backgroundColor: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 15px",
                cursor: saving ? "not-allowed" : "pointer",
                marginRight: "auto",
              }}
            >
              Eliminar clase
            </button>

            <button
              type="button"
              className="btn-create"
              onClick={onClose}
              disabled={saving}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClassEditorModal;
