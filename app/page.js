import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Countdown from "@/components/Countdown";
import HomeGreeting from "@/components/HomeGreeting";
import Link from "next/link";
import { TicketIcon, WalletIcon, TrophyIcon, ShieldCheckIcon } from "@/components/icons";

export const revalidate = 0;

function formatSyp(n) {
  return new Intl.NumberFormat("ar").format(Math.round(n || 0));
}

const howItWorks = [
  { icon: TicketIcon, title: "اختر السحب", body: "تصفّح السحويات المتاحة واختر السحب الذي تفضّله" },
  { icon: WalletIcon, title: "اشترِ تذكرتك", body: "ادفع من رصيد محفظتك بكل أمان وسهولة" },
  { icon: TrophyIcon, title: "انتظر النتيجة", body: "عند السحب، يفوز صاحب التذكرة الرابحة بالجائزة" }
];

export default async function HomePage() {
  const { data: draws, error } = await supabaseAdmin
    .from("draws")
    .select(
      "id, ticket_price, total_tickets, sold_tickets, end_at, status, pinned, products(name, image_url, product_value)"
    )
    .eq("status", "active")
    .order("pinned", { ascending: false })
    .order("end_at", { ascending: true });

  const { data: winners } = await supabaseAdmin.from("public_results").select("*").limit(2);

  if (error) {
    return <p className="text-[var(--ember)]">حدث خطأ في تحميل السحوبات: {error.message}</p>;
  }

  const [featured, ...rest] = draws || [];

  return (
    <div className="pb-6">
      <HomeGreeting />

      <h2 className="font-bold text-lg mb-3">السحويات المتاحة</h2>

      {!featured && <p className="text-gray-500 text-center py-12">لا توجد سحوبات نشطة حالياً.</p>}

      {featured && <FeaturedDrawCard draw={featured} />}

      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {rest.map(function (draw) {
            return <SmallDrawCard key={draw.id} draw={draw} />;
          })}
        </div>
      )}

      <div className="card mt-8">
        <h2 className="font-bold text-lg mb-4 text-center">كيف تعمل فُرصة؟</h2>
        <div className="grid grid-cols-3 gap-2">
          {howItWorks.map(function (s, i) {
            const Icon = s.icon;
            return (
              <div key={s.title} className="text-center flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-[var(--paper)] flex items-center justify-center mb-2 relative">
                  <Icon className="w-5 h-5 text-[var(--emerald)]" />
                  <span className="absolute -top-1 -left-1 w-[18px] h-[18px] rounded-full bg-[var(--gold)] text-[var(--ink)] text-[0.6rem] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <p className="font-bold text-xs mb-1">{s.title}</p>
                <p className="text-[0.7rem] text-gray-500 leading-snug">{s.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      {winners && winners.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">آخر الفائزين</h2>
            <Link href="/results" className="text-xs font-bold text-[var(--emerald)]">
              عرض الكل ‹
            </Link>
          </div>
          <div className="space-y-2">
            {winners.map(function (w) {
              return (
                <div key={w.id} className="card flex items-center justify-between text-sm py-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4 text-[var(--emerald)]" strokeWidth={2.2} />
                    <p>
                      فاز بـ <span className="font-bold">{w.product_name}</span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 font-mono-num">#{w.winning_ticket_number}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DrawStat({ label, value }) {
  return (
    <div className="stat-box">
      <p className="font-mono-num font-bold text-sm">{value}</p>
      <p className="text-[0.65rem] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function FeaturedDrawCard({ draw }) {
  const remaining = draw.total_tickets - draw.sold_tickets;
  const soldPct = Math.min(100, Math.round((draw.sold_tickets / draw.total_tickets) * 100));

  return (
    <div className="ticket-card">
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
        <span className="badge-verified absolute top-3 right-3 z-10 bg-[var(--card)]">
          <ShieldCheckIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
          موثّق
        </span>
        {draw.products?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draw.products.image_url} alt={draw.products.name} className="w-full h-full object-cover" />
        )}
      </div>

      <div className="ticket-tear">
        <span className="notch-l" />
        <span className="notch-r" />
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-3">{draw.products?.name}</h3>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <DrawStat label="إجمالي التذاكر" value={formatSyp(draw.total_tickets)} />
          <DrawStat label="تم البيع" value={formatSyp(draw.sold_tickets)} />
          <DrawStat label="المتبقي" value={formatSyp(remaining)} />
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">سعر التذكرة</span>
          <span className="font-mono-num font-bold">{formatSyp(draw.ticket_price)} ل.س</span>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--gold)]" style={{ width: soldPct + "%" }} />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-left">{soldPct}%</p>

        <div className="flex items-center justify-between mt-1 mb-3">
          <span className="text-xs text-gray-500">ينتهي خلال</span>
          <Countdown endAt={draw.end_at} />
        </div>

        <Link href={"/draws/" + draw.id} className="btn-primary w-full block text-center">
          شراء تذاكر
        </Link>

        <p className="text-[0.7rem] text-gray-400 mt-2 text-center leading-relaxed">
          إذا لم تكتمل التذاكر، يفوز الرابح بـ 80% من المبلغ المحصَّل نقداً بدلاً من المنتج.
        </p>
      </div>
    </div>
  );
}

function SmallDrawCard({ draw }) {
  const soldPct = Math.min(100, Math.round((draw.sold_tickets / draw.total_tickets) * 100));

  return (
    <Link href={"/draws/" + draw.id} className="ticket-card">
      <div className="aspect-square bg-gray-100 overflow-hidden relative">
        <span className="badge-verified absolute top-2 right-2 z-10 bg-[var(--card)] text-[0.65rem] px-1.5 py-1">
          <ShieldCheckIcon className="w-3 h-3" strokeWidth={2.2} />
          موثّق
        </span>
        {draw.products?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draw.products.image_url} alt={draw.products.name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-sm truncate mb-1">{draw.products?.name}</p>
        <p className="text-[0.7rem] text-gray-500">
          تم بيع {formatSyp(draw.sold_tickets)} من {formatSyp(draw.total_tickets)}
        </p>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1.5">
          <div className="h-full bg-[var(--gold)]" style={{ width: soldPct + "%" }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[0.65rem] text-gray-400">{soldPct}%</span>
          <Countdown endAt={draw.end_at} />
        </div>
      </div>
    </Link>
  );
}
