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

  function statusLabel(t) {
    const draw = t.draws;
    if (!draw) return "";
    if (draw.status !== "completed") return "بانتظار السحب";
    if (draw.winner_user_id === userId) return "🎉 فائز";
    return "لست الفائز";
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">تذاكري</h1>
      <div className="space-y-2">
        {tickets.map((t) => (
          <div key={t.id} className="card flex justify-between text-sm">
            <div>
              <p className="font-bold">{t.draws?.products?.name}</p>
              <p className="text-gray-400">Ticket #{t.ticket_number}</p>
              <p className="text-gray-400">{new Date(t.created_at).toLocaleDateString("ar")}</p>
            </div>
            <p className="font-bold">{statusLabel(t)}</p>
          </div>
        ))}
        {tickets.length === 0 && <p className="text-gray-500">لم تشترِ أي تذاكر بعد.</p>}
      </div>
    </div>
  );
}
