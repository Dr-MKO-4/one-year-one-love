import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './lib/auth';
import { MusicProvider } from './lib/music';
import { Layout } from './components/Layout';
import { Loader } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { TimelinePage } from './pages/TimelinePage';
import { MessagesPage } from './pages/MessagesPage';
import { GamesHome } from './pages/games/GamesHome';
import { GameIntro } from './pages/games/GameIntro';
import { GamePlay } from './pages/games/GamePlay';
import { GamesDashboard } from './pages/games/GamesDashboard';
import { GameHistory } from './pages/games/GameHistory';

const AdminPage = lazy(() => import('./pages/AdminPage'));

export function App() {
  const { player, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="Ouverture de notre espace…" />;

  return (
    <MusicProvider enabled={!!player} me={player}>
      {!player ? (
        <LoginPage />
      ) : (
        <Layout me={player}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname.split('/').slice(0, 3).join('/')}>
              <Route path="/" element={<HomePage />} />
              <Route path="/frise" element={<TimelinePage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/jeux" element={<GamesHome />} />
              <Route path="/jeux/tableau-de-bord" element={<GamesDashboard />} />
              <Route path="/jeux/historique" element={<GameHistory />} />
              <Route path="/jeux/:gameId" element={<GameIntro />} />
              <Route path="/partie/:sessionId" element={<GamePlay />} />
              <Route
                path="/configuration/*"
                element={
                  <Suspense fallback={<Loader />}>
                    <AdminPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Layout>
      )}
    </MusicProvider>
  );
}
