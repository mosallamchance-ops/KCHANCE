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

export default function Countdown({ endAt }) {
  const [remaining, setRemaining] = useState(() => getRemaining(endAt));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(endAt)), 60000);
    return () => clearInterval(id);
  }, [endAt]);

  if (!remaining) return <span className="text-red-600 font-bold">انتهى الوقت</span>;

  return (
    <span>
      {remaining.days} يوم {remaining.hours} ساعة {remaining.minutes} دقيقة
    </span>
  );
}
