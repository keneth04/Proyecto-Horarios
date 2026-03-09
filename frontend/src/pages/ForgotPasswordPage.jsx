import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/helpers';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { push } = useToast();

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      const { data } = await AuthApi.forgotPassword({ email });
      setSuccessMessage(data.message);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded bg-white p-5 shadow">
        <h1 className="mb-2 text-xl font-semibold">Recuperar contraseña</h1>
        <p className="mb-4 text-sm text-slate-600">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>

        <label className="mb-2 block text-sm">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
          placeholder="correo@empresa.com"
          required
        />

        <button disabled={loading} className="mb-3 w-full rounded bg-slate-900 px-3 py-2 text-white">
          {loading ? <Spinner label="Enviando..." /> : 'Enviar enlace'}
        </button>

        {successMessage ? <p className="mb-3 text-sm text-green-700">{successMessage}</p> : null}

        <Link to="/login" className="text-sm text-blue-600 hover:underline">
          Volver al inicio de sesión
        </Link>
      </form>
    </div>
  );
}
