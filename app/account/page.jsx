import Link from "next/link";

export default function AccountPage() {
  const links = [
    { href: "/account/tickets", label: "تذاكري" },
    { href: "/account/prizes", label: "جوائزي" },
    { href: "/wallet", label: "رصيدي وسجل المعاملات" }
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">حسابي</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="card text-center font-bold hover:shadow-md transition">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
