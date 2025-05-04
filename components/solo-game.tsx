"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { evaluateGuess, isValidWord, type LetterState, getRandomWord } from "@/lib/words"
import { ArrowLeft, RefreshCw } from "lucide-react"
import WordleKeyboard from "./wordle-keyboard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTranslation } from "react-i18next"

interface SoloGameProps {
  initialWord?: string
  language?: "en" | "tr"
}

export default function SoloGame({ initialWord, language = "en" }: SoloGameProps) {
  const { t, i18n } = useTranslation()
  const router = useRouter()

  // Game state
  const [word, setWord] = useState(initialWord || getRandomWord(language))
  const [currentGuess, setCurrentGuess] = useState("")
  const [guesses, setGuesses] = useState<string[]>([])
  const [keyboardStates, setKeyboardStates] = useState<Record<string, LetterState>>({})
  const [showInvalidWordAlert, setShowInvalidWordAlert] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isWinner, setIsWinner] = useState(false)
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState(language)

  // Set i18n language
  useEffect(() => {
    i18n.changeLanguage(currentLanguage)
  }, [currentLanguage, i18n])

  // Update keyboard states based on guesses
  const updateKeyboardStates = useCallback(() => {
    const newKeyboardStates: Record<string, LetterState> = {}

    guesses.forEach((guess) => {
      const evaluation = evaluateGuess(guess, word)

      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i]
        const currentState = newKeyboardStates[letter]
        const newState = evaluation[i]

        // Only override if the new state is better
        if (
          !currentState ||
          (currentState === "absent" && (newState === "present" || newState === "correct")) ||
          (currentState === "present" && newState === "correct")
        ) {
          newKeyboardStates[letter] = newState
        }
      }
    })

    setKeyboardStates(newKeyboardStates)
  }, [guesses, word])

  // Update keyboard states when guesses change
  useEffect(() => {
    updateKeyboardStates()
  }, [guesses, updateKeyboardStates])

  // Submit guess
  const submitGuess = useCallback(() => {
    if (currentGuess.length !== 5 || isGameOver) return

    // Check if the word is valid
    if (!isValidWord(currentGuess, currentLanguage)) {
      setShowInvalidWordAlert(true)
      setTimeout(() => {
        setShowInvalidWordAlert(false)
      }, 2000)
      return
    }

    // Add the guess
    const newGuesses = [...guesses, currentGuess]
    setGuesses(newGuesses)
    setCurrentGuess("")

    // Check if this is a winning guess
    if (currentGuess === word) {
      setIsWinner(true)
      setIsGameOver(true)
    } else if (newGuesses.length >= 6) {
      // Game over after 6 guesses
      setIsGameOver(true)
    }
  }, [currentGuess, guesses, isGameOver, word, currentLanguage])

  // Handle keyboard input
  const handleKeyPress = useCallback(
    (key: string) => {
      if (isGameOver) return

      if (key === "ENTER") {
        if (currentGuess.length === 5) {
          submitGuess()
        }
      } else if (key === "BACKSPACE") {
        setCurrentGuess((prev) => prev.slice(0, -1))
      } else if (currentGuess.length < 5 && /^[A-ZÇĞİÖŞÜ]$/.test(key)) {
        setCurrentGuess((prev) => prev + key)
      }
    },
    [currentGuess, isGameOver, submitGuess],
  )

  // Handle language change
  const handleLanguageChange = useCallback(
    (newLanguage: "en" | "tr") => {
      setCurrentLanguage(newLanguage)
      i18n.changeLanguage(newLanguage)

      // Save language preference to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("wordle_language", newLanguage)
      }
    },
    [i18n],
  )

  // Play again with a new word
  const handlePlayAgain = useCallback(() => {
    setIsCreatingNewGame(true)

    // Generate a new word
    const newWord = getRandomWord(currentLanguage)

    // Reset the game state
    setWord(newWord)
    setCurrentGuess("")
    setGuesses([])
    setKeyboardStates({})
    setIsGameOver(false)
    setIsWinner(false)
    setIsCreatingNewGame(false)
  }, [currentLanguage])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Wordle</h1>
              <p className="text-slate-300">{t("play.solo")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={currentLanguage === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => handleLanguageChange("en")}
            >
              EN
            </Button>
            <Button
              variant={currentLanguage === "tr" ? "default" : "outline"}
              size="sm"
              onClick={() => handleLanguageChange("tr")}
            >
              TR
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <Card className="p-6 bg-slate-800 border-slate-700">
              {isGameOver && (
                <div className="mb-6 p-4 bg-slate-700 rounded-md text-center">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {isWinner ? t("game.youWon") : t("game.gameOver")}
                  </h3>
                  <p className="text-slate-300">
                    {t("game.theWordWas")}: <span className="font-bold">{word}</span>
                  </p>
                  <div className="mt-4 flex justify-center gap-4">
                    <Button onClick={() => router.push("/")}>{t("game.backToHome")}</Button>
                    <Button onClick={handlePlayAgain} disabled={isCreatingNewGame} variant="outline">
                      {isCreatingNewGame ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t("play.creating")}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {t("game.playAgain")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {showInvalidWordAlert && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>{t("game.invalidWord")}</AlertTitle>
                  <AlertDescription>{t("game.invalidWordDesc")}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-5 gap-2 mb-4">
                {Array.from({ length: 6 }).flatMap((_, attemptIndex) => {
                  const guess = guesses[attemptIndex]
                  const isCurrentRow = attemptIndex === guesses.length && !isGameOver

                  return Array.from({ length: 5 }).map((_, letterIndex) => {
                    let letter = ""
                    let state: LetterState | "" = ""

                    if (guess) {
                      letter = guess[letterIndex]
                      state = evaluateGuess(guess, word)[letterIndex]
                    } else if (isCurrentRow && letterIndex < currentGuess.length) {
                      letter = currentGuess[letterIndex]
                    }

                    return (
                      <div
                        key={`${attemptIndex}-${letterIndex}`}
                        className={`
                          w-full aspect-square flex items-center justify-center text-2xl font-bold border-2 
                          ${
                            state === "correct"
                              ? "bg-green-600 border-green-600 text-white"
                              : state === "present"
                                ? "bg-yellow-600 border-yellow-600 text-white"
                                : state === "absent"
                                  ? "bg-gray-700 border-gray-700 text-white"
                                  : letter
                                    ? "border-gray-500 text-white" // Changed text color to white for better visibility
                                    : "border-gray-700"
                          }
                        `}
                      >
                        {letter}
                      </div>
                    )
                  })
                })}
              </div>

              <WordleKeyboard
                onKeyPress={handleKeyPress}
                keyStates={keyboardStates}
                disabled={isGameOver}
                language={currentLanguage}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
