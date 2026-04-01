"use client"

import { Input } from "@/components/ui/input"

interface UserInputProps {
  value: string;
  setValue: (value: string) => void;
}

export default function UserInput({ value, setValue }: UserInputProps) {
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