"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { NavLink, useLocation } from "react-router-dom"
import { LucideIcon, Menu, X, Mic, MicOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { SeraLogo } from "@/components/ui/sera-logo"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(items[0].name)
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const currentItem = items.find(item => item.url === location.pathname)
    if (currentItem) setActiveTab(currentItem.name)
  }, [location.pathname, items])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div
      className={cn(
        "fixed top-4 left-4 z-50",
        className,
      )}
    >
      {/* === Desktop / Tablet Nav === */}
      {!isMobile && (
        <div className="flex items-center gap-3 glass-strong py-1 px-2 rounded-full shadow-lg backdrop-blur-lg bg-white/10 dark:bg-black/40 border border-white/20">
          {/* Logo */}
          <div className="px-3 py-1">
            <SeraLogo size="sm" showText={true} animated={false} />
          </div>
          
          <div className="w-px h-6 bg-border/50" />
          
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.name
            return (
              <NavLink
                key={item.name}
                to={item.url}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "relative cursor-pointer text-sm font-semibold px-4 py-2 rounded-full transition-colors",
                  "text-foreground/80 hover:text-primary",
                  isActive && "bg-muted text-primary",
                )}
              >
                <span className="hidden md:inline">{item.name}</span>
                <span className="md:hidden">
                  <Icon size={18} strokeWidth={2.5} />
                </span>
                {isActive && (
                  <motion.div
                    layoutId="lamp"
                    className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </NavLink>
            )
          })}
        </div>
      )}

      {/* === Mobile Nav (Hamburger Menu) === */}
      {isMobile && (
        <div className="relative flex items-center gap-3">
          {/* Logo for mobile */}
          <div className="glass-strong rounded-full px-3 py-2 backdrop-blur-lg bg-black/40 border border-white/20">
            <SeraLogo size="sm" showText={false} animated={false} />
          </div>
          
          <motion.button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-3 rounded-full glass-strong backdrop-blur-lg bg-black/40 text-white shadow-lg border border-white/20"
            whileTap={{ scale: 0.9 }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="absolute mt-3 top-full left-0 w-56 glass-strong backdrop-blur-xl bg-black/60 text-white rounded-2xl shadow-xl border border-white/20 overflow-hidden"
              >
                {items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.name
                  return (
                    <NavLink
                      key={item.name}
                      to={item.url}
                      onClick={() => {
                        setActiveTab(item.name)
                        setMenuOpen(false)
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all",
                        "hover:bg-white/10",
                        isActive && "bg-primary/20 text-primary",
                      )}
                    >
                      <Icon size={18} strokeWidth={2.5} />
                      <span>{item.name}</span>
                    </NavLink>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
