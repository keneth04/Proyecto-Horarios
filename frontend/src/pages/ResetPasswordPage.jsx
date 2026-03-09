import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/helpers';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { push } = useToast();

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      push('El enlace no es válido: falta el token de recuperación', 'error');
      return;
    }

    if (password.length < 8) {
      push('La nueva contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }

    if (password !== confirmPassword) {
      push('La confirmación no coincide con la nueva contraseña', 'error');
      return;
    }

    setLoading(true);
    try {
      await AuthApi.resetPassword({ token, newPassword: password });
      setSuccess(true);
      push('Contraseña actualizada correctamente', 'info');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded bg-white p-5 shadow">
        <h1 className="mb-2 text-xl font-semibold">Restablecer contraseña</h1>
        <p className="mb-4 text-sm text-slate-600">Define una contraseña nueva para tu cuenta.</p>

        <label className="mb-2 block text-sm">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full rounded border px-3 py-2"
          required
        />

        <label className="mb-2 block text-sm">Confirmar contraseña</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
          required
        />

        <button disabled={loading || success} className="mb-3 w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-70">
          {loading ? <Spinner label="Guardando..." /> : 'Guardar nueva contraseña'}
        </button>

        {success ? <p className="mb-3 text-sm text-green-700">Tu contraseña fue actualizada. Ya puedes iniciar sesión.</p> : null}

        <Link to="/login" className="text-sm text-blue-600 hover:underline">
          Ir al inicio de sesión
        </Link>
      </form>
    </div>
  );
}
