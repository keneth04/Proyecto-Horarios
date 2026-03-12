import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AgentLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow">
        <h1 className="text-lg font-semibold">Mi horario - {user?.name}</h1>
        <button onClick={() => logout()} className="rounded bg-red-500 px-3 py-2 text-white">Cerrar Sesión</button>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
