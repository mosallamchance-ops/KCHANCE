"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("tickets")
        .select("id, ticket_number, price, created_at, draws(id, status, winner_user_id, products(name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setTickets(data ?? []);
    }
    load();
  }, []);

  function statusInfo(t) {
    const draw = t.draws;
    if (!draw) return { text: "—", color: "text-gray-400" };
    if (draw.status !== "completed") return { text: "بانتظار السحب", color: "text-[var(--gold-deep)]" };
    if (draw.winner_user_id === userId) return { text: "🎉 فائز", color: "text-[var(--emerald)] font-bold" };
    return { text: "لست الفائز", color: "text-gray-400" };
  }

  return (
    <div>
      <h1 className="font-display text-2xl mb-4">تذاكري</h1>
      <div className="space-y-2">
        {tickets.map(function (t) {
          const info = statusInfo(t);
          return (
            <div key={t.id} className="card flex justify-between items-center text-sm">
              <div>
                <p className="font-bold">{t.draws?.products?.name}</p>
                <p className="text-gray-400 font-mono-num">#{t.ticket_number}</p>
                <p className="text-gray-400">{new Date(t.created_at).toLocaleDateString("ar")}</p>
              </div>
              <p className={info.color}>{info.text}</p>
            </div>
          );
        })}
        {tickets.length === 0 && <p className="text-gray-500">لم تشترِ أي تذاكر بعد.</p>}
      </div>
    </div>
  );
}
