import AppHeader from "@/components/custom/dashboard/AppHeader"
import { AppSidebar } from "@/components/custom/dashboard/AppSidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import React from "react"

function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <div className="flex flex-1 flex-col">
        <AppHeader />
         <div className="p-5 flex-1">
          {children}
         </div>
      </div>
    </SidebarProvider>
  )
}

export default DashboardLayout