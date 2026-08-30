import { UserButton } from "@clerk/nextjs"
import React from "react"

function DashboardPage() {
  return (
    <div className="p-4">
      <UserButton />
    </div>
  )
}

export default DashboardPage