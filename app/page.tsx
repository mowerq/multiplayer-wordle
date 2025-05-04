"use client"

import { useEffect } from "react"
import HomePage from "@/components/home-page"
import { useTranslation } from "react-i18next"

export default function Home() {
  const { i18n } = useTranslation()

  useEffect(() => {
    // Get language preference from localStorage if available
    if (typeof window !== "undefined") {
      const savedLanguage = localStorage.getItem("wordle_language")
      if (savedLanguage === "en" || savedLanguage === "tr") {
        i18n.changeLanguage(savedLanguage)
      }
    }
  }, [i18n])

  return <HomePage />
}
