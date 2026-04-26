import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, Calendar as CalendarIcon } from 'lucide-react';

interface LiveClockProps {
  className?: string;
  showDate?: boolean;
}

export default function LiveClock({ className = "", showDate = true }: LiveClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showDate && (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
          <CalendarIcon size={14} />
          <span>
            {time.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
        <ClockIcon size={16} />
        <span className="text-lg font-mono">
          {time.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
}
