import "./globals.css";
import NotificationBell from "@/components/NotificationBell";

export const metadata = {
  title: "منصة السحوبات",
  description: "منصة بيع تذاكر رقمية والدخول في سحوبات على منتجات"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
            <a href="/" className="text-xl font-extrabold text-brand-600">
              منصة السحوبات
            </a>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <a href="/" className="hover:text-brand-600">
                السحوبات
              </a>
              <a href="/results" className="hover:text-brand-600">
                النتائج
              </a>
              <a href="/account" className="hover:text-brand-600">
                حسابي
              </a>
              <a href="/wallet" className="hover:text-brand-600">
                رصيدي
              </a>
              <NotificationBell />
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
