"use client"

import { Input } from "@/components/ui/input"
import { useState } from "react"

export default function UserInput() {
  const [value, setValue] = useState("")

  return (
    <div className="w-full max-w-sm space-y-2">
      <Input
        placeholder="Enter URL here..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}