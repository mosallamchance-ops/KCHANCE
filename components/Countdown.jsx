"use client";
import { useEffect, useState } from "react";

function getRemaining(endAt) {
  const diff = new Date(endAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return { days, hours, minutes };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function Countdown({ endAt }) {
  const [remaining, setRemaining] = useState(() => getRemaining(endAt));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(endAt)), 60000);
    return () => clearInterval(id);
  }, [endAt]);

  if (!remaining) {
    return <span className="text-[var(--ember)] font-bold">انتهى الوقت</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5" dir="ltr">
      <span className="odometer-box">{pad(remaining.days)}</span>
      <span className="text-xs text-gray-400">ي</span>
      <span className="odometer-box">{pad(remaining.hours)}</span>
      <span className="text-xs text-gray-400">س</span>
      <span className="odometer-box">{pad(remaining.minutes)}</span>
      <span className="text-xs text-gray-400">د</span>
    </span>
  );
}
