import { Routes, Route, HashRouter } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { BundleViewPage } from './pages/BundleViewPage';
import './App.css';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/bundle" element={<BundleViewPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
