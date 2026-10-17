import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { TerminologyProvider } from "@/context/TerminologyContext";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CommandPalette from "@/components/CommandPalette";

// ── Core V1 Pages ──────────────────────────────────────────────
import LoginPage from "@/pages/LoginPage";
import LandingPage from "@/pages/LandingPage";
import TimetablePage from "@/pages/TimetablePage";
import TeacherSetupPage from "@/pages/TeacherSetupPage";
import RoomManagementPage from "@/pages/RoomManagementPage";
import SubjectsPage from "@/pages/SubjectsPage";
import DivisionsPage from "@/pages/DivisionsPage";
import SemestersPage from "@/pages/SemestersPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import TimetableSchemasPage from "@/pages/TimetableSchemasPage";
import TimetableExportPage from "@/pages/TimetableExportPage";

export default function App() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("tg_user");
    setIsAuthenticated(!!user);
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogin = (_email: string) => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem("tg_user");
    localStorage.removeItem("tg_token");
    setIsAuthenticated(false);
  };

  if (isCheckingAuth) return null;

  // Redirect /landing to / so landing page opens directly on localhost:3000
  if (location.pathname === "/landing") {
    return <Navigate to="/" replace />;
  }

  // Always show full-screen LandingPage directly on localhost:3000 (root /)
  if (location.pathname === "/") {
    return <LandingPage />;
  }

  // If not logged in and requesting auth-protected app routes:
  if (!isAuthenticated) {
    if (location.pathname === "/login") {
      return <LoginPage onLogin={handleLogin} />;
    }
    // Default to LandingPage for visitors
    return <LandingPage />;
  }

  return (
    <TerminologyProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col w-full overflow-x-hidden">
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
        />
        <div
          className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden"
          style={{
            paddingLeft: sidebarCollapsed ? "72px" : "264px",
            transition: "padding-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <TopBar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
          <main className="flex-1 min-w-0 p-3 lg:p-4 max-w-[1920px] w-full mx-auto overflow-y-auto overflow-x-hidden">
            <Routes>
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/timetable" replace />} />

              {/* Core pages */}
              <Route path="/timetable" element={<TimetablePage />} />
              <Route path="/schemas"   element={<TimetableSchemasPage />} />
              <Route path="/export"    element={<TimetableExportPage />} />
              <Route path="/timetable-export" element={<TimetableExportPage />} />
              <Route path="/faculty"   element={<TeacherSetupPage />} />
              <Route path="/rooms"     element={<RoomManagementPage />} />
              <Route path="/subjects"  element={<SubjectsPage />} />
              <Route path="/divisions" element={<DivisionsPage />} />
              <Route path="/semesters" element={<SemestersPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />

              {/* Short aliases */}
              <Route path="/timetable-schemas" element={<Navigate to="/schemas" replace />} />
              <Route path="/slot-templates"    element={<Navigate to="/schemas" replace />} />
              <Route path="/teachers"  element={<Navigate to="/faculty"    replace />} />
              <Route path="/classes"   element={<Navigate to="/divisions"  replace />} />
              <Route path="/division"  element={<Navigate to="/divisions"  replace />} />
              <Route path="/sem"       element={<Navigate to="/semesters"  replace />} />
              <Route path="/semester"  element={<Navigate to="/semesters"  replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/timetable" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </TerminologyProvider>
  );
}
