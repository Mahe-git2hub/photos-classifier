import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PeoplePage from './pages/PeoplePage';
import PersonPage from './pages/PersonPage';
import AnnotatePage from './pages/AnnotatePage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/person/:id" element={<PersonPage />} />
          <Route path="/annotate" element={<AnnotatePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
