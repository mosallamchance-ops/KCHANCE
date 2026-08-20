import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Countdown from "@/components/Countdown";
import Link from "next/link";

export const revalidate = 0; // no caching while testing

export default async function HomePage() {
  const { data: draws, error } = await supabaseAdmin
    .from("draws")
    .select("id, ticket_price, total_tickets, sold_tickets, end_at, status, products(name, image_url, product_value)")
    .eq("status", "active")
    .order("end_at", { ascending: true });

  if (error) {
    return <p className="text-red-600">حدث خطأ في تحميل السحوبات: {error.message}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">السحوبات النشطة</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {draws?.map((draw) => (
          <Link key={draw.id} href={`/draws/${draw.id}`} className="card hover:shadow-md transition block">
            <div className="aspect-video bg-gray-100 rounded-xl mb-3 overflow-hidden">
              {draw.products?.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draw.products.image_url} alt={draw.products.name} className="w-full h-full object-cover" />
              )}
            </div>
            <h2 className="font-bold text-lg">{draw.products?.name}</h2>
            <p className="text-brand-600 font-bold">${draw.products?.product_value}</p>
            <p className="text-sm text-gray-500 mt-1">سعر التذكرة: ${draw.ticket_price}</p>
            <p className="text-sm text-gray-500">
              {draw.sold_tickets} / {draw.total_tickets} تذكرة مباعة
            </p>
            <p className="text-sm text-gray-500">
              {draw.total_tickets - draw.sold_tickets} تذكرة متبقية
            </p>
            <p className="text-sm mt-2">
              الوقت المتبقي: <Countdown endAt={draw.end_at} />
            </p>
            <button className="btn-primary w-full mt-3">شراء تذاكر</button>
          </Link>
        ))}
        {draws?.length === 0 && <p className="text-gray-500">لا توجد سحوبات نشطة حالياً.</p>}
      </div>
    </div>
  );
}
