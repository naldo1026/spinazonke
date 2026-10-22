import { AnimatePresence, motion } from 'framer-motion';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Ritual } from './pages/ritual/Ritual';
import { Bank } from './pages/Bank';
import { History } from './pages/History';
import { Shame } from './pages/Shame';
import { Settings } from './pages/Settings';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={location.pathname}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/spin" element={<Ritual />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/history" element={<History />} />
          <Route path="/shame" element={<Shame />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </HashRouter>
  );
}
