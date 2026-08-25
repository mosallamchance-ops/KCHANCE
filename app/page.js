import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Countdown from "@/components/Countdown";
import Link from "next/link";

export const revalidate = 0;

export default async function HomePage() {
  const { data: draws, error } = await supabaseAdmin
    .from("draws")
    .select("id, ticket_price, total_tickets, sold_tickets, end_at, status, products(name, image_url, product_value)")
    .eq("status", "active")
    .order("end_at", { ascending: true });

  if (error) {
    return <p className="text-[var(--ember)]">حدث خطأ في تحميل السحوبات: {error.message}</p>;
  }

  return (
    <div>
      <div className="rounded-2xl bg-[var(--ink)] text-white p-6 sm:p-10 mb-8 relative overflow-hidden">
        <p className="text-[var(--gold)] font-bold text-sm mb-2">تذكرتك القادمة قد تغيّر كل شيء</p>
        <h1 className="font-display text-3xl sm:text-4xl leading-relaxed mb-2">
          اشترِ تذكرة. ادخل السحب. اربح.
        </h1>
        <p className="text-white/70 text-sm sm:text-base max-w-md">
          سحوبات موثوقة على منتجات حقيقية وجوائز نقدية — كل تذكرة رقم فريد، وكل سحب نتيجة عادلة وشفافة.
        </p>
      </div>

      <h2 className="font-display text-2xl text-[var(--ink)] mb-4">السحوبات النشطة</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {draws?.map((draw) => {
          const remaining = draw.total_tickets - draw.sold_tickets;
          const soldPct = Math.min(100, Math.round((draw.sold_tickets / draw.total_tickets) * 100));

          return (
            <Link key={draw.id} href={`/draws/${draw.id}`} className="ticket-card">
              <div className="aspect-video bg-gray-100 overflow-hidden">
                {draw.products?.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draw.products.image_url}
                    alt={draw.products.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="ticket-tear">
                <span className="notch-l" />
                <span className="notch-r" />
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg">{draw.products?.name}</h3>
                <p className="font-display text-xl text-[var(--emerald)]">${draw.products?.product_value}</p>

                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--gold)]" style={{ width: `${soldPct}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {draw.sold_tickets} / {draw.total_tickets} تذكرة — {remaining} متبقية
                </p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-bold">${draw.ticket_price} / تذكرة</span>
                  <Countdown endAt={draw.end_at} />
                </div>

                <button className="btn-primary w-full mt-3">شراء تذاكر</button>
              </div>
            </Link>
          );
        })}
        {draws?.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-12">لا توجد سحوبات نشطة حالياً.</p>
        )}
      </div>
    </div>
  );
}
