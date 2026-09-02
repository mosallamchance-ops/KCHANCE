import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 0;

export default async function ResultsPage() {
  const { data: results, error } = await supabaseAdmin.from("public_results").select("*").limit(50);

  if (error) {
    return <p className="text-[var(--ember)]">حدث خطأ في تحميل النتائج: {error.message}</p>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">🎁 الفائزون</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {results?.map(function (r) {
          return (
            <div key={r.id} className="ticket-card flex">
              <div className="w-28 h-28 bg-gray-100 flex-shrink-0">
                {r.product_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.product_image} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-4 flex-1">
                <p className="font-bold">{r.product_name}</p>
                <p className="text-sm text-gray-500">الفائز: {r.winner_display_name}</p>
                {r.winning_ticket_number && (
                  <p className="text-sm text-gray-500 font-mono-num">التذكرة: #{r.winning_ticket_number}</p>
                )}
                <p className="text-sm text-[var(--emerald)] font-bold mt-1">
                  {r.prize_type === "product" ? "بيع كامل للتذاكر" : "جائزة نقدية " + r.prize_amount + " ل.س"}
                </p>
                <p className="text-xs text-gray-400 mt-1">{new Date(r.draw_date).toLocaleDateString("ar")}</p>
              </div>
            </div>
          );
        })}
        {results?.length === 0 && <p className="text-gray-500 col-span-full text-center py-12">لا توجد نتائج بعد.</p>}
      </div>
    </div>
  );
}
