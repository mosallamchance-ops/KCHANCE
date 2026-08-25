import Link from "next/link";

export default function AccountPage() {
  const links = [
    { href: "/account/edit-profile", label: "معلوماتي الشخصية", icon: "👤" },
    { href: "/account/tickets", label: "تذاكري", icon: "🎟️" },
    { href: "/account/prizes", label: "جوائزي", icon: "🎁" },
    { href: "/wallet", label: "رصيدي وسجل المعاملات", icon: "💳" },
    { href: "/support", label: "الدعم", icon: "💬" },
    { href: "/account/change-password", label: "تغيير كلمة المرور", icon: "🔒" }
  ];

  return (
    <div>
      <h1 className="font-display text-2xl mb-4">حسابي</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {links.map(function (l) {
          return (
            <Link
              key={l.href}
              href={l.href}
              className="card text-center hover:shadow-md transition flex flex-col items-center gap-2 py-6"
            >
              <span className="text-2xl">{l.icon}</span>
              <span className="font-bold">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
