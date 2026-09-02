"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import PageHeader from "@/components/PageHeader";
import Countdown from "@/components/Countdown";
import { ShieldCheckIcon, TrophyIcon } from "@/components/icons";

function formatSyp(n) {
  return new Intl.NumberFormat("ar").format(Math.round(n || 0));
}

export default function MyTicketsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active"); // "active" | "done"

  useEffect(function () {
    async function load() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data } = await supabase
        .from("tickets")
        .select(
          "id, ticket_number, created_at, draw_id, draws(id, status, winner_user_id, end_at, total_tickets, sold_tickets, products(name, image_url))"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const byDraw = {};
      (data || []).forEach(function (t) {
        const key = t.draw_id;
        if (!byDraw[key]) {
          byDraw[key] = { draw: t.draws, ticketNumbers: [], latestAt: t.created_at };
        }
        byDraw[key].ticketNumbers.push(t.ticket_number);
      });

      const list = Object.values(byDraw).sort(function (a, b) {
        return new Date(b.latestAt) - new Date(a.latestAt);
      });

      setGroups(list);
      setLoading(false);
    }
    load();
  }, [router]);

  const activeGroups = groups.filter(function (g) {
    return g.draw?.status !== "completed";
  });
  const doneGroups = groups.filter(function (g) {
    return g.draw?.status === "completed";
  });

  const shown = tab === "active" ? activeGroups : doneGroups;

  return (
    <div className="pb-6">
      <PageHeader title="تذاكري" showBalance />

      <div className="flex border-b border-[var(--line)] mb-4">
        <button
          onClick={function () {
            setTab("active");
          }}
          className={
            "flex-1 pb-2.5 text-sm font-bold border-b-2 -mb-px " +
            (tab === "active" ? "border-[var(--emerald)] text-[var(--emerald)]" : "border-transparent text-gray-400")
          }
        >
          النشطة ({activeGroups.length})
        </button>
        <button
          onClick={function () {
            setTab("done");
          }}
          className={
            "flex-1 pb-2.5 text-sm font-bold border-b-2 -mb-px " +
            (tab === "done" ? "border-[var(--emerald)] text-[var(--emerald)]" : "border-transparent text-gray-400")
          }
        >
          السابقة ({doneGroups.length})
        </button>
      </div>

      {loading && <p className="text-gray-400 text-sm text-center py-12">جارِ التحميل…</p>}

      {!loading && shown.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-12">
          {tab === "active" ? "لا توجد تذاكر في سحوبات نشطة حالياً." : "لا توجد تذاكر في سحوبات سابقة."}
        </p>
      )}

      <div className="space-y-4">
        {shown.map(function (g) {
          return <DrawTicketCard key={g.draw?.id} group={g} />;
        })}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
        تذاكرك مسجّلة باسمك، ولا يمكن بيع الرقم نفسه لمستخدم آخر.
      </p>
    </div>
  );
}

function DrawTicketCard({ group }) {
  const draw = group.draw;
  if (!draw) return null;

  const isCompleted = draw.status === "completed";
  const remaining = draw.total_tickets - draw.sold_tickets;
  const soldPct = Math.min(100, Math.round((draw.sold_tickets / draw.total_tickets) * 100));

  return (
    <div className="ticket-card">
      <div className="p-4 flex items-center gap-3">
        {draw.products?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draw.products.image_url}
            alt={draw.products?.name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <span className="badge-verified mb-1">
            <ShieldCheckIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
            موثّق
          </span>
          <p className="font-bold truncate">{draw.products?.name}</p>

          {!isCompleted ? (
            <span className="badge-pill pending mt-1">بانتظار السحب</span>
          ) : (
            <WinnerBadge draw={draw} />
          )}
        </div>
      </div>

      {!isCompleted ? (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">ينتهي خلال</span>
            <Countdown endAt={draw.end_at} />
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--gold)]" style={{ width: soldPct + "%" }} />
          </div>
          <p className="text-[0.65rem] text-gray-400 mt-1 text-left">
            {soldPct}% — تبقّى {formatSyp(remaining)} تذكرة
          </p>
        </div>
      ) : (
        <div className="px-4 pb-1">
          <p className="text-xs text-gray-400">انتهى السحب — {new Date(draw.end_at).toLocaleDateString("ar")}</p>
        </div>
      )}

      <div className="px-4 pb-4">
        <p className="text-xs text-gray-500 mb-2">أرقامك في هذا السحب ({group.ticketNumbers.length})</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {group.ticketNumbers.map(function (n) {
            return (
              <div key={n} className="ticket-chip justify-center">
                {n}
              </div>
            );
          })}
        </div>
        <Link href={"/draws/" + draw.id} className="btn-primary w-full block text-center text-sm py-2">
          عرض تفاصيل السحب
        </Link>
      </div>
    </div>
  );
}

function WinnerBadge({ draw }) {
  const [userId, setUserId] = useState(null);

  useEffect(function () {
    supabase.auth.getUser().then(function (res) {
      setUserId(res.data.user?.id ?? null);
    });
  }, []);

  if (!userId) return null;

  if (draw.winner_user_id === userId) {
    return (
      <span className="badge-pill done mt-1">
        <TrophyIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
        فائز 🎉
      </span>
    );
  }
  return <span className="badge-pill mt-1 bg-gray-100 text-gray-500">لست الفائز</span>;
}
