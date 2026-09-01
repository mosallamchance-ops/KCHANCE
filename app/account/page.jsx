"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import PageHeader from "@/components/PageHeader";
import {
  UserIcon,
  PhoneVerifyIcon,
  PinIcon,
  LockIcon,
  DeviceIcon,
  BellIcon,
  ShieldQuestionIcon,
  ShieldCheckIcon,
  DocumentIcon,
  HeadsetIcon,
  ChevronLeftIcon,
  LogoutIcon,
  CameraIcon
} from "@/components/icons";

function initials(firstName) {
  if (!firstName) return "؟";
  return firstName.trim().charAt(0);
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ wonCount: 0, activeTickets: 0 });
  const [loading, setLoading] = useState(true);
  const [notifyResults, setNotifyResults] = useState(true);

  useEffect(function () {
    async function load() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("first_name, last_name, phone, created_at")
        .eq("id", user.id)
        .single();
      setProfile(userRow);

      const { count: wonCount } = await supabase
        .from("winners")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: activeTickets } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      setStats({ wonCount: wonCount ?? 0, activeTickets: activeTickets ?? 0 });
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const fullName =
    profile && (profile.first_name || profile.last_name)
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
      : "مستخدم فُرصة";
  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear() : "—";

  const accountRows = [
    { href: "/account/edit-profile", label: "البيانات الشخصية", icon: UserIcon },
    { href: "/account/edit-profile", label: "رقم الهاتف والتحقق", icon: PhoneVerifyIcon },
    { href: "/account/prizes", label: "العناوين واستلام الجوائز", icon: PinIcon }
  ];

  const securityRows = [
    { href: "/account/change-password", label: "رمز الدخول", icon: LockIcon },
    { href: "/account/change-password", label: "الأجهزة المسجّلة", icon: DeviceIcon }
  ];

  const supportRows = [
    { href: "/support/how-it-works", label: "كيف تعمل السحويات؟", icon: ShieldQuestionIcon },
    { href: "/support/integrity", label: "النزاهة وطريقة اختيار الفائز", icon: ShieldCheckIcon },
    { href: "/support/terms", label: "الشروط وسياسة الخصوصية", icon: DocumentIcon },
    { href: "/support", label: "تواصل معنا", icon: HeadsetIcon }
  ];

  if (loading) {
    return (
      <div>
        <PageHeader title="حسابي" />
        <p className="text-gray-400 text-sm text-center py-12">جارِ التحميل…</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <PageHeader title="حسابي" />

      {/* Profile card */}
      <div className="card flex items-center gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <div className="avatar-circle w-16 h-16 text-2xl">{initials(profile?.first_name)}</div>
          <button
            aria-label="تغيير الصورة"
            className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-[var(--emerald)] text-white flex items-center justify-center border-2 border-[var(--card)]"
          >
            <CameraIcon className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg truncate">{fullName}</p>
          <p className="text-sm text-gray-500 font-mono-num" dir="ltr">
            {profile?.phone || "—"}
          </p>
          <span className="badge-verified mt-1">
            <ShieldCheckIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
            حساب موثّق
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="stat-box">
          <p className="font-display text-xl text-[var(--emerald)]">{memberSince}</p>
          <p className="text-xs text-gray-500 mt-0.5">عضو منذ</p>
        </div>
        <div className="stat-box">
          <p className="font-display text-xl text-[var(--emerald)]">{stats.wonCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">سحويات فزت بها</p>
        </div>
        <div className="stat-box">
          <p className="font-display text-xl text-[var(--emerald)]">{stats.activeTickets}</p>
          <p className="text-xs text-gray-500 mt-0.5">تذاكر نشطة</p>
        </div>
      </div>

      <SettingsSection title="الحساب" rows={accountRows} />
      <SettingsSection title="الأمان" rows={securityRows}>
        <div className="settings-row">
          <div className="flex items-center gap-3">
            <BellIcon className="w-5 h-5 text-[var(--ink)]/70" />
            <span className="font-bold text-sm">إشعارات نتائج السحب</span>
          </div>
          <button
            onClick={function () {
              setNotifyResults(!notifyResults);
            }}
            aria-pressed={notifyResults}
            className={
              "w-11 h-6 rounded-full relative transition-colors " +
              (notifyResults ? "bg-[var(--emerald)]" : "bg-gray-300")
            }
          >
            <span
              className={
                "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform " +
                (notifyResults ? "translate-x-[-1px] right-[22px]" : "right-0.5")
              }
            />
          </button>
        </div>
      </SettingsSection>

      {/* New: الدعم والشفافية */}
      <SettingsSection title="الدعم والشفافية" rows={supportRows} />

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--ember)] text-[var(--ember)] font-bold mb-4"
      >
        <LogoutIcon className="w-5 h-5" />
        تسجيل الخروج
      </button>

      <div className="flex items-start gap-2 text-xs text-gray-500 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3">
        <ShieldCheckIcon className="w-8 h-8 text-[var(--emerald)] flex-shrink-0" strokeWidth={1.6} />
        <p>بياناتك محمية ولا نعرض اسمك الكامل في النتائج. نلتزم بأعلى معايير الأمان والخصوصية لحماية معلوماتك.</p>
      </div>
    </div>
  );
}

function SettingsSection({ title, rows, children }) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-sm text-gray-500 mb-2 px-1">{title}</h2>
      <div className="settings-group">
        {rows.map(function (row) {
          const Icon = row.icon;
          return (
            <Link key={row.label} href={row.href} className="settings-row">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-[var(--ink)]/70" />
                <span className="font-bold text-sm">{row.label}</span>
              </div>
              <ChevronLeftIcon className="w-4 h-4 text-[var(--line)]" />
            </Link>
          );
        })}
        {children}
      </div>
    </div>
  );
}
