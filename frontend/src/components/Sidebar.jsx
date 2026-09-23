function Sidebar() {

  function onDragStart(event) {
    event.dataTransfer.setData(
      'application/reactflow',
      'classNode'
    )

    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Elementos</h3>
      </div>

      <div className="sidebar-content">
        <p className="sidebar-section-title">
          Diagrama de clases
        </p>

        <div
          className="sidebar-class"
          draggable
          onDragStart={onDragStart}
        >
          <div className="sidebar-class-name">
            Clase
          </div>

          <div className="sidebar-class-attributes">
            <div>id : BIGINT</div>
            <div>atributo : VARCHAR</div>
          </div>
        </div>

        <p className="sidebar-help">
          Arrastra una clase al lienzo para crearla.
        </p>
      </div>
    </aside>
  )
}

export default Sidebar