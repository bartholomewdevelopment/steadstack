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
                        <span className="text-lg">{categoryIcons[task.category] || '📝'}</span>
                        <span
                          className={`font-medium ${
                            task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}
                        >
                          {task.name}
                        </span>
                        {task.status === 'OVERDUE' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                            Overdue
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
    </div>
  );
}

function CompleteTaskModal({ task, onComplete, onClose, loading }) {
  const [notes, setNotes] = useState('');
  const [actualDuration, setActualDuration] = useState(task.estimatedDurationMinutes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete({
      notes,
      actualDurationMinutes: actualDuration ? parseInt(actualDuration) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
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
              rows={3}
              placeholder="Any notes about this task..."
            />
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
