import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const links = [
  { to: '/admin/skills', label: 'Skills' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/horarios-dia', label: 'Horarios día' },
  { to: '/admin/crear-borrador', label: 'Crear borrador' },
  { to: '/admin/publicar-semana', label: 'Publicar semana' },
  { to: '/admin/editar-semana', label: 'Editar semana' },
  { to: '/admin/dotacion', label: 'Dotación' }
];

export default function AdminLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-slate-900 p-4 text-white">
        <div className="mb-4 text-lg font-semibold">Admin: {user?.name}</div>
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `block rounded px-3 py-2 ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => logout()} className="mt-6 w-full rounded bg-red-500 px-3 py-2">Logout</button>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
