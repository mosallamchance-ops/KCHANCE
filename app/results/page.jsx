import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 60;

export default async function ResultsPage() {
  const { data: results, error } = await supabaseAdmin
    .from("public_results")
    .select("*")
    .limit(50);

  if (error) {
    return <p className="text-red-600">حدث خطأ في تحميل النتائج: {error.message}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">🎁 الفائزون</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {results?.map((r) => (
          <div key={r.id} className="card">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                {r.product_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.product_image} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <p className="font-bold">{r.product_name}</p>
                <p className="text-sm text-gray-500">الفائز: {r.winner_display_name}</p>
                {r.winning_ticket_number && (
                  <p className="text-sm text-gray-500">التذكرة: #{r.winning_ticket_number}</p>
                )}
                <p className="text-sm text-gray-500">
                  نوع الجائزة: {r.prize_type === "product" ? "بيع كامل للتذاكر" : `جائزة نقدية $${r.prize_amount}`}
                </p>
                <p className="text-sm text-gray-400">{new Date(r.draw_date).toLocaleDateString("ar")}</p>
              </div>
            </div>
          </div>
        ))}
        {results?.length === 0 && <p className="text-gray-500">لا توجد نتائج بعد.</p>}
      </div>
    </div>
  );
}
