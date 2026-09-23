import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function Projects() {
  const [myProjects, setMyProjects] = useState([]);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [creatingDiagramFor, setCreatingDiagramFor] = useState(null);
  const [diagramName, setDiagramName] = useState("");
  const [diagramError, setDiagramError] = useState("");
  const [savingDiagram, setSavingDiagram] = useState(false);

  const [sharingProjectId, setSharingProjectId] = useState(null);
  const [collaboratorUsername, setCollaboratorUsername] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");

  useEffect(() => {
    async function loadProjects() {
      try {
        const access = sessionStorage.getItem("access");

        const response = await fetch("http://127.0.0.1:8000/api/projects/", {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        });

        if (!response.ok) {
          throw new Error("No se pudieron cargar los proyectos.");
        }

        const data = await response.json();

        setMyProjects(data.my_projects);
        setSharedProjects(data.shared_projects);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  const user = JSON.parse(sessionStorage.getItem("user") || "null");

  async function createProject(event) {
    event.preventDefault();

    if (creating) return;

    const name = projectName.trim();

    if (!name) {
      setCreateError("El nombre del proyecto es obligatorio.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/projects/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("access")}`,
        },
        body: JSON.stringify({
          name: name,
          description: projectDescription.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el proyecto.");
      }

      // Mostrar inmediatamente el nuevo proyecto.
      setMyProjects((currentProjects) => [...currentProjects, data]);

      // Limpiar y cerrar el formulario.
      setProjectName("");
      setProjectDescription("");
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err.message || "Ocurrió un error al crear el proyecto.");
    } finally {
      setCreating(false);
    }
  }

  async function createDiagram(event, projectId) {
    event.preventDefault();

    if (savingDiagram) return;

    const name = diagramName.trim();

    if (!name) {
      setDiagramError("El nombre del diagrama es obligatorio.");
      return;
    }

    setSavingDiagram(true);
    setDiagramError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/projects/${projectId}/diagrams/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("access")}`,
          },
          body: JSON.stringify({ name }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el diagrama.");
      }

      // Agregar el nuevo diagrama al proyecto correspondiente.
      function addDiagram(projects) {
        return projects.map((project) => {
          if (project.id !== projectId) {
            return project;
          }

          return {
            ...project,
            diagrams: [
              ...project.diagrams,
              {
                id: data.id,
                name: data.name,
              },
            ],
          };
        });
      }

      setMyProjects(addDiagram);
      setSharedProjects(addDiagram);

      // Limpiar y cerrar el formulario.
      setDiagramName("");
      setCreatingDiagramFor(null);
    } catch (err) {
      setDiagramError(err.message || "No se pudo crear el diagrama.");
    } finally {
      setSavingDiagram(false);
    }
  }

  async function shareProject(event, projectId) {
    event.preventDefault();

    if (sharing) return;

    const username = collaboratorUsername.trim();

    if (!username) {
      setShareError("Debes ingresar un nombre de usuario.");
      return;
    }

    setSharing(true);
    setShareError("");
    setShareSuccess("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/projects/${projectId}/collaborators/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("access")}`,
          },
          body: JSON.stringify({
            username: username,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo compartir el proyecto.");
      }

      setShareSuccess(`Proyecto compartido con ${data.collaborator.username}.`);

      setCollaboratorUsername("");
    } catch (err) {
      setShareError(err.message || "Ocurrió un error al compartir.");
    } finally {
      setSharing(false);
    }
  }

  function renderProjects(projects, isOwner = false) {
    if (projects.length === 0) {
      return <p>No tienes proyectos en esta sección.</p>;
    }

    return projects.map((project) => (
      <div className="project-card" key={project.id}>
        <h3>{project.name}</h3>

        <p>{project.description || "Sin descripción"}</p>

        <h4>Diagramas</h4>

        {project.diagrams.length === 0 ? (
          <p>Este proyecto no tiene diagramas.</p>
        ) : (
          project.diagrams.map((diagram) => (
            <Link
              key={diagram.id}
              to={`/diagrams/${diagram.id}`}
              className="project-diagram-link"
            >
              Abrir: {diagram.name}
            </Link>
          ))
        )}

        <button
          type="button"
          className="btn-create"
          style={{ marginTop: "15px" }}
          onClick={() => {
            setCreatingDiagramFor(project.id);
            setDiagramName("");
            setDiagramError("");
          }}
          disabled={creatingDiagramFor !== null}
        >
          + Crear diagrama
        </button>

        {creatingDiagramFor === project.id && (
          <form
            className="attribute-form"
            onSubmit={(event) => createDiagram(event, project.id)}
          >
            <h3>Nuevo diagrama</h3>

            <label htmlFor={`diagram-name-${project.id}`}>
              Nombre del diagrama
            </label>

            <input
              id={`diagram-name-${project.id}`}
              type="text"
              value={diagramName}
              onChange={(event) => setDiagramName(event.target.value)}
              placeholder="Ej. Diagrama de estudiantes"
              maxLength={150}
              required
              disabled={savingDiagram}
            />

            {diagramError && <p className="modal-error">{diagramError}</p>}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setCreatingDiagramFor(null);
                  setDiagramName("");
                  setDiagramError("");
                }}
                disabled={savingDiagram}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-create"
                disabled={savingDiagram}
              >
                {savingDiagram ? "Creando..." : "Guardar diagrama"}
              </button>
            </div>
          </form>
        )}
        {isOwner && (
          <>
            <button
              type="button"
              className="btn-create"
              style={{ marginTop: "15px" }}
              onClick={() => {
                setSharingProjectId(project.id);
                setCollaboratorUsername("");
                setShareError("");
                setShareSuccess("");
              }}
              disabled={sharingProjectId !== null}
            >
              Compartir proyecto
            </button>

            {sharingProjectId === project.id && (
              <form
                className="attribute-form"
                onSubmit={(event) => shareProject(event, project.id)}
              >
                <h3>Compartir: {project.name}</h3>

                <label htmlFor={`collaborator-${project.id}`}>
                  Nombre de usuario
                </label>

                <input
                  id={`collaborator-${project.id}`}
                  type="text"
                  value={collaboratorUsername}
                  onChange={(event) =>
                    setCollaboratorUsername(event.target.value)
                  }
                  placeholder="Ej. colaborador2"
                  required
                  disabled={sharing}
                />

                {shareError && <p className="modal-error">{shareError}</p>}

                {shareSuccess && (
                  <p style={{ color: "#15803d" }}>{shareSuccess}</p>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setSharingProjectId(null);
                      setCollaboratorUsername("");
                      setShareError("");
                      setShareSuccess("");
                    }}
                    disabled={sharing}
                  >
                    Cerrar
                  </button>

                  <button
                    type="submit"
                    className="btn-create"
                    disabled={sharing}
                  >
                    {sharing ? "Compartiendo..." : "Agregar colaborador"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    ));
  }

  if (loading) {
    return <h2>Cargando proyectos...</h2>;
  }

  return (
    <div className="projects-page">
      <header className="projects-header">
        <h1>Diagramador</h1>

        <span>Usuario: {user?.username}</span>
      </header>

      {error && <p className="modal-error">{error}</p>}

      <div className="projects-container">
        <section className="projects-section">
          <h2>Mis proyectos</h2>

          <button
            type="button"
            className="btn-create"
            onClick={() => {
              setCreateError("");
              setShowCreateForm(true);
            }}
            disabled={showCreateForm}
          >
            + Crear proyecto
          </button>

          {showCreateForm && (
            <form className="attribute-form" onSubmit={createProject}>
              <h3>Nuevo proyecto</h3>

              <label htmlFor="project-name">Nombre del proyecto</label>

              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Ej. Sistema Académico"
                maxLength={150}
                required
                disabled={creating}
              />

              <label htmlFor="project-description">
                Descripción (opcional)
              </label>

              <textarea
                id="project-description"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="Descripción del proyecto"
                rows={3}
                disabled={creating}
              />

              {createError && <p className="modal-error">{createError}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError("");
                  }}
                  disabled={creating}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-create"
                  disabled={creating}
                >
                  {creating ? "Creando..." : "Guardar proyecto"}
                </button>
              </div>
            </form>
          )}

          {renderProjects(myProjects, true)}
        </section>

        <section className="projects-section">
          <h2>Proyectos compartidos</h2>

          {renderProjects(sharedProjects)}
        </section>
      </div>
    </div>
  );
}

export default Projects;
