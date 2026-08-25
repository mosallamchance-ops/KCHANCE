import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "منصة السحوبات",
  description: "منصة بيع تذاكر رقمية والدخول في سحوبات على منتجات"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="bg-[var(--card)] border-b border-[var(--line)] sticky top-0 z-20">
          <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
            <a href="/" className="font-display text-2xl text-[var(--emerald)] tracking-wide">
              منصة السحوبات
            </a>
            <Nav />
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
