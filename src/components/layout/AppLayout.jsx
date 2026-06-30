import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Intercom from "@/components/intercom/Intercom";
import { useTicketSoundAlert } from "@/hooks/useTicketSoundAlert";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  useTicketSoundAlert();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? "lg:ml-16" : "lg:ml-60"}`}>
        <TopBar />
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
        <Intercom />
      </div>
    </div>
  );
}
