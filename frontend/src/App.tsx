import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './pages/Login';
import { OAuthCallback } from './pages/OAuthCallback';
import { StaffAppointments } from './pages/StaffAppointments';
import { StaffDashboard } from './pages/StaffDashboard';
import { StaffAnalytics } from './pages/StaffAnalytics';
import { StaffDirectory } from './pages/StaffDirectory';
import { StaffStudents } from './pages/StaffStudents';
import { StudentQuickLinks } from './pages/StudentQuickLinks';
import { StudentSettings } from './pages/StudentSettings';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentAppointments } from './pages/StudentAppointments';
import { StudentTicketDetail } from './pages/StudentTicketDetail';
import { StudentTickets } from './pages/StudentTickets';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { ToastProvider } from './components/ToastProvider';
import './App.css';
import './styles/campus360-polish.css';
import './styles/campus360-motion.css';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <OfflineBanner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/login/oauth-callback" element={<OAuthCallback />} />
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/appointments" element={<StudentAppointments />} />
            <Route path="/quick-links" element={<StudentQuickLinks />} />
            <Route path="/settings" element={<StudentSettings />} />
            <Route path="/holds" element={<Navigate to="/dashboard" replace />} />
            <Route path="/tickets" element={<StudentTickets />} />
            <Route path="/tickets/:ticketId" element={<StudentTicketDetail />} />
            <Route path="/staff-dashboard" element={<StaffDashboard />} />
            <Route path="/staff/appointments" element={<StaffAppointments />} />
            <Route path="/staff/students" element={<StaffStudents />} />
            <Route path="/staff/directory" element={<StaffDirectory />} />
            <Route path="/staff/knowledge-base" element={<Navigate to="/staff-dashboard" replace />} />
            <Route path="/staff/analytics" element={<StaffAnalytics />} />
            <Route path="/home" element={<Navigate to="/dashboard" replace />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
