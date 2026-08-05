import React from 'react';
import { LayoutDashboard, Coins, PlusCircle, BarChart3, Download } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  coinCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  coinCount
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      id: 'collection',
      label: 'Sammlung',
      icon: <Coins className="w-5 h-5" />,
      badge: coinCount
    },
    {
      id: 'add',
      label: 'Hinzufügen',
      icon: <PlusCircle className="w-5 h-5" />
    },
    {
      id: 'statistics',
      label: 'Analysen',
      icon: <BarChart3 className="w-5 h-5" />
    },
    {
      id: 'backup',
      label: 'Backup',
      icon: <Download className="w-5 h-5" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#1f1814]/95 backdrop-blur-lg border-t border-[#3d2f26] px-2 py-1.5 sm:px-6 max-w-full overflow-x-hidden">
      <div className="max-w-md md:max-w-2xl mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-1.5 sm:px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-amber-400 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className={`relative p-1 rounded-lg transition-transform ${
                isActive ? 'scale-110 bg-amber-500/10 text-amber-400' : ''
              }`}>
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-slate-950 bg-amber-400 rounded-full font-mono">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-xs tracking-tight">
                {item.label}
              </span>

              {isActive && (
                <span className="absolute -bottom-1 w-6 h-0.5 bg-amber-400 rounded-full shadow-sm shadow-amber-400/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
