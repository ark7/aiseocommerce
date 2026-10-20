'use client';

import { useState, useEffect } from 'react';

interface SaleCountdownProps {
  endsAt: string | null;
}

export function SaleCountdown({ endsAt }: SaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!endsAt) return;

    const endDate = new Date(endsAt);
    const now = new Date();

    if (endDate <= now) {
      setTimeLeft('Berakhir');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Berakhir');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [endsAt]);

  if (!endsAt) return null;

  return (
    <span className="text-xs font-medium text-red-600">
      {timeLeft}
    </span>
  );
}