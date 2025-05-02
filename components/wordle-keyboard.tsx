"use client"

import { Button } from "@/components/ui/button"
import type { LetterState } from "@/lib/words"
import { useEffect, useCallback } from "react"

interface WordleKeyboardProps {
  onKeyPress: (key: string) => void
  keyStates: Record<string, LetterState>
  disabled?: boolean
}

export default function WordleKeyboard({ onKeyPress, keyStates, disabled = false }: WordleKeyboardProps) {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
  ]

  // Handle physical keyboard input
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return

      const key = e.key.toUpperCase()

      if (key === "ENTER") {
        onKeyPress("ENTER")
      } else if (key === "BACKSPACE" || key === "DELETE") {
        onKeyPress("BACKSPACE")
      } else if (/^[A-Z]$/.test(key)) {
        onKeyPress(key)
      }
    },
    [onKeyPress, disabled],
  )

  // Add physical keyboard support
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])

  const getKeyStyle = (key: string) => {
    if (key === "ENTER" || key === "BACKSPACE") {
      return "bg-slate-600 hover:bg-slate-500"
    }

    const state = keyStates[key]
    if (state === "correct") {
      return "bg-green-600 hover:bg-green-500 text-white"
    } else if (state === "present") {
      return "bg-yellow-600 hover:bg-yellow-500 text-white"
    } else if (state === "absent") {
      return "bg-gray-700 hover:bg-gray-600 text-white"
    }

    return "bg-slate-400 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500"
  }

  return (
    <div className="w-full">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1 my-1">
          {row.map((key) => (
            <Button
              key={key}
              className={`${getKeyStyle(key)} ${key === "ENTER" || key === "BACKSPACE" ? "px-2 text-xs" : "px-1 sm:px-3"} h-12 font-bold`}
              onClick={() => onKeyPress(key)}
              disabled={disabled}
            >
              {key === "BACKSPACE" ? "⌫" : key}
            </Button>
          ))}
        </div>
      ))}
    </div>
  )
}
