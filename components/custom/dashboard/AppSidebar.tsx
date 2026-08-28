"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { LayoutGrid } from "lucide-react"
import { usePathname } from "next/navigation"

export function AppSidebar() {
  const path = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={40}
            height={40}
          />

          <h2 className="text-xl font-bold">
            WhizBoard
          </h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <Button className="w-full">
            + Create New Board
          </Button>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            My Boards
          </SidebarGroupLabel>

          <SidebarMenuButton className="p-5" isActive={true}>
            <LayoutGrid />
            <span>All Files</span>
          </SidebarMenuButton>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  )
}