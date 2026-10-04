'use client'
import { ReactNode } from 'react'

interface TabBarProps {
  tabs: { key: string; label: string; icon: ReactNode }[]
  active: string
  onTabChange: (key: string) => void
}

export default function TabBar({ tabs, active, onTabChange }: TabBarProps) {
  return (
    <nav className="tab-bar flex justify-around">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            active === tab.key || active.startsWith(tab.key + '/') ? 'text-blue' : 'text-text-secondary'
          }`}
        >
          <span className="text-xl flex items-center justify-center">{tab.icon}</span>
          <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
