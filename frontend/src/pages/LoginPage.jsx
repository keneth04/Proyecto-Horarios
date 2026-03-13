import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/helpers';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockUntil, setLockUntil] = useState(null);
  const [now, setNow] = useState(Date.now());
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!lockUntil) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [lockUntil]);

  useEffect(() => {
    if (lockUntil && now >= lockUntil) {
      setLockUntil(null);
      setErrorMessage('');
    }
  }, [lockUntil, now]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const { data } = await AuthApi.login({ email, password });
      login(data.body.token, data.body.user);
      navigate(data.body.user.role === 'admin' ? '/admin' : '/agent', { replace: true });
    } catch (error) {
      const message = getErrorMessage(error);
      const lockMatch = message.match(/Cuenta bloqueada, intenta nuevamente en (\d+) minutos/i);
      if (lockMatch) {
        const lockMinutes = Number(lockMatch[1]);
        setLockUntil(Date.now() + lockMinutes * 60 * 1000);
      }
      setErrorMessage(message);
      push(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = Boolean(lockUntil && now < lockUntil);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-[#eef0f4] bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#835da2] text-lg font-semibold text-white">ñ</div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#4a4a4a]">Logo principal</p>
            <h1 className="text-xl font-semibold text-[#1f2937]">Inicio de Sesión</h1>
          </div>
        </div>

        <label className="mb-2 block text-sm font-medium text-[#4a4a4a]">Correo</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 w-full" />

        <label className="mb-2 block text-sm font-medium text-[#4a4a4a]">Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-2 w-full" />

        <div className="mb-4 text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-[#835da2] hover:text-[#724d91] hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

          {errorMessage ? (
          <p className="mb-4 rounded-lg border border-[#e52e2e]/20 bg-[#e52e2e]/10 px-3 py-2 text-sm text-[#b42323]">
            {errorMessage}
          </p>
        ) : null}
        
        <button disabled={loading || isLocked} className="btn-primary w-full">
          {loading ? <Spinner label="Ingresando..." /> : 'Iniciar'}
        </button>
      </form>
    </div>
  );
}
