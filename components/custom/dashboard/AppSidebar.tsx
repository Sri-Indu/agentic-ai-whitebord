"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarGroupLabel,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  Archive,
  LayoutGrid,
  Settings,
  Sparkles,
  Users,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { useUser } from "@clerk/nextjs"

export function AppSidebar() {
  const path = usePathname()
  const { user } = useUser()

  return (
    <Sidebar collapsible="icon" className="h-screen">
     <SidebarHeader className="p-4">
  <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
    <Image
      src="/logo.svg"
      alt="Logo"
      width={40}
      height={40}
      className="group-data-[collapsible=icon]:w-8"
    />

    <h2 className="text-xl font-bold group-data-[collapsible=icon]:hidden">
      Whizboard
    </h2>
  </div>
</SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <Button>
            + Create New Board
          </Button>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            My Boards
          </SidebarGroupLabel>

          <SidebarMenuButton
            className="p-5"
            isActive={path === "/dashboard"}
          >
            <LayoutGrid />
            <span>All Files</span>
          </SidebarMenuButton>

          <SidebarMenuButton
            className="p-5 mt-2"
            isActive={path === "/shared-files"}
          >
            <Users />
            <span>Shared</span>
          </SidebarMenuButton>

          <SidebarMenuButton
            className="p-5 mt-2"
            isActive={path === "/archieved"}
          >
            <Archive />
            <span>Archieved</span>
          </SidebarMenuButton>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            Others
          </SidebarGroupLabel>

          <SidebarMenuButton
            className="p-5"
            isActive={path === "/ai-helper"}
          >
            <Sparkles />
            <span>AI Helper</span>
          </SidebarMenuButton>

          <SidebarMenuButton
            className="p-5"
            isActive={path === "/settings"}
          >
            <Settings />
            <span>Settings</span>
          </SidebarMenuButton>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto p-4">
        <Button className="w-full">
          + Create New Board
        </Button>

        <div className="p-4 my-3 border rounded-md">
          <h2 className="text-sm flex justify-between mb-1">
            2 files created
            <span>total 3</span>
          </h2>

          <Progress
            value={66}
            className="h-2 mt-2"
          />
        </div>

        <div className="flex items-center gap-2 p-3 border rounded-md">
          {user?.imageUrl && (
            <Image
             src={user.imageUrl}
             alt="User Image"
             width={40}
             height={40}
             className="rounded-full"
           />
        )}

          <h2>
            {user?.firstName} {user?.lastName}
          </h2>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}