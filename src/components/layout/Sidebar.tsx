"use client";

import Link from "next/link";
import Image from "next/image";
import { Drawer } from "antd";
import { MonitorCog } from "lucide-react";

import routes from "@/config/routes";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  useLayoutStore,
} from "@/store/useLayoutStore";
import { useThemeStore } from "@/store/useThemeStore";

import { SidebarMenu } from "./SidebarMenu";
import { UserPanel } from "./UserPanel";

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href={routes.dashboard}
      className="text-brand flex h-16 items-center gap-2 px-4"
    >
      {/* <MonitorCog size={26} className="shrink-0" /> */}
      <Image
        src={"/logo-d-tech.png"}
        alt={"logo-d-tech"}
        unoptimized
        width={60}
        height={50}
        className="object-cover"
      />
      {!collapsed && (
        <span className="truncate text-lg font-bold tracking-tight">
          D-Tech Admin
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const setMobileOpen = useLayoutStore((state) => state.setMobileOpen);
  const mode = useThemeStore((state) => state.mode);

  return (
    <div className="bg-sidebar flex h-full flex-col">
      <Logo collapsed={collapsed} />
      <div className="scrollbar-thin flex-1 overflow-y-auto py-2">
        <SidebarMenu
          collapsed={collapsed}
          theme={mode}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>
      <div className="border-t border-line p-2">
        <UserPanel collapsed={collapsed} />
      </div>
    </div>
  );
}

/**
 * Sidebar cố định trên desktop (250px <-> 64px) và chuyển thành Drawer trượt
 * trên mobile — đúng hành vi SideNavigation + MobileMenu của bản gốc.
 */
export function Sidebar() {
  const collapsed = useLayoutStore((state) => state.collapsed);
  const mobileOpen = useLayoutStore((state) => state.mobileOpen);
  const setMobileOpen = useLayoutStore((state) => state.setMobileOpen);

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-line shadow-card transition-[width] duration-200 md:block",
        )}
        style={{
          width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
        }}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        width={SIDEBAR_WIDTH}
        closable={false}
        rootClassName="md:hidden"
        styles={{ body: { padding: 0 } }}
      >
        <SidebarContent collapsed={false} />
      </Drawer>
    </>
  );
}

export default Sidebar;
