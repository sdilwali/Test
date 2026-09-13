"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./tabbar.module.css";

const TABS = [
  { href: "/windows", label: "Windows" },
  { href: "/coverage", label: "Coverage" },
  { href: "/review", label: "Review" },
  { href: "/kids", label: "Kids" },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.bar} aria-label="Main">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.tick} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
