import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ClassModal from "./ClassModal";
import ClassEditorModal from "./ClassEditorModal";
import RelationshipModal from "./RelationshipModal";

import {
  ReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  //addEdge,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import ClassNode from "../nodes/ClassNode";

const nodeTypes = {
  classNode: ClassNode,
};

function DiagramCanvas() {
  const { id: diagramId } = useParams();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { screenToFlowPosition } = useReactFlow();

  function onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function onDrop(event) {
    event.preventDefault();

    console.log("🔥 ON DROP SE EJECUTÓ");

    const nodeType = event.dataTransfer.getData("application/reactflow");

    console.log("Tipo recibido:", nodeType);

    if (nodeType !== "classNode") {
      return;
    }

    // Obtener la posición donde se soltó la clase
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Guardar la posición temporalmente
    setPendingPosition(position);

    console.log("Posición calculada:", position);
    console.log("Intentando abrir ClassModal");

    // Abrir nuestro formulario
    setIsModalOpen(true);
  }

  async function createClass(name) {
    if (!pendingPosition) {
      throw new Error("No se encontró la posición de la clase");
    }

    // Eliminar espacios al inicio y al final.
    const cleanName = name.trim();

    // Comprobar si ya existe una clase con ese nombre.
    const duplicate = nodes.some(
      (node) => node.data.name.trim().toLowerCase() === cleanName.toLowerCase(),
    );

    if (duplicate) {
      throw new Error("Ya existe una clase con ese nombre en el diagrama.");
    }

    const response = await fetch(
      `http://127.0.0.1:8000/api/diagrams/${diagramId}/classes/`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("access")}`,
        },

        body: JSON.stringify({
          name: cleanName,
          position_x: pendingPosition.x,
          position_y: pendingPosition.y,
        }),
      },
    );

    if (!response.ok) {
      let message = "No se pudo crear la clase";

      try {
        const errorData = await response.json();
        message = errorData.error || message;
      } catch {
        // Mantener el mensaje general si la respuesta no es JSON
      }

      throw new Error(message);
    }

    const newClass = await response.json();

    // Crear el nodo visual con el ID real de PostgreSQL
    const newNode = {
      id: String(newClass.id),

      type: "classNode",

      position: {
        x: newClass.position_x,
        y: newClass.position_y,
      },

      data: {
        name: newClass.name,
        attributes: newClass.attributes,
      },
    };

    // Agregarlo al lienzo
    setNodes((currentNodes) => {
      const alreadyExists = currentNodes.some((node) => node.id === newNode.id);

      if (alreadyExists) {
        return currentNodes;
      }

      return [...currentNodes, newNode];
    });

    // Cerrar el formulario después de guardar correctamente
    setIsModalOpen(false);
    setPendingPosition(null);
  }

  async function addAttribute(classId, attributeData) {
    const response = await fetch(
      `http://127.0.0.1:8000/api/classes/${classId}/attributes/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("access")}`,
        },
        body: JSON.stringify(attributeData),
      },
    );

    if (!response.ok) {
      let message = "No se pudo guardar el atributo";

      try {
        const errorData = await response.json();

        message = errorData.error || JSON.stringify(errorData);
      } catch {
        // Mantener mensaje general
      }

      throw new Error(message);
    }

    const newAttribute = await response.json();

    // Actualizar los atributos de la clase correspondiente
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== String(classId)) {
          return node;
        }

        const currentAttributes = node.data.attributes || [];

        const alreadyExists = currentAttributes.some(
          (attribute) => String(attribute.id) === String(newAttribute.id),
        );

        if (alreadyExists) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            attributes: [...currentAttributes, newAttribute],
          },
        };
      }),
    );

    return newAttribute;
  }

  async function updateAttribute(attributeId, attributeData) {
    const response = await fetch(
      `http://127.0.0.1:8000/api/attributes/${attributeId}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("access")}`,
        },
        body: JSON.stringify(attributeData),
      },
    );

    if (!response.ok) {
      let message = "No se pudo actualizar el atributo";

      try {
        const errorData = await response.json();

        message = errorData.error || JSON.stringify(errorData);
      } catch {
        // Mantener mensaje general
      }

      throw new Error(message);
    }

    const updatedAttribute = await response.json();

    // Actualizar el atributo dentro de su clase en React Flow.
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          attributes: (node.data.attributes || []).map((attribute) =>
            attribute.id === updatedAttribute.id ? updatedAttribute : attribute,
          ),
        },
      })),
    );

    return updatedAttribute;
  }

  async function deleteAttribute(attributeId) {
    const response = await fetch(
      `http://127.0.0.1:8000/api/attributes/${attributeId}/`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access")}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("No se pudo eliminar el atributo");
    }

    // Actualizar las clases del lienzo sin recargar la página.
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          attributes: (node.data.attributes || []).filter(
            (attribute) => String(attribute.id) !== String(attributeId),
          ),
        },
      })),
    );
  }

  async function deleteClass(classId) {
    const response = await fetch(
      `http://127.0.0.1:8000/api/classes/${classId}/`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access")}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("No se pudo eliminar la clase.");
    }

    // Quitar la clase del lienzo
    setNodes((currentNodes) =>
      currentNodes.filter((node) => node.id !== String(classId)),
    );

    // Quitar todas las relaciones donde participe esa clase
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          edge.source !== String(classId) && edge.target !== String(classId),
      ),
    );

    // Cerrar el editor de clase
    setSelectedClassId(null);
  }

  function closeClassModal() {
    setIsModalOpen(false);
    setPendingPosition(null);
  }

  async function saveNodePosition(event, node) {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/classes/${node.id}/position/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("access")}`,
          },
          body: JSON.stringify({
            position_x: node.position.x,
            position_y: node.position.y,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("No se pudo guardar la posición");
      }

      console.log("Posición guardada:", node.id);
    } catch (error) {
      console.error(error);
      alert("Error al guardar la posición");
    }
  }

  const [diagramName, setDiagramName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPosition, setPendingPosition] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [selectedRelationship, setSelectedRelationship] = useState(null);
  const [websocketStatus, setWebsocketStatus] = useState(() =>
    sessionStorage.getItem("access") ? "Conectando..." : "Sin autenticación",
  );

  function handleNodeDoubleClick(event, node) {
    setSelectedClassId(node.id);
  }

  function handleEdgeDoubleClick(event, edge) {
    const relationship = edge.data?.relationship;

    if (!relationship) {
      console.error("No se encontraron los datos de la relación.");
      return;
    }

    setSelectedRelationship(relationship);
  }

  function handleConnect(connection) {
    if (connection.source === connection.target) {
      alert("No puedes relacionar una clase consigo misma.");
      return;
    }

    setPendingConnection(connection);
  }

  async function createRelationship(relationshipData) {
    if (!pendingConnection) {
      throw new Error("No se encontró la conexión.");
    }

    const response = await fetch(
      `http://127.0.0.1:8000/api/diagrams/${diagramId}/relationships/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("access")}`,
        },
        body: JSON.stringify({
          source_class: Number(pendingConnection.source),
          target_class: Number(pendingConnection.target),
          source_handle: pendingConnection.sourceHandle,
          target_handle: pendingConnection.targetHandle,
          relationship_type: relationshipData.relationship_type,
          name: relationshipData.name,
        }),
      },
    );

    if (!response.ok) {
      let message = "No se pudo guardar la relación.";

      try {
        const errorData = await response.json();
        message = errorData.error || JSON.stringify(errorData);
      } catch {
        // Mantener el mensaje general.
      }

      throw new Error(message);
    }

    const newRelationship = await response.json();

    // Crear la línea con el ID real de PostgreSQL.
    const newEdge = {
      id: String(newRelationship.id),

      data: {
        relationship: newRelationship,
      },

      source: String(newRelationship.source_class),
      target: String(newRelationship.target_class),

      sourceHandle: pendingConnection.sourceHandle,
      targetHandle: pendingConnection.targetHandle,

      type: "smoothstep",

      label: {
        ONE_TO_ONE: "1:1",
        ONE_TO_MANY: "1:N",
        MANY_TO_ONE: "N:1",
        MANY_TO_MANY: "N:M",
      }[newRelationship.relationship_type],

      markerEnd: {
        type: MarkerType.ArrowClosed,
      },

      style: {
        strokeWidth: 2,
        stroke: "#334155",
      },
    };

    setEdges((currentEdges) => {
      const alreadyExists = currentEdges.some((edge) => edge.id === newEdge.id);

      if (alreadyExists) {
        return currentEdges;
      }

      return [...currentEdges, newEdge];
    });

    // Cerrar el formulario únicamente después de guardar.
    setPendingConnection(null);
  }

  async function updateRelationship(relationshipData) {
    if (!selectedRelationship) {
      throw new Error("No se seleccionó ninguna relación.");
    }

    const response = await fetch(
      `http://127.0.0.1:8000/api/relationships/${selectedRelationship.id}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("access")}`,
        },
        body: JSON.stringify(relationshipData),
      },
    );

    if (!response.ok) {
      let message = "No se pudo actualizar la relación.";

      try {
        const errorData = await response.json();
        message = errorData.error || JSON.stringify(errorData);
      } catch {
        // Mantener el mensaje general.
      }

      throw new Error(message);
    }

    const updatedRelationship = await response.json();

    // Actualizar la línea sin recargar el navegador.
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        if (edge.id !== String(updatedRelationship.id)) {
          return edge;
        }

        return {
          ...edge,

          sourceHandle: updatedRelationship.source_handle,
          targetHandle: updatedRelationship.target_handle,

          label: {
            ONE_TO_ONE: "1:1",
            ONE_TO_MANY: "1:N",
            MANY_TO_ONE: "N:1",
            MANY_TO_MANY: "N:M",
          }[updatedRelationship.relationship_type],

          data: {
            ...edge.data,
            relationship: updatedRelationship,
          },
        };
      }),
    );

    // Cerrar el formulario después de guardar.
    setSelectedRelationship(null);
  }

  async function deleteRelationship() {
    if (!selectedRelationship) {
      throw new Error("No se seleccionó ninguna relación.");
    }

    const relationshipId = selectedRelationship.id;

    // Solicitar la eliminación a Django.
    const response = await fetch(
      `http://127.0.0.1:8000/api/relationships/${relationshipId}/`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access")}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("No se pudo eliminar la relación.");
    }

    // Quitar la línea del lienzo.
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.id !== String(relationshipId)),
    );

    // Cerrar el formulario.
    setSelectedRelationship(null);
  }

  useEffect(() => {
    async function loadDiagram() {
      try {
        const access = sessionStorage.getItem("access");

        const response = await fetch(
          `http://127.0.0.1:8000/api/diagrams/${diagramId}/`,
          {
            headers: {
              Authorization: `Bearer ${access}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("No se pudo cargar el diagrama");
        }

        const diagram = await response.json();

        setDiagramName(diagram.name);

        // Convertir clases de Django a nodos React Flow
        const flowNodes = diagram.classes.map((diagramClass) => ({
          id: String(diagramClass.id),

          type: "classNode",

          position: {
            x: diagramClass.position_x,
            y: diagramClass.position_y,
          },

          data: {
            name: diagramClass.name,
            attributes: diagramClass.attributes,
          },
        }));

        // Convertir relaciones de Django a conexiones
        const flowEdges = diagram.relationships.map((relationship) => ({
          id: String(relationship.id),

          data: {
            relationship: relationship,
          },

          source: String(relationship.source_class),
          target: String(relationship.target_class),

          sourceHandle: relationship.source_handle,
          targetHandle: relationship.target_handle,

          type: "smoothstep",

          label: relationship.relationship_type
            .replace("ONE_TO_MANY", "1:N")
            .replace("ONE_TO_ONE", "1:1")
            .replace("MANY_TO_ONE", "N:1")
            .replace("MANY_TO_MANY", "N:M"),

          markerEnd: {
            type: MarkerType.ArrowClosed,
          },

          style: {
            strokeWidth: 2,
            stroke: "#334155",
          },
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDiagram();
  }, [diagramId, setNodes, setEdges]);

  useEffect(() => {
    const access = sessionStorage.getItem("access");

    if (!access) {
      return;
    }

    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws/diagrams/${diagramId}/`,
    );

    socket.onopen = () => {
      console.log("WebSocket abierto");

      setWebsocketStatus("Conectando...");

      // Enviar JWT como primer mensaje.
      socket.send(
        JSON.stringify({
          type: "authenticate",
          token: access,
        }),
      );
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Confirmación de autenticación.
      if (data.type === "connected") {
        console.log("WebSocket autenticado:", data.message);
        setWebsocketStatus("Conectado");
        return;
      }

      // Una clase fue creada por algún usuario.
      if (data.type === "class_created") {
        const newClass = data.diagram_class;

        console.log("Clase recibida en tiempo real:", newClass.name);

        // Convertir los datos de Django a un nodo de React Flow.
        const newNode = {
          id: String(newClass.id),
          type: "classNode",

          position: {
            x: newClass.position_x,
            y: newClass.position_y,
          },

          data: {
            name: newClass.name,
            attributes: newClass.attributes || [],
          },
        };

        setNodes((currentNodes) => {
          // Evitar agregar dos veces la misma clase.
          const alreadyExists = currentNodes.some(
            (node) => node.id === newNode.id,
          );

          if (alreadyExists) {
            return currentNodes;
          }

          return [...currentNodes, newNode];
        });
      }

      // Una clase cambió de posición en otro navegador.
      if (data.type === "class_moved") {
        const classId = String(data.class_id);

        console.log("Movimiento recibido:", classId);

        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            if (node.id !== classId) {
              return node;
            }

            return {
              ...node,
              position: {
                x: data.position_x,
                y: data.position_y,
              },
            };
          }),
        );

        return;
      }

      // Una clase fue eliminada del diagrama.
      if (data.type === "class_deleted") {
        const classId = String(data.class_id);

        console.log("Clase eliminada en tiempo real:", classId);

        // Eliminar la clase del lienzo.
        setNodes((currentNodes) =>
          currentNodes.filter((node) => node.id !== classId),
        );

        // Eliminar todas sus relaciones asociadas.
        setEdges((currentEdges) =>
          currentEdges.filter(
            (edge) => edge.source !== classId && edge.target !== classId,
          ),
        );

        return;
      }

      // Una relación fue creada en el diagrama.
      if (data.type === "relationship_created") {
        const relationship = data.relationship;

        console.log("Relación creada en tiempo real:", relationship.id);

        const newEdge = {
          id: String(relationship.id),

          data: {
            relationship: relationship,
          },

          source: String(relationship.source_class),
          target: String(relationship.target_class),

          sourceHandle: relationship.source_handle,
          targetHandle: relationship.target_handle,

          type: "smoothstep",

          label: {
            ONE_TO_ONE: "1:1",
            ONE_TO_MANY: "1:N",
            MANY_TO_ONE: "N:1",
            MANY_TO_MANY: "N:M",
          }[relationship.relationship_type],

          markerEnd: {
            type: MarkerType.ArrowClosed,
          },

          style: {
            strokeWidth: 2,
            stroke: "#334155",
          },
        };

        setEdges((currentEdges) => {
          const alreadyExists = currentEdges.some(
            (edge) => edge.id === newEdge.id,
          );

          if (alreadyExists) {
            return currentEdges;
          }

          return [...currentEdges, newEdge];
        });

        return;
      }
      // Una relación fue actualizada.
      if (data.type === "relationship_updated") {
        const relationship = data.relationship;

        console.log("Relación actualizada en tiempo real:", relationship.id);

        setEdges((currentEdges) =>
          currentEdges.map((edge) => {
            if (edge.id !== String(relationship.id)) {
              return edge;
            }

            return {
              ...edge,

              sourceHandle: relationship.source_handle,
              targetHandle: relationship.target_handle,

              label: {
                ONE_TO_ONE: "1:1",
                ONE_TO_MANY: "1:N",
                MANY_TO_ONE: "N:1",
                MANY_TO_MANY: "N:M",
              }[relationship.relationship_type],

              data: {
                ...edge.data,
                relationship: relationship,
              },
            };
          }),
        );

        return;
      }

      // Una relación fue eliminada.
      if (data.type === "relationship_deleted") {
        const relationshipId = String(data.relationship_id);

        console.log("Relación eliminada en tiempo real:", relationshipId);

        setEdges((currentEdges) =>
          currentEdges.filter((edge) => edge.id !== relationshipId),
        );

        return;
      }

      if (data.type === "attribute_created") {
        const classId = String(data.class_id);
        const newAttribute = data.attribute;

        console.log("Atributo creado en tiempo real:", newAttribute.name);

        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            if (node.id !== classId) {
              return node;
            }

            const currentAttributes = node.data.attributes || [];

            const alreadyExists = currentAttributes.some(
              (attribute) => String(attribute.id) === String(newAttribute.id),
            );

            if (alreadyExists) {
              return node;
            }

            return {
              ...node,
              data: {
                ...node.data,
                attributes: [...currentAttributes, newAttribute],
              },
            };
          }),
        );

        return;
      }

      if (data.type === "attribute_updated") {
        const classId = String(data.class_id);
        const updatedAttribute = data.attribute;

        console.log(
          "Atributo actualizado en tiempo real:",
          updatedAttribute.name,
        );

        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            if (node.id !== classId) {
              return node;
            }

            return {
              ...node,
              data: {
                ...node.data,
                attributes: (node.data.attributes || []).map((attribute) =>
                  String(attribute.id) === String(updatedAttribute.id)
                    ? updatedAttribute
                    : attribute,
                ),
              },
            };
          }),
        );

        return;
      }

      if (data.type === "attribute_deleted") {
        const classId = String(data.class_id);
        const attributeId = String(data.attribute_id);

        console.log("Atributo eliminado en tiempo real:", attributeId);

        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            if (node.id !== classId) {
              return node;
            }

            return {
              ...node,
              data: {
                ...node.data,
                attributes: (node.data.attributes || []).filter(
                  (attribute) => String(attribute.id) !== attributeId,
                ),
              },
            };
          }),
        );

        return;
      }
    };

    socket.onerror = () => {
      console.error("Error de conexión WebSocket");
      setWebsocketStatus("Error de conexión");
    };

    socket.onclose = () => {
      console.log("WebSocket desconectado");
      setWebsocketStatus("Desconectado");
    };

    // Cerrar la conexión al salir del diagrama.
    return () => {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    };
  }, [diagramId, setNodes, setEdges]);

  if (loading) {
    return <h2>Cargando diagrama...</h2>;
  }

  if (error) {
    return <h2>Error: {error}</h2>;
  }

  return (
    <div className="diagram-page">
      <header
        className="diagram-header"
        style={{
          justifyContent: "space-between",
        }}
      >
        <h1>{diagramName}</h1>

        <span
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: websocketStatus === "Conectado" ? "#86efac" : "#fcd34d",
          }}
        >
          ● {websocketStatus}
        </span>
      </header>

      <div className="diagram-workspace">
        <Sidebar />

        <div className="diagram-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            connectionMode={ConnectionMode.Loose}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={saveNodePosition}
            onNodeDoubleClick={handleNodeDoubleClick}
            onEdgeDoubleClick={handleEdgeDoubleClick}
            onConnect={handleConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      {/* Formulario para crear una nueva clase */}
      {isModalOpen && (
        <>
          {console.log("ClassModal se está renderizando")}
          <ClassModal onClose={closeClassModal} onCreate={createClass} />
        </>
      )}

      {selectedClassId !== null && (
        <ClassEditorModal
          diagramClass={nodes.find((node) => node.id === selectedClassId)}
          onClose={() => setSelectedClassId(null)}
          onAddAttribute={addAttribute}
          onUpdateAttribute={updateAttribute}
          onDeleteAttribute={deleteAttribute}
          onDeleteClass={deleteClass}
        />
      )}

      {pendingConnection && (
        <RelationshipModal
          sourceClass={nodes.find(
            (node) => node.id === pendingConnection.source,
          )}
          targetClass={nodes.find(
            (node) => node.id === pendingConnection.target,
          )}
          onClose={() => setPendingConnection(null)}
          onCreate={createRelationship}
        />
      )}

      {selectedRelationship && (
        <RelationshipModal
          key={selectedRelationship.id}
          relationship={selectedRelationship}
          sourceClass={nodes.find(
            (node) => node.id === String(selectedRelationship.source_class),
          )}
          targetClass={nodes.find(
            (node) => node.id === String(selectedRelationship.target_class),
          )}
          onClose={() => setSelectedRelationship(null)}
          onUpdate={updateRelationship}
          onDelete={deleteRelationship}
        />
      )}
    </div>
  );
}
function DiagramCanvasWithProvider() {
  return (
    <ReactFlowProvider>
      <DiagramCanvas />
    </ReactFlowProvider>
  );
}

export default DiagramCanvasWithProvider;
