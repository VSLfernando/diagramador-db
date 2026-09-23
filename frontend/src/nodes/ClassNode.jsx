import { Handle, Position } from "@xyflow/react";

function ClassNode({ data }) {
  const handleStyle = {
    background: "#334155",
    width: "10px",
    height: "10px",
    border: "2px solid #ffffff",
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "2px solid #334155",
        borderRadius: "8px",
        minWidth: "230px",
        overflow: "hidden",
        boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
      }}
    >
      {/* Punto superior */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={handleStyle}
      />

      {/* Punto izquierdo */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={handleStyle}
      />

      {/* Nombre de la clase */}
      <div
        style={{
          background: "#334155",
          color: "white",
          padding: "12px",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        {data.name}
      </div>

      {/* Atributos */}
      <div style={{ padding: "10px", color: "#111827" }}>
        {data.attributes.map((attribute) => (
          <div
            key={attribute.id}
            style={{
              padding: "5px",
              borderBottom: "1px solid #e5e7eb",
              fontSize: "13px",
            }}
          >
            {attribute.is_primary_key && "🔑 "}

            {attribute.name} : {attribute.data_type}

            {attribute.length && `(${attribute.length})`}
          </div>
        ))}
      </div>

      {/* Punto derecho */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={handleStyle}
      />

      {/* Punto inferior */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={handleStyle}
      />
    </div>
  );
}

export default ClassNode;