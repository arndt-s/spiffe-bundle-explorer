import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { BundleViewPage } from './pages/BundleViewPage';
import './App.css';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/bundle" element={<BundleViewPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
