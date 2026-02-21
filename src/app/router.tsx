import { Navigate, Route, Routes } from 'react-router-dom';
import { SettingsPage } from '../pages/SettingsPage';
import { TodayPage } from '../pages/TodayPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<TodayPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
