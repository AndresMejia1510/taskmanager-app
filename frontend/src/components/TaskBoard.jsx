import { useEffect, useState } from 'react';
import api from '../services/api';
import './TaskBoard.css';

const statusOptions = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROGRESO', label: 'En progreso' },
  { value: 'COMPLETADA', label: 'Completada' },
];

const statusFilters = [
  { value: 'TODAS', label: 'Todas' },
  ...statusOptions,
];

const priorityOptions = [
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
];

const formatDueDate = (dueDate) => {
  if (!dueDate) return null;
  const [year, month, day] = dueDate.split('-').map(Number);
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
};

export default function TaskBoard({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('MEDIA');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [priorityFilter, setPriorityFilter] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIA',
  });
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleRequestError = (err, fallback) => {
    if (err.response?.status === 401) {
      onLogout();
      return;
    }
    const responseMessage = err.response?.data;
    setError(typeof responseMessage === 'string' ? responseMessage : fallback);
  };

  useEffect(() => {
    let active = true;
    api.get('/tasks')
      .then((response) => {
        if (active) setTasks(response.data);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 401) {
          onLogout();
          return;
        }
        setError('No se pudieron cargar las tareas. Inténtalo de nuevo.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onLogout]);

  const completedCount = tasks.filter((task) => task.status === 'COMPLETADA').length;
  const pendingCount = tasks.filter((task) => (task.status ?? 'PENDIENTE') === 'PENDIENTE').length;
  const inProgressCount = tasks.filter((task) => task.status === 'EN_PROGRESO').length;
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === 'TODAS'
      || (task.status ?? 'PENDIENTE') === statusFilter;
    const matchesPriority = priorityFilter === 'TODAS' || task.priority === priorityFilter;
    const searchableText = `${task.title} ${task.description ?? ''}`.toLocaleLowerCase();
    return matchesStatus
      && matchesPriority
      && (!normalizedSearch || searchableText.includes(normalizedSearch));
  });
  const taskGroups = statusOptions
    .filter((status) => statusFilter === 'TODAS' || status.value === statusFilter)
    .map((status) => ({
      ...status,
      tasks: filteredTasks.filter((task) => (task.status ?? 'PENDIENTE') === status.value),
    }))
    .filter((group) => group.tasks.length > 0);

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    setError('');
    try {
      const response = await api.post('/tasks', {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
        priority,
      });
      setTasks((currentTasks) => [response.data, ...currentTasks]);
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('MEDIA');
    } catch (err) {
      handleRequestError(err, 'No se pudo crear la tarea. Inténtalo de nuevo.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetStatus = async (task, status) => {
    if (task.status === status || busyTaskId === task.id) return;

    setBusyTaskId(task.id);
    setError('');
    try {
      const response = await api.patch(`/tasks/${task.id}/status`, { status });
      setTasks((currentTasks) => currentTasks.map((currentTask) => (
        currentTask.id === task.id ? response.data : currentTask
      )));
    } catch (err) {
      handleRequestError(err, 'No se pudo actualizar el estado. Inténtalo de nuevo.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleToggleTask = (task) => {
    const status = task.status === 'COMPLETADA' ? 'PENDIENTE' : 'COMPLETADA';
    handleSetStatus(task, status);
  };

  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ?? '',
      priority: task.priority ?? 'MEDIA',
    });
    setError('');
  };

  const handleSaveEdit = async (event, task) => {
    event.preventDefault();
    if (!editForm.title.trim() || busyTaskId === task.id) return;

    setBusyTaskId(task.id);
    setError('');
    try {
      const response = await api.put(`/tasks/${task.id}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        dueDate: editForm.dueDate || null,
        priority: editForm.priority,
      });
      setTasks((currentTasks) => currentTasks.map((currentTask) => (
        currentTask.id === task.id ? response.data : currentTask
      )));
      setEditingTaskId(null);
    } catch (err) {
      handleRequestError(err, 'No se pudo guardar la tarea. Inténtalo de nuevo.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`¿Quieres eliminar "${task.title}"?`)) return;

    setBusyTaskId(task.id);
    setError('');
    try {
      await api.delete(`/tasks/${task.id}`);
      setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== task.id));
    } catch (err) {
      handleRequestError(err, 'No se pudo eliminar la tarea. Inténtalo de nuevo.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const noResults = normalizedSearch || priorityFilter !== 'TODAS';
  const emptyTitle = noResults
    ? 'No encontramos tareas'
    : statusFilter === 'TODAS'
      ? 'Tu lista empieza aquí'
      : 'No hay tareas en este estado';
  const emptyDescription = noResults
    ? 'Prueba con otro texto o cambia los filtros.'
    : statusFilter === 'TODAS'
      ? 'Añade una tarea y convierte tus planes en progreso.'
      : 'Puedes cambiar el estado desde el menú de cada tarea.';

  return (
    <div className="task-page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Taskflow, inicio">
          <span className="brand-mark" aria-hidden="true">t</span>
          <span>taskflow</span>
        </a>
        <div className="topbar-actions">
          <span className="workspace-label">
            <span className="online-dot" aria-hidden="true" />
            Mi espacio
          </span>
          <button className="button button-quiet logout-button" type="button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">TU ESPACIO DE TRABAJO</p>
            <h1>Mis tareas<span className="heading-period">.</span></h1>
            <p className="dashboard-subtitle">Un paso a la vez. Vas por buen camino.</p>
          </div>
          <div className="progress-card">
            <span className="progress-icon" aria-hidden="true">↗</span>
            <div>
              <strong>{completedCount} de {tasks.length}</strong>
              <span>tareas completadas</span>
            </div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Resumen de tareas">
          <article className="stat-card stat-card-total">
            <span className="stat-icon" aria-hidden="true">01</span>
            <div>
              <span className="stat-label">Total de tareas</span>
              <strong>{tasks.length}</strong>
            </div>
          </article>
          <article className="stat-card stat-card-pending">
            <span className="stat-icon" aria-hidden="true">02</span>
            <div>
              <span className="stat-label">Pendientes</span>
              <strong>{pendingCount}</strong>
            </div>
          </article>
          <article className="stat-card stat-card-progress">
            <span className="stat-icon" aria-hidden="true">03</span>
            <div>
              <span className="stat-label">En progreso</span>
              <strong>{inProgressCount}</strong>
            </div>
          </article>
          <article className="stat-card stat-card-done">
            <span className="stat-icon" aria-hidden="true">04</span>
            <div>
              <span className="stat-label">Completadas</span>
              <strong>{completedCount}</strong>
            </div>
          </article>
        </section>

        {error && <div className="notice notice-error" role="alert">{error}</div>}

        <div className="task-workspace">
          <aside className="create-card">
            <div className="card-kicker">
              <span className="create-icon" aria-hidden="true">+</span>
              <span>NUEVA TAREA</span>
            </div>
            <h2>¿Qué tienes en mente?</h2>
            <p className="create-hint">Anota tu siguiente paso y empieza a avanzar.</p>

            <form className="task-form" onSubmit={handleCreateTask}>
              <label htmlFor="task-title">Título</label>
              <input
                id="task-title"
                type="text"
                placeholder="Ej. Preparar presentación"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={255}
                required
              />

              <label htmlFor="task-description">
                Descripción <span className="optional-label">Opcional</span>
              </label>
              <textarea
                id="task-description"
                placeholder="Agrega algún detalle que te ayude..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />

              <label htmlFor="task-due-date">
                Fecha de vencimiento <span className="optional-label">Opcional</span>
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />

              <label htmlFor="task-priority">Prioridad</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button className="button button-primary create-button" type="submit" disabled={isCreating}>
                <span aria-hidden="true">+</span>
                {isCreating ? 'Agregando...' : 'Agregar tarea'}
              </button>
            </form>
            <p className="create-footnote">Cada gran objetivo empieza con una pequeña acción.</p>
          </aside>

          <section className="task-list-card" aria-labelledby="task-list-title">
            <div className="task-list-heading">
              <div>
                <p className="eyebrow">ORGANÍZATE A TU MANERA</p>
                <h2 id="task-list-title">Tu lista</h2>
              </div>
              <span className="task-count">{tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}</span>
            </div>

            <div className="task-search">
              <label className="sr-only" htmlFor="task-search-input">Buscar tareas por título o descripción</label>
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                id="task-search-input"
                type="search"
                placeholder="Buscar por título o descripción"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="filter-toolbar">
              <div className="filter-row" role="group" aria-label="Filtrar tareas por estado">
                {statusFilters.map((item) => {
                  const count = item.value === 'PENDIENTE'
                    ? pendingCount
                    : item.value === 'EN_PROGRESO'
                      ? inProgressCount
                      : item.value === 'COMPLETADA' ? completedCount : 0;
                  return (
                    <button
                      className={`filter-button ${statusFilter === item.value ? 'is-selected' : ''}`}
                      key={item.value}
                      type="button"
                      aria-pressed={statusFilter === item.value}
                      onClick={() => setStatusFilter(item.value)}
                    >
                      {item.label}
                      {item.value !== 'TODAS' && count > 0 && (
                        <span className="filter-count">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <label className="priority-filter">
                <span>Prioridad</span>
                <select
                  aria-label="Filtrar por prioridad"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                >
                  <option value="TODAS">Todas</option>
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {isLoading ? (
              <div className="list-loading" role="status">Cargando tus tareas...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">{noResults ? '⌕' : '✦'}</span>
                <h3>{emptyTitle}</h3>
                <p>{emptyDescription}</p>
              </div>
            ) : (
              <div className="task-groups">
                {taskGroups.map((group) => (
                  <section className="task-group" key={group.value} aria-label={`${group.label}: ${group.tasks.length}`}>
                    <div className="task-group-heading">
                      <h3>{group.label}</h3>
                      <span>{group.tasks.length}</span>
                    </div>
                    <ul className="task-list">
                      {group.tasks.map((task) => {
                        const taskStatus = task.status ?? 'PENDIENTE';
                        const isCompleted = taskStatus === 'COMPLETADA';
                        const isBusy = busyTaskId === task.id;
                        const isEditing = editingTaskId === task.id;
                        const priorityLabel = priorityOptions.find((option) => option.value === task.priority)?.label
                          ?? 'Media';

                        return (
                          <li
                            className={`task-item ${isCompleted ? 'task-item-completed' : ''}`}
                            key={task.id}
                          >
                            {isEditing ? (
                              <form className="task-edit-form" onSubmit={(event) => handleSaveEdit(event, task)}>
                                <label htmlFor={`edit-title-${task.id}`}>Título</label>
                                <input
                                  id={`edit-title-${task.id}`}
                                  type="text"
                                  value={editForm.title}
                                  onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                                  maxLength={255}
                                  required
                                />
                                <label htmlFor={`edit-description-${task.id}`}>Descripción</label>
                                <textarea
                                  id={`edit-description-${task.id}`}
                                  value={editForm.description}
                                  onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                                  rows={2}
                                />
                                <div className="edit-options">
                                  <label htmlFor={`edit-due-date-${task.id}`}>
                                    Fecha de vencimiento
                                    <input
                                      id={`edit-due-date-${task.id}`}
                                      type="date"
                                      value={editForm.dueDate}
                                      onChange={(event) => setEditForm({ ...editForm, dueDate: event.target.value })}
                                    />
                                  </label>
                                  <label htmlFor={`edit-priority-${task.id}`}>
                                    Prioridad
                                    <select
                                      id={`edit-priority-${task.id}`}
                                      value={editForm.priority}
                                      onChange={(event) => setEditForm({ ...editForm, priority: event.target.value })}
                                    >
                                      {priorityOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                                <div className="task-edit-actions">
                                  <button
                                    className="button button-primary"
                                    type="submit"
                                    disabled={isBusy}
                                  >
                                    {isBusy ? 'Guardando...' : 'Guardar cambios'}
                                  </button>
                                  <button
                                    className="button button-quiet"
                                    type="button"
                                    onClick={() => setEditingTaskId(null)}
                                    disabled={isBusy}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <button
                                  className={`task-check ${isCompleted ? 'is-checked' : ''}`}
                                  type="button"
                                  aria-label={isCompleted
                                    ? `Marcar "${task.title}" como pendiente`
                                    : `Marcar "${task.title}" como completada`}
                                  aria-pressed={isCompleted}
                                  disabled={isBusy}
                                  onClick={() => handleToggleTask(task)}
                                >
                                  {isCompleted && <span aria-hidden="true">✓</span>}
                                </button>
                                <div className="task-copy">
                                  <h3>{task.title}</h3>
                                  {task.description && <p>{task.description}</p>}
                                  <div className="task-meta">
                                    <span className={`priority-tag priority-${(task.priority ?? 'MEDIA').toLowerCase()}`}>
                                      Prioridad {priorityLabel}
                                    </span>
                                    {task.dueDate && (
                                      <span className="due-date">Vence {formatDueDate(task.dueDate)}</span>
                                    )}
                                  </div>
                                </div>
                                <select
                                  className={`task-status-select status-select-${taskStatus.toLowerCase()}`}
                                  aria-label={`Cambiar estado de ${task.title}`}
                                  value={taskStatus}
                                  disabled={isBusy}
                                  onChange={(event) => handleSetStatus(task, event.target.value)}
                                >
                                  {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <div className="task-actions">
                                  <button
                                    className="edit-button"
                                    type="button"
                                    aria-label={`Editar "${task.title}"`}
                                    disabled={isBusy}
                                    onClick={() => startEditingTask(task)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="delete-button"
                                    type="button"
                                    aria-label={`Eliminar "${task.title}"`}
                                    disabled={isBusy}
                                    onClick={() => handleDeleteTask(task)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="dashboard-footer">Hecho con intención. Un día a la vez.</footer>
      </main>
    </div>
  );
}
