"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/create", label: "Create Sheet" },
    { href: "/scan", label: "Scan" },
    { href: "/results", label: "Results", disabled: true },
  ];

  return (
    <nav className="no-print bg-white border-b border-gray-200 h-16 flex items-center px-6 shadow-sm">
      <div className="flex items-center gap-3 mr-8">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Grado Ph
        </Link>
        <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
          Phase 2a 🟡 Active
        </span>
      </div>

      <div className="flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          if (link.disabled) {
            return (
              <span
                key={link.href}
                className="px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                title="Coming soon"
              >
                {link.label}
              </span>
            );
          }
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
