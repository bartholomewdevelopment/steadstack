import { useState, useRef, useEffect } from 'react';

/**
 * Tooltip Component
 * A reusable tooltip that can wrap any element and show helpful information on hover.
 * This is the foundation for the AI Helper feature.
 *
 * @param {React.ReactNode} children - The element to wrap
 * @param {string} content - The tooltip text content
 * @param {string} position - Position of tooltip: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 * @param {number} delay - Delay before showing tooltip in ms (default: 200)
 * @param {string} className - Additional classes for the wrapper
 */
export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef(null);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  // Adjust position if tooltip would overflow viewport
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current.getBoundingClientRect();
      const trigger = triggerRef.current.getBoundingClientRect();
      const padding = 8;

      let newPosition = position;

      if (position === 'top' && trigger.top - tooltip.height - padding < 0) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && trigger.bottom + tooltip.height + padding > window.innerHeight) {
        newPosition = 'top';
      } else if (position === 'left' && trigger.left - tooltip.width - padding < 0) {
        newPosition = 'right';
      } else if (position === 'right' && trigger.right + tooltip.width + padding > window.innerWidth) {
        newPosition = 'left';
      }

      setActualPosition(newPosition);
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent',
  };

  if (!content) {
    return children;
  }

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg
            whitespace-nowrap max-w-xs animate-fade-in ${positionClasses[actualPosition]}`}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[actualPosition]}`}
          />
        </div>
      )}
    </div>
  );
}

/**
 * HelpTooltip Component
 * A tooltip with a help icon (?) for contextual help.
 * Foundation for the AI Helper feature.
 *
 * @param {string} content - The help text
 * @param {string} position - Position of tooltip (default: 'top')
 * @param {string} size - Icon size: 'sm' | 'md' | 'lg' (default: 'sm')
 */
export function HelpTooltip({ content, position = 'top', size = 'sm' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };

  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        className={`inline-flex items-center justify-center rounded-full bg-gray-100
          text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors
          cursor-help ${sizeClasses[size]}`}
        aria-label="Help"
      >
        ?
      </button>
    </Tooltip>
  );
}

/**
 * InfoTooltip Component
 * A tooltip with an info icon (i) for additional information.
 *
 * @param {string} content - The info text
 * @param {string} position - Position of tooltip (default: 'top')
 * @param {string} size - Icon size: 'sm' | 'md' | 'lg' (default: 'sm')
 */
export function InfoTooltip({ content, position = 'top', size = 'sm' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Tooltip content={content} position={position}>
      <span
        className={`inline-flex items-center justify-center text-gray-400
          hover:text-gray-600 transition-colors cursor-help ${sizeClasses[size]}`}
        aria-label="Information"
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      </span>
    </Tooltip>
  );
}
