"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brandBlock">
        <div className="brandEyebrow">Nepal Tourism Board · MoCTCA</div>
        <div className="brandTitle">NTB Smart Heritage Command Center</div>
        <p className="brandSub">
          Saalik Tech operational console for valley monuments, Unseen Sites dispersion, and licensed guide livelihoods.
        </p>
      </div>
      <ul className="navList">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className={`navLink${active ? " navLinkActive" : ""}`}>
                <span className="navLabel">{item.label}</span>
                <span className="navDesc">{item.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="sidebarFoot">
        Demo seed: nepal_heritage_seed · 8 zones · NTB VIP Demo Mode · Not for operational dispatch without field verification.
      </div>
    </aside>
  );
}
