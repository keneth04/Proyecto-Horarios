import { useState } from 'react';
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
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

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
      setErrorMessage(message);
      push(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded bg-white p-5 shadow">
        <h1 className="mb-4 text-xl font-semibold">Inicio de Sesión</h1>
        <label className="mb-2 block text-sm">Correo</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3 w-full rounded border px-3 py-2" />
        <label className="mb-2 block text-sm">Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-2 w-full rounded border px-3 py-2" />

        <div className="mb-4 text-right">
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {errorMessage ? <p className="mb-3 text-sm text-red-600">{errorMessage}</p> : null}

        <button disabled={loading} className="w-full rounded bg-slate-900 px-3 py-2 text-white">
          {loading ? <Spinner label="Ingresando..." /> : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
