import ProjectList from "@/components/custom/dashboard/ProjectList"
import WelcomeBanner from "@/components/custom/dashboard/WelcomeBanner"
import React from "react"

function DashboardPage() {
  return (
    <div className="p-4">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Project List/Empty State */}
      <ProjectList />
    </div>
  )
}

export default DashboardPage