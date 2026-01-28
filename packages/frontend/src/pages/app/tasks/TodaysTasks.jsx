import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { tasksApi } from '../../../services/api';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  WEEDING: '🌿',
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

// Sortable Task Item Component
function SortableTaskItem({
  task,
  actionLoading,
  onStart,
  onComplete,
  onSkip,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-white border-b border-gray-100 last:border-b-0 ${
        isDragging ? 'shadow-lg ring-2 ring-primary-400 rounded-lg z-10' : ''
      } ${task.status === 'COMPLETED' ? 'bg-green-50/50' : ''} ${
        task.status === 'OVERDUE' ? 'bg-red-50/50' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </button>

      {/* Status/Action Button */}
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
            onClick={() => task.status === 'IN_PROGRESS' ? onComplete(task) : onStart(task.id)}
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
        <div className="flex items-center gap-2 flex-wrap">
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
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          {task.estimatedDurationMinutes && (
            <span>{task.estimatedDurationMinutes} min</span>
          )}
          {/* Date and Time display */}
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {(() => {
              try {
                // Handle Firestore Timestamp, ISO string, or Date object
                let d;
                if (task.scheduledDate?._seconds) {
                  // Firestore Timestamp serialized
                  d = new Date(task.scheduledDate._seconds * 1000);
                } else if (task.scheduledDate?.toDate) {
                  // Firestore Timestamp object
                  d = task.scheduledDate.toDate();
                } else if (typeof task.scheduledDate === 'string') {
                  // ISO string - parse carefully
                  d = new Date(task.scheduledDate);
                } else {
                  d = new Date(task.scheduledDate);
                }
                if (isNaN(d.getTime())) return 'No date';
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              } catch {
                return 'No date';
              }
            })()}
            {task.scheduledTime && ` @ ${task.scheduledTime}`}
          </span>
          {task.isEvent && task.totalCost > 0 && (
            <span className="text-amber-600 font-medium">${task.totalCost.toFixed(2)}</span>
          )}
          {task.isEvent && task.totalRevenue > 0 && (
            <span className="text-green-600 font-medium">+${task.totalRevenue.toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!['COMPLETED', 'SKIPPED', 'CANCELLED'].includes(task.status) && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.status === 'IN_PROGRESS' && (
            <button
              onClick={() => onComplete(task)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              Complete
            </button>
          )}
          <button
            onClick={() => onSkip(task)}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

// Task Item for Drag Overlay (non-interactive preview)
function TaskDragPreview({ task }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-xl opacity-90">
      <div className="flex-shrink-0 p-1 text-gray-400">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        {task.isEvent ? '⭐' : categoryIcons[task.category] || '📝'}
      </div>
      <span className="font-medium text-gray-900">{task.name}</span>
    </div>
  );
}

// Droppable Group Component
function TaskGroup({ groupKey, group, children, isOver }) {
  return (
    <div
      className={`bg-white rounded-xl border overflow-hidden transition-colors ${
        isOver ? 'border-primary-400 ring-2 ring-primary-200' : 'border-gray-200'
      }`}
    >
      <div className={`px-6 py-4 border-b transition-colors ${
        isOver ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className="font-semibold text-gray-900">{group.name}</h3>
        <p className="text-sm text-gray-500">
          {group.tasks.filter((t) => t.status === 'COMPLETED').length} of {group.tasks.length} completed
        </p>
      </div>
      <div className="min-h-[60px]">
        {children}
      </div>
    </div>
  );
}

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
  const [generating, setGenerating] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (currentSite?.id) {
      fetchTasks();
    }
  }, [currentSite, selectedDate]);

  const handleGenerateTasks = async () => {
    if (!currentSite?.id) return;

    try {
      setGenerating(true);
      const response = await tasksApi.generateTasks(selectedDate);
      const count = response.data?.generated || 0;

      if (count > 0) {
        alert(`Generated ${count} task(s) for ${selectedDate}`);
        await fetchTasks();
      } else {
        alert('No new tasks to generate. Tasks may already exist for this date, or no active runlists match this date.');
      }
    } catch (err) {
      alert('Failed to generate tasks: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const fetchTasks = async () => {
    if (!currentSite?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch ALL uncompleted tasks from all dates up to selected date
      // This ensures overdue/pending tasks accumulate if not completed
      const params = {
        siteId: currentSite.id,
        endDate: selectedDate, // Include tasks up to selected date
        limit: 200, // Increase limit to get more tasks
      };

      const response = await tasksApi.listOccurrences(params);
      let occurrences = response.data?.occurrences || [];

      // Show ALL uncompleted tasks from any date, plus completed tasks from selected date only
      const selectedDateStr = selectedDate;
      occurrences = occurrences.filter(task => {
        const isPending = ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'].includes(task.status);

        // Show all pending/incomplete tasks regardless of date
        if (isPending) return true;

        // For completed/skipped/cancelled, only show if from selected date
        try {
          let taskDate;
          if (task.scheduledDate?._seconds) {
            // Firestore Timestamp serialized
            taskDate = new Date(task.scheduledDate._seconds * 1000).toISOString().split('T')[0];
          } else if (typeof task.scheduledDate === 'string') {
            taskDate = task.scheduledDate.split('T')[0];
          } else {
            taskDate = new Date(task.scheduledDate).toISOString().split('T')[0];
          }
          return taskDate === selectedDateStr;
        } catch {
          return false;
        }
      });

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

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === 'all') return true;
      if (filter === 'pending') return ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'].includes(task.status);
      if (filter === 'completed') return ['COMPLETED', 'SKIPPED'].includes(task.status);
      return true;
    });
  }, [tasks, filter]);

  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group tasks by runlist
  const groupedTasks = useMemo(() => {
    return filteredTasks.reduce((acc, task) => {
      const key = task.runlistId || 'adhoc';
      if (!acc[key]) {
        acc[key] = { name: task.runlistName || 'Ad-hoc Tasks', tasks: [] };
      }
      acc[key].tasks.push(task);
      return acc;
    }, {});
  }, [filteredTasks]);

  // Find task by ID across all groups
  const findTask = (id) => tasks.find((t) => t.id === id);

  // Find which group a task belongs to
  const findGroupForTask = (taskId) => {
    const task = findTask(taskId);
    return task ? (task.runlistId || 'adhoc') : null;
  };

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeTask = findTask(active.id);
    const overTask = findTask(over.id);

    if (!activeTask || !overTask) return;

    const activeGroup = findGroupForTask(active.id);
    const overGroup = findGroupForTask(over.id);

    // Optimistic update
    setTasks((prevTasks) => {
      const newTasks = [...prevTasks];

      // If moving within the same group, just reorder
      if (activeGroup === overGroup) {
        const groupTasks = newTasks.filter(t => (t.runlistId || 'adhoc') === activeGroup);
        const otherTasks = newTasks.filter(t => (t.runlistId || 'adhoc') !== activeGroup);

        const oldIndex = groupTasks.findIndex((t) => t.id === active.id);
        const newIndex = groupTasks.findIndex((t) => t.id === over.id);

        const reorderedGroupTasks = arrayMove(groupTasks, oldIndex, newIndex);
        return [...otherTasks, ...reorderedGroupTasks];
      }

      // Moving between groups - update the task's runlistId
      const taskIndex = newTasks.findIndex(t => t.id === active.id);
      if (taskIndex !== -1) {
        const updatedTask = { ...newTasks[taskIndex] };
        if (overGroup === 'adhoc') {
          updatedTask.runlistId = null;
          updatedTask.runlistName = null;
        } else {
          updatedTask.runlistId = overGroup;
          updatedTask.runlistName = overTask.runlistName;
        }
        newTasks[taskIndex] = updatedTask;
      }

      return newTasks;
    });

    // Save to backend
    try {
      setSavingOrder(true);

      // Build the ordered tasks array with new sort orders
      const allTasksToUpdate = [];
      let sortOrderCounter = 0;

      // Get all tasks after the optimistic update, grouped by runlist
      const updatedGroupedTasks = {};
      tasks.forEach(task => {
        const key = task.id === active.id
          ? (overGroup === 'adhoc' ? 'adhoc' : overGroup)
          : (task.runlistId || 'adhoc');
        if (!updatedGroupedTasks[key]) {
          updatedGroupedTasks[key] = [];
        }
        updatedGroupedTasks[key].push(task);
      });

      // Reorder within the target group
      Object.entries(updatedGroupedTasks).forEach(([groupKey, groupTasks]) => {
        groupTasks.forEach((task, index) => {
          allTasksToUpdate.push({
            id: task.id,
            sortOrder: index,
            runlistId: task.id === active.id
              ? (overGroup === 'adhoc' ? null : overGroup)
              : (groupKey === 'adhoc' ? null : groupKey),
          });
        });
      });

      await tasksApi.reorderOccurrences(selectedDate, allTasksToUpdate);
    } catch (err) {
      console.error('Failed to save task order:', err);
      // Revert on error by refetching
      await fetchTasks();
    } finally {
      setSavingOrder(false);
    }
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeTask = activeId ? findTask(activeId) : null;

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
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input py-2"
          />
          <button
            onClick={handleGenerateTasks}
            disabled={generating}
            className="btn-secondary flex items-center gap-2"
            title="Generate tasks from active runlists for this date"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            {generating ? 'Generating...' : 'Generate Tasks'}
          </button>
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
          <div className="flex items-center gap-4">
            {savingOrder && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                Saving...
              </span>
            )}
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

      {/* Drag Hint */}
      {filteredTasks.length > 0 && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
          Drag tasks to reorder or move between lists
        </p>
      )}

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([key, group]) => (
              <TaskGroup
                key={key}
                groupKey={key}
                group={group}
                isOver={activeId && findGroupForTask(activeId) !== key}
              >
                <SortableContext
                  items={group.tasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {group.tasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      actionLoading={actionLoading}
                      onStart={handleStartTask}
                      onComplete={(t) => setShowCompleteModal(t)}
                      onSkip={(t) => setShowSkipModal(t)}
                    />
                  ))}
                </SortableContext>
              </TaskGroup>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? <TaskDragPreview task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
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
