import "./globals.css";
import Nav from "@/components/Nav";
import BottomNav from "@/components/BottomNav";

export const metadata = {
  title: "فُرصة",
  description: "منصة بيع تذاكر رقمية والدخول في سحوبات على منتجات"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="hidden md:block bg-[var(--card)] border-b border-[var(--line)] sticky top-0 z-20">
          <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
            <a href="/" className="font-display text-2xl text-[var(--emerald)] tracking-wide">
              فُرصة
            </a>
            <Nav />
          </div>
        </header>

        <header className="md:hidden bg-[var(--card)] border-b border-[var(--line)] sticky top-0 z-20 px-4 py-3">
          <a href="/" className="font-display text-xl text-[var(--emerald)] tracking-wide">
            فُرصة
          </a>
        </header>
        <main className="max-w-6xl mx-auto p-4 pb-24 md:pb-4">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
