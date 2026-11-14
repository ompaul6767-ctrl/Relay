import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import { Layout } from './components/layout/Layout';

import { LandingPage } from './pages/LandingPage';
import { CasesDashboard } from './pages/CasesDashboard';
import { ConnectPage } from './pages/ConnectPage';
import { ReconstructPage } from './pages/ReconstructPage';
import { ReviewPage } from './pages/ReviewPage';
import { HandoverPage } from './pages/HandoverPage';
import { AuditPage } from './pages/AuditPage';
import { LimitationsPage } from './pages/LimitationsPage';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CaseProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/cases" element={<CasesDashboard />} />
                <Route path="/connect" element={<ConnectPage />} />
                <Route path="/reconstruct" element={<ReconstructPage />} />
                <Route path="/verify" element={<ReconstructPage />} />
                <Route path="/review" element={<ReviewPage />} />
                <Route path="/handover" element={<HandoverPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/limitations" element={<LimitationsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </CaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
