import { Navigate, Route, Routes } from "react-router-dom";

import DiagramCanvas from "./components/DiagramCanvas";
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Projects from "./components/Projects";

import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route
        path="/diagrams/:id"
        element={
          <ProtectedRoute>
            <DiagramCanvas />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
