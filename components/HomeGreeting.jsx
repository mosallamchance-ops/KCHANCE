"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageHeader from "@/components/PageHeader";

function greetingWord() {
  const h = new Date().getHours();
  if (h < 5) return "مساء الخير";
  if (h < 12) return "صباح الخير";
  if (h < 18) return "مساء الخير";
  return "مساء الخير";
}

export default function HomeGreeting() {
  const [name, setName] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(function () {
    async function load() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setLoaded(true);
        return;
      }
      const { data } = await supabase.from("users").select("first_name").eq("id", user.id).single();
      setName(data?.first_name || null);
      setLoaded(true);
    }
    load();
  }, []);

  if (!loaded || !name) return null;

  return <PageHeader greeting={greetingWord() + "، " + name} showBalance />;
}
