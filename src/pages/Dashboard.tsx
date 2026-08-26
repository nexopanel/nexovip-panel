import {
  AddressesTab,
} from "@/components/panel/addresses-tab";
import { LinksTab } from "@/components/panel/links-tab";
import { OverviewTab } from "@/components/panel/overview";
import { PanelShell, type PanelTab } from "@/components/panel/shell";
import { SecurityTab } from "@/components/panel/security-tab";
import { useAuth } from "@/hooks/use-auth";
import { usePanelData } from "@/hooks/use-panel";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<PanelTab>("overview");

  const { links, addresses, stats, notifications, unreadCount } = usePanelData();

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <PanelShell
      active={tab}
      onNavigate={setTab}
      onLogout={handleLogout}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "overview" && <OverviewTab stats={stats} />}
          {tab === "links" && <LinksTab links={links} />}
          {tab === "ips" && <AddressesTab addresses={addresses} />}
          {tab === "security" && <SecurityTab />}
        </motion.div>
      </AnimatePresence>
    </PanelShell>
  );
}
