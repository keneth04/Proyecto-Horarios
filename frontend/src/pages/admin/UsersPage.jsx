import { useEffect, useMemo, useState } from 'react';
import { SkillsApi, UsersApi } from '../../api/endpoints';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';
import FancyCheckbox from '../../components/FancyCheckbox';
import StatusToggle from '../../components/StatusToggle';

const EMPTY_CREATE_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'agente',
  campaign: '',
  allowedSkills: []
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'agente', campaign: '', allowedSkills: [] });
  const { push } = useToast();

  const load = async () => {
    try {
      const [usersRes, skillsRes] = await Promise.all([UsersApi.list(), SkillsApi.list()]);
      setUsers(usersRes.data.body);
      setSkills(skillsRes.data.body.filter((s) => s.status === 'active' && s.type !== 'break'));
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await UsersApi.create(form);
      push('Usuario creado');
      setForm(EMPTY_CREATE_FORM);
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const toggleSkill = (id) => {
    setForm((prev) => ({
      ...prev,
      allowedSkills: prev.allowedSkills.includes(id)
        ? prev.allowedSkills.filter((sid) => sid !== id)
        : [...prev.allowedSkills, id]
    }));
  };

  const toggleEditSkill = (id) => {
    setEditForm((prev) => ({
      ...prev,
      allowedSkills: prev.allowedSkills.includes(id)
        ? prev.allowedSkills.filter((sid) => sid !== id)
        : [...prev.allowedSkills, id]
    }));
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'agente',
      campaign: user.campaign || '',
      allowedSkills: Array.isArray(user.allowedSkills)
        ? user.allowedSkills.map((skillId) => String(skillId))
        : []
    });
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingUser(null);
    setEditForm({ name: '', email: '', role: 'agente', campaign: '', allowedSkills: [] });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingUser?._id) return;

    try {
      await UsersApi.update(editingUser._id, editForm);
      push('Usuario actualizado');
      closeEdit();
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const toggleStatus = async (user) => {
    try {
      await UsersApi.setStatus(user._id, user.status === 'active' ? 'inactive' : 'active');
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const filteredUsers = useMemo(() => {
    const normalizedNameFilter = nameFilter.trim().toLowerCase();

    return users.filter((user) => {
      const matchesName = !normalizedNameFilter
        || String(user.name || '').toLowerCase().includes(normalizedNameFilter);

      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      return matchesName && matchesStatus;
    });
  }, [users, nameFilter, statusFilter]);

  const skillsById = useMemo(() => {
    return skills.reduce((acc, skill) => {
      acc[String(skill._id)] = skill;
      return acc;
    }, {});
  }, [skills]);

  const renderAllowedSkills = (user) => {
    const allowedSkills = Array.isArray(user.allowedSkills) ? user.allowedSkills : [];

    if (allowedSkills.length === 0) {
      return <span className="text-slate-500">Sin skills asignadas</span>;
    }

    const resolvedSkills = allowedSkills
      .map((skillId) => skillsById[String(skillId)])
      .filter(Boolean);

    if (resolvedSkills.length === 0) {
      return <span className="text-slate-500">Sin skills asignadas</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {resolvedSkills.map((skill) => (
          <span
            key={skill._id}
            className="rounded-full border border-[#e0d7ec] bg-[#faf8fd] px-2.5 py-1 text-xs font-medium text-[#4f4164]"
          >
            {skill.name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Usuarios</h2>
      <form onSubmit={create} className="card space-y-5 p-6">
        <div>
          <p className="section-subtitle">Filtros</p>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Buscar por nombre"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        <div>
          <p className="section-subtitle">Crear usuario</p>
          <div className="grid gap-3 lg:grid-cols-5">
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Contraseña" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="agente">agente</option><option value="admin">admin</option></select>
            <input placeholder="Campaña" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <FancyCheckbox
              key={skill._id}
              id={`create-skill-${skill._id}`}
              checked={form.allowedSkills.includes(skill._id)}
              onChange={() => toggleSkill(skill._id)}
              label={skill.name}
            />
          ))}
        </div>
        <button className="btn-primary">Crear usuario</button>
      </form>

      <Table
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'email', label: 'Correo' },
          { key: 'role', label: 'Rol' },
          { key: 'campaign', label: 'Campaña', render: (row) => row.campaign || 'Sin campaña' },
          { key: 'allowedSkills', label: 'Habilidades disponibles', render: renderAllowedSkills },
          {
            key: 'status',
            label: 'Estado',
            render: (row) => (
              <StatusToggle
                active={row.status === 'active'}
                onToggle={() => toggleStatus(row)}
                label={`Cambiar estado de ${row.name}`}
              />
            )
          },
          {
            key: 'actions',
            label: 'Acciones',
            render: (row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="btn-secondary px-3 py-1.5">Editar</button>
              </div>
            )
          }
        ]}
        rows={filteredUsers}
      />

      <Modal open={isEditOpen} title="Editar usuario" onClose={closeEdit}>
        <form onSubmit={submitEdit} className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              placeholder="Nombre"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <input
              placeholder="Correo"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            >
              <option value="agente">agente</option>
              <option value="admin">admin</option>
            </select>
            <input
              placeholder="Campaña"
              value={editForm.campaign}
              onChange={(e) => setEditForm({ ...editForm, campaign: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <FancyCheckbox
                key={skill._id}
                id={`edit-skill-${skill._id}`}
                checked={editForm.allowedSkills.includes(skill._id)}
                onChange={() => toggleEditSkill(skill._id)}
                label={skill.name}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeEdit} className="btn-secondary">Cancelar</button>
            <button className="btn-primary">Guardar cambios</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
