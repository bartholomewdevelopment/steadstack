import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { tasksApi } from '../../../services/api';

const categoryIcons = {
  FEEDING: '🍽️',
  WATERING: '💧',
  HEALTH_CHECK: '🩺',
  MEDICATION: '💊',
  BREEDING: '🐄',
  MAINTENANCE: '🔧',
  CLEANING: '🧹',
  HARVESTING: '🌾',
  PLANTING: '🌱',
  IRRIGATION: '💦',
  PEST_CONTROL: '🐛',
  EQUIPMENT: '⚙️',
  ADMINISTRATIVE: '📋',
  OTHER: '📝',
};

const priorityColors = {
  URGENT: 'bg-red-100 text-red-800 border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  LOW: 'bg-gray-100 text-gray-800 border-gray-300',
};

const eventTypeOptions = [
  { value: 'feeding', label: 'Feeding', icon: '🍽️' },
  { value: 'treatment', label: 'Treatment/Medical', icon: '💊' },
  { value: 'purchase', label: 'Purchase', icon: '🛒' },
  { value: 'sale', label: 'Sale', icon: '💰' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { value: 'labor', label: 'Labor', icon: '👷' },
  { value: 'breeding', label: 'Breeding', icon: '🐄' },
  { value: 'birth', label: 'Birth', icon: '🐣' },
  { value: 'death', label: 'Death/Loss', icon: '💀' },
  { value: 'harvest', label: 'Harvest', icon: '🌾' },
  { value: 'cleaning', label: 'Deep Cleaning', icon: '🧹' },
  { value: 'showing', label: 'Show/Competition', icon: '🏆' },
  { value: 'butchering', label: 'Butchering', icon: '🔪' },
  { value: 'custom', label: 'Other', icon: '📝' },
];

const statusColors = {
  SCHEDULED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SKIPPED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-100 text-red-600',
  OVERDUE: 'bg-red-100 text-red-700',
};

export default function TodaysTasks() {
  const { currentSite } = useSite();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [showSkipModal, setShowSkipModal] = useState(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  useEffect(() => {
    if (currentSite?.id) {
      fetchTasks();
    }
  }, [currentSite, selectedDate]);

  const fetchTasks = async () => {
    if (!currentSite?.id) return;

    try {
      setLoading(true);
      setError(null);

      const params = {
        siteId: currentSite.id,
        scheduledDate: selectedDate,
      };

      const response = await tasksApi.listOccurrences(params);
      const occurrences = response.data?.occurrences || [];
      setTasks(occurrences);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    setActionLoading(taskId);
    try {
      await tasksApi.startOccurrence(taskId);
      await fetchTasks();
    } catch (err) {
      alert('Failed to start task: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteTask = async (taskId, data = {}) => {
    setActionLoading(taskId);
    try {
      await tasksApi.completeOccurrence(taskId, data);
      setShowCompleteModal(null);
      await fetchTasks();
    } catch (err) {
      alert('Failed to complete task: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkipTask = async (taskId, reason) => {
    setActionLoading(taskId);
    try {
      await tasksApi.skipOccurrence(taskId, reason);
      setShowSkipModal(null);
      await fetchTasks();
    } catch (err) {
      alert('Failed to skip task: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddEvent = async (eventData) => {
    try {
      await tasksApi.createOccurrence({
        ...eventData,
        siteId: currentSite.id,
        scheduledDate: selectedDate,
        isEvent: true,
      });
      setShowAddEventModal(false);
      await fetchTasks();
    } catch (err) {
      alert('Failed to create event: ' + err.message);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'].includes(task.status);
    if (filter === 'completed') return ['COMPLETED', 'SKIPPED'].includes(task.status);
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group tasks by runlist
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const key = task.runlistId || 'adhoc';
    if (!acc[key]) {
      acc[key] = { name: task.runlistName || 'Ad-hoc Tasks', tasks: [] };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {});

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to view tasks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Today's Tasks</h1>
          <p className="text-gray-600">Manage your daily chores at {currentSite.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input py-2"
          />
          <button
            onClick={() => setShowAddEventModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Event
          </button>
          <Link to="/app/tasks/lists" className="btn-secondary">
            Manage Lists
          </Link>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-4 border-b border-gray-200">
        <Link
          to="/app/tasks"
          className="px-4 py-2 text-sm font-medium text-primary-600 border-b-2 border-primary-600"
        >
          Today
        </Link>
        <Link
          to="/app/tasks/templates"
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Task Templates
        </Link>
        <Link
          to="/app/tasks/lists"
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Lists
        </Link>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Progress</p>
            <p className="text-2xl font-bold text-gray-900">
              {completedCount} of {totalCount} completed
            </p>
          </div>
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#16a34a"
                strokeWidth="8"
                strokeDasharray={`${progressPercent * 2.26} 226`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-900">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading tasks...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchTasks} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No tasks for this day</h3>
          <p className="text-gray-500 mt-1">
            {filter !== 'all' ? 'Try changing your filter.' : 'Create a list and add tasks to get started.'}
          </p>
          <Link to="/app/tasks/lists/new" className="btn-primary mt-4 inline-block">
            Create a List
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([key, group]) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                <p className="text-sm text-gray-500">
                  {group.tasks.filter((t) => t.status === 'COMPLETED').length} of {group.tasks.length} completed
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 flex items-center gap-4 ${
                      task.status === 'COMPLETED' ? 'bg-green-50/50' : ''
                    } ${task.status === 'OVERDUE' ? 'bg-red-50/50' : ''}`}
                  >
                    {/* Status/Action */}
                    <div className="flex-shrink-0">
                      {task.status === 'COMPLETED' ? (
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      ) : task.status === 'SKIPPED' ? (
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            task.status === 'IN_PROGRESS'
                              ? setShowCompleteModal(task)
                              : handleStartTask(task.id)
                          }
                          disabled={actionLoading === task.id}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                            task.status === 'IN_PROGRESS'
                              ? 'border-blue-500 bg-blue-100 text-blue-600'
                              : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'
                          }`}
                        >
                          {actionLoading === task.id ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
                          ) : task.status === 'IN_PROGRESS' ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : null}
                        </button>
                      )}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {task.isEvent ? (
                          <span className="text-lg">⭐</span>
                        ) : (
                          <span className="text-lg">{categoryIcons[task.category] || '📝'}</span>
                        )}
                        <span
                          className={`font-medium ${
                            task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}
                        >
                          {task.name}
                        </span>
                        {task.isEvent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                            {eventTypeOptions.find(e => e.value === task.eventType)?.label || 'Event'}
                          </span>
                        )}
                        {task.status === 'OVERDUE' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                            Overdue
                          </span>
                        )}
                        {task.posted && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Posted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.estimatedDurationMinutes && (
                          <span>{task.estimatedDurationMinutes} min</span>
                        )}
                        {task.scheduledTime && <span>{task.scheduledTime}</span>}
                        {task.isEvent && task.totalCost > 0 && (
                          <span className="text-amber-600 font-medium">
                            ${task.totalCost.toFixed(2)}
                          </span>
                        )}
                        {task.isEvent && task.totalRevenue > 0 && (
                          <span className="text-green-600 font-medium">
                            +${task.totalRevenue.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {!['COMPLETED', 'SKIPPED', 'CANCELLED'].includes(task.status) && (
                      <div className="flex items-center gap-2">
                        {task.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => setShowCompleteModal(task)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => setShowSkipModal(task)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete Task Modal */}
      {showCompleteModal && (
        <CompleteTaskModal
          task={showCompleteModal}
          onComplete={(data) => handleCompleteTask(showCompleteModal.id, data)}
          onClose={() => setShowCompleteModal(null)}
          loading={actionLoading === showCompleteModal.id}
        />
      )}

      {/* Skip Task Modal */}
      {showSkipModal && (
        <SkipTaskModal
          task={showSkipModal}
          onSkip={(reason) => handleSkipTask(showSkipModal.id, reason)}
          onClose={() => setShowSkipModal(null)}
          loading={actionLoading === showSkipModal.id}
        />
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <AddEventModal
          onAdd={handleAddEvent}
          onClose={() => setShowAddEventModal(false)}
        />
      )}
    </div>
  );
}

function CompleteTaskModal({ task, onComplete, onClose, loading }) {
  const [notes, setNotes] = useState('');
  const [actualDuration, setActualDuration] = useState(task.estimatedDurationMinutes || '');
  const [isEvent, setIsEvent] = useState(task.isEvent || false);
  const [eventType, setEventType] = useState(task.eventType || '');
  const [totalCost, setTotalCost] = useState(task.totalCost || '');
  const [totalRevenue, setTotalRevenue] = useState(task.totalRevenue || '');
  const [postToLedger, setPostToLedger] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      notes,
      actualDurationMinutes: actualDuration ? parseInt(actualDuration) : undefined,
    };

    // Add event data if this is an event
    if (isEvent) {
      data.isEvent = true;
      data.eventType = eventType;
      data.totalCost = totalCost ? parseFloat(totalCost) : 0;
      data.totalRevenue = totalRevenue ? parseFloat(totalRevenue) : 0;
      data.postToLedger = postToLedger;
    }

    onComplete(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Task</h3>
        <p className="text-gray-600 mb-4">{task.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Actual Duration (minutes)</label>
            <input
              type="number"
              value={actualDuration}
              onChange={(e) => setActualDuration(e.target.value)}
              className="input"
              placeholder={task.estimatedDurationMinutes || 'Duration'}
              min="1"
            />
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={2}
              placeholder="Any notes about this task..."
            />
          </div>

          {/* Event Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">Mark as Event</h4>
                <p className="text-sm text-gray-500">Track financial impact</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEvent}
                  onChange={(e) => setIsEvent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {isEvent && (
              <div className="space-y-4 bg-purple-50 rounded-lg p-4">
                <div>
                  <label className="label">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="input"
                    required={isEvent}
                  >
                    <option value="">Select type...</option>
                    {eventTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Total Cost ($)</label>
                    <input
                      type="number"
                      value={totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                      className="input"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">Total Revenue ($)</label>
                    <input
                      type="number"
                      value={totalRevenue}
                      onChange={(e) => setTotalRevenue(e.target.value)}
                      className="input"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="postToLedger"
                    checked={postToLedger}
                    onChange={(e) => setPostToLedger(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="postToLedger" className="text-sm text-gray-700">
                    Post to accounting ledger
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Completing...' : 'Mark Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SkipTaskModal({ task, onSkip, onClose, loading }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a reason for skipping');
      return;
    }
    onSkip(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Skip Task</h3>
        <p className="text-gray-600 mb-4">{task.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Reason for skipping *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input"
              rows={3}
              placeholder="Why is this task being skipped?"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Skipping...' : 'Skip Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddEventModal({ onAdd, onClose }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    eventType: '',
    priority: 'MEDIUM',
    totalCost: '',
    totalRevenue: '',
    scheduledTime: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Event name is required');
      return;
    }
    if (!form.eventType) {
      alert('Event type is required');
      return;
    }

    setLoading(true);
    try {
      await onAdd({
        name: form.name,
        description: form.description,
        eventType: form.eventType,
        priority: form.priority,
        totalCost: form.totalCost ? parseFloat(form.totalCost) : 0,
        totalRevenue: form.totalRevenue ? parseFloat(form.totalRevenue) : 0,
        scheduledTime: form.scheduledTime || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⭐</span>
          <h3 className="text-lg font-semibold text-gray-900">Add Event</h3>
        </div>
        <p className="text-gray-600 mb-4">
          Create a major task/event with financial tracking.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Event Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Butchering Day, Deep Cleaning, Show Pigs"
              required
            />
          </div>

          <div>
            <label className="label">Event Type *</label>
            <select
              name="eventType"
              value={form.eventType}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select type...</option>
              {eventTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="input"
              rows={2}
              placeholder="Details about this event..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="input"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Time (optional)</label>
              <input
                type="time"
                name="scheduledTime"
                value={form.scheduledTime}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h4 className="font-medium text-amber-800 mb-3">Financial Tracking</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-amber-700">Expected Cost ($)</label>
                <input
                  type="number"
                  name="totalCost"
                  value={form.totalCost}
                  onChange={handleChange}
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="label text-amber-700">Expected Revenue ($)</label>
                <input
                  type="number"
                  name="totalRevenue"
                  value={form.totalRevenue}
                  onChange={handleChange}
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-2">
              You can update these amounts when completing the event.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
