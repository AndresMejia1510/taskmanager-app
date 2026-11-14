import { useState } from 'react';
import api from '../services/api';
import './Auth.css';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const response = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', response.data.token);
        onLoginSuccess();
      } else {
        await api.post('/auth/register', { username, email, password });
        setMessage('Tu cuenta está lista. Ahora puedes iniciar sesión.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      const responseMessage = err.response?.data;
      const message = typeof responseMessage === 'string'
        ? responseMessage
        : responseMessage?.detail || responseMessage?.message;
      setError(message || 'Ocurrió un error. Verifica tus datos e inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLogin((currentMode) => !currentMode);
    setError('');
    setMessage('');
  };

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <a className="brand auth-brand" href="/" aria-label="Taskflow">
          <span className="brand-mark" aria-hidden="true">t</span>
          <span>taskflow</span>
        </a>
        <div className="auth-intro-copy">
          <span className="intro-label">MENOS RUIDO. MÁS AVANCE.</span>
          <h1>Haz espacio<br />para lo que <span>importa.</span></h1>
          <p>Organiza tus pendientes, celebra tu progreso y sigue adelante a tu ritmo.</p>
        </div>
        <div className="intro-note">
          <span className="intro-note-mark" aria-hidden="true">✓</span>
          <span>Un paso pequeño también es progreso.</span>
        </div>
        <span className="intro-orbit orbit-one" aria-hidden="true" />
        <span className="intro-orbit orbit-two" aria-hidden="true" />
      </section>

      <section className="auth-content" aria-labelledby="auth-title">
        <div className="auth-card">
          <div className="auth-card-heading">
            <p className="eyebrow">{isLogin ? 'QUÉ BUENO VERTE' : 'EMPIEZA HOY'}</p>
            <h2 id="auth-title">{isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}</h2>
            <p>
              {isLogin
                ? 'Inicia sesión y continúa donde te quedaste.'
                : 'Solo necesitas unos datos para comenzar.'}
            </p>
          </div>

          {error && <div className="auth-message message-error" role="alert">{error}</div>}
          {message && <div className="auth-message message-success" role="status">{message}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="username">Nombre de usuario</label>
            <input
              id="username"
              type="text"
              placeholder="Tu nombre de usuario"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />

            {!isLogin && (
              <>
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </>
            )}

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="Escribe tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
            />

            <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Un momento...'
                : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="auth-switch">
            <span>{isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'}</span>
            <button type="button" onClick={switchMode}>
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </div>
        </div>
        <p className="auth-privacy">Tus tareas son tuyas. Tu espacio, a tu manera.</p>
      </section>
    </main>
  );
}
