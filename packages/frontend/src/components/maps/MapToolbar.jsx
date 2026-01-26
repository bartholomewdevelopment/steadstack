import { useState } from 'react';

const modes = {
  VIEW: 'view',
  DRAW: 'draw',
  EDIT: 'edit'
};

export default function MapToolbar({
  mode = modes.VIEW,
  onModeChange,
  onClear,
  onUndo,
  hasPolygon = false,
  canUndo = false,
  disabled = false
}) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 bg-white rounded-lg shadow-lg p-1.5">
      {/* Draw Button */}
      <button
        type="button"
        onClick={() => onModeChange(mode === modes.DRAW ? modes.VIEW : modes.DRAW)}
        disabled={disabled || hasPolygon}
        className={`flex items-center justify-center w-10 h-10 rounded-md transition-colors ${
          mode === modes.DRAW
            ? 'bg-green-600 text-white'
            : hasPolygon
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title={hasPolygon ? 'Clear existing polygon to draw new' : 'Draw polygon'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {/* Edit Button */}
      <button
        type="button"
        onClick={() => onModeChange(mode === modes.EDIT ? modes.VIEW : modes.EDIT)}
        disabled={disabled || !hasPolygon}
        className={`flex items-center justify-center w-10 h-10 rounded-md transition-colors ${
          mode === modes.EDIT
            ? 'bg-blue-600 text-white'
            : !hasPolygon
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title={!hasPolygon ? 'Draw a polygon first' : 'Edit polygon'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* Divider */}
      <div className="h-px bg-gray-300 my-1" />

      {/* Undo Button */}
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          disabled={disabled || !canUndo}
          className={`flex items-center justify-center w-10 h-10 rounded-md transition-colors ${
            !canUndo
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="Undo last point"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
      )}

      {/* Clear Button */}
      <button
        type="button"
        onClick={onClear}
        disabled={disabled || !hasPolygon}
        className={`flex items-center justify-center w-10 h-10 rounded-md transition-colors ${
          !hasPolygon
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-red-50 text-red-600 hover:bg-red-100'
        }`}
        title="Clear polygon"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

MapToolbar.modes = modes;
