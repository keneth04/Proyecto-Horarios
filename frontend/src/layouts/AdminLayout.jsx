import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const links = [
  { to: '/admin/skills', label: 'Habilidades' },
  { to: '/admin/users', label: 'Agentes' },
  { to: '/admin/horarios-dia', label: 'Horarios por día' },
  { to: '/admin/crear-borrador', label: 'Crear borrador' },
  { to: '/admin/publicar-semana', label: 'Publicar semana' },
  { to: '/admin/editar-semana', label: 'Editar semana' },
  { to: '/admin/dotacion', label: 'Dotación' },
  { to: '/admin/reporte-horas', label: 'Reporte de horas' }
];

export default function AdminLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#f8f9fb]">
      <aside className="flex w-72 flex-col bg-[#835da2] p-6 text-white">
        <div className="mb-8 flex items-center gap-3 border-b border-white/20 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-xl font-semibold">ñ</div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/75">Logo principal</p>
            <p className="text-sm font-semibold">Administrador: {user?.name}</p>
          </div>
        </div>
        <nav className="space-y-1.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white text-[#835da2] shadow-sm' : 'text-white/90 hover:bg-white/15 hover:text-white'}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => logout()} className="btn-danger mt-auto w-full">Cerrar Sesión</button>
      </aside>
      <main className="flex-1 p-6 lg:p-8">
        <header className="card mb-6 flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#835da2] text-sm font-semibold text-white">ñ</div>
            <div>
              <h1 className="text-lg font-semibold text-[#1f2937]">Panel de administración</h1>
              <p className="text-sm text-[#4a4a4a]">Gestiona horarios, agentes y habilidades.</p>
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
