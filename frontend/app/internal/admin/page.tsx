"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InternalAdminLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/professional/dashboard");
  }, [router]);

  return null;
}
