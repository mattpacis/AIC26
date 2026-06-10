import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './pages/Login';
import { OAuthCallback } from './pages/OAuthCallback';
import { StaffAppointments } from './pages/StaffAppointments';
import { StaffDashboard } from './pages/StaffDashboard';
import { StaffAnalytics } from './pages/StaffAnalytics';
import { StaffKnowledgeBase } from './pages/StaffKnowledgeBase';
import { StaffStudents } from './pages/StaffStudents';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentAppointments } from './pages/StudentAppointments';
import { StudentHolds } from './pages/StudentHolds';
import { StudentTicketDetail } from './pages/StudentTicketDetail';
import { StudentTickets } from './pages/StudentTickets';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/oauth-callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/appointments" element={<StudentAppointments />} />
        <Route path="/holds" element={<StudentHolds />} />
        <Route path="/tickets" element={<StudentTickets />} />
        <Route path="/tickets/:ticketId" element={<StudentTicketDetail />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/staff/appointments" element={<StaffAppointments />} />
        <Route path="/staff/students" element={<StaffStudents />} />
        <Route path="/staff/knowledge-base" element={<StaffKnowledgeBase />} />
        <Route path="/staff/analytics" element={<StaffAnalytics />} />
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
