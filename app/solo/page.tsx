"use client"

import { useSearchParams } from "next/navigation"
import SoloGame from "@/components/solo-game"

export default function SoloPage() {
  const searchParams = useSearchParams()
  const langParam = searchParams.get("lang")
  const language = langParam === "tr" ? "tr" : "en"

  return <SoloGame language={language} />
}
