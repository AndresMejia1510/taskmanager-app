import { useState } from 'react';
import './App.css';
import Auth from './components/Auth';
import TaskBoard from './components/TaskBoard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <div className="app-shell">
      {isAuthenticated ? (
        <TaskBoard onLogout={handleLogout} />
      ) : (
        <Auth onLoginSuccess={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}

export default App;