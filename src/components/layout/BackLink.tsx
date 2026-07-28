"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Consistent "go back" affordance for any page reached from a dashboard. */
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"
    >
      <ArrowLeft className="w-4 h-4" /> {label}
    </Link>
  );
}
