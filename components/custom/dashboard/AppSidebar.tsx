import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"
import Image from "next/image"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            
        </div>
        <Image
          src="/logo.svg"
          alt="Logo"
          width={40}
          height={40}
        />
        <h2 className="text-xl font-bold">WhizBoard</h2>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  )
}