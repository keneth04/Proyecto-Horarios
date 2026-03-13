import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AgentLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <header className="border-b border-[#eef0f4] bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#835da2] text-sm font-semibold text-white">ñ</div>
            <h1 className="text-lg font-semibold text-[#1f2937]">Mi horario - {user?.name}</h1>
          </div>
          <button onClick={() => logout()} className="btn-danger">Cerrar Sesión</button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
