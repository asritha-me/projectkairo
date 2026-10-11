import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/pages/AuthScreen';
import { AppLayout } from '@/components/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { HealthProfile } from '@/pages/HealthProfile';
import { MedicalRecords } from '@/pages/MedicalRecords';
import { AiCopilot } from '@/pages/AiCopilot';
import { HealthTimeline } from '@/pages/HealthTimeline';
import { Appointments } from '@/pages/Appointments';
import { Settings } from '@/pages/Settings';
import { FullPageLoader } from '@/components/Loading';

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) return <FullPageLoader label="Loading KAIRO..." />;
  if (!session) return <AuthScreen />;

  return (
    <AppLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<HealthProfile />} />
        <Route path="records" element={<MedicalRecords />} />
        <Route path="records/:id" element={<MedicalRecords />} />
        <Route path="copilot" element={<AiCopilot />} />
        <Route path="timeline" element={<HealthTimeline />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/app/*" element={<ProtectedRoutes />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
