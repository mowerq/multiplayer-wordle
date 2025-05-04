"use client";

import { Button } from "@/components/ui/button";
import type { LetterState } from "@/lib/words";
import { CornerDownLeft } from "lucide-react";
import { useEffect, useCallback } from "react";

interface WordleKeyboardProps {
  onKeyPress: (key: string) => void;
  keyStates: Record<string, LetterState>;
  disabled?: boolean;
  language?: "en" | "tr";
}

export default function WordleKeyboard({
  onKeyPress,
  keyStates,
  disabled = false,
  language = "en",
}: WordleKeyboardProps) {
  // Define keyboard layouts for different languages
  const keyboardLayouts = {
    en: [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
    ],
    tr: [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
      ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "Ö", "Ç", "BACKSPACE"],
    ],
  };

  const rows = keyboardLayouts[language];

  // Handle physical keyboard input
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      let key = e.key.toUpperCase();

      // Map Turkish lowercase characters to uppercase
      if (e.key === "ğ") key = "Ğ";
      if (e.key === "ü") key = "Ü";
      if (e.key === "ş") key = "Ş";
      if (e.key === "i") key = "İ"; // Turkish dotted I
      if (e.key === "ö") key = "Ö";
      if (e.key === "ç") key = "Ç";

      if (key === "ENTER") {
        onKeyPress("ENTER");
      } else if (key === "BACKSPACE" || key === "DELETE") {
        onKeyPress("BACKSPACE");
      } else if (/^[A-ZÇĞİÖŞÜ]$/.test(key)) {
        onKeyPress(key);
      }
    },
    [onKeyPress, disabled]
  );

  // Add physical keyboard support
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const getKeyStyle = (key: string) => {
    if (key === "ENTER" || key === "BACKSPACE") {
      return "bg-slate-600 hover:bg-slate-500";
    }

    const state = keyStates[key];
    if (state === "correct") {
      return "bg-green-600 hover:bg-green-500 text-white";
    } else if (state === "present") {
      return "bg-yellow-600 hover:bg-yellow-500 text-white";
    } else if (state === "absent") {
      return "bg-gray-700 hover:bg-gray-600 text-white";
    }

    return "bg-slate-400 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500";
  };

  return (
    <div className="w-full">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1 my-1">
          {row.map((key) => (
            <Button
              key={key}
              className={`${getKeyStyle(key)} ${
                key === "ENTER" || key === "BACKSPACE"
                  ? "px-2 text-xs sm:px-3"
                  : "px-1 sm:px-3"
              } h-14 sm:h-16 font-bold text-sm sm:text-base flex-1`}
              onClick={() => onKeyPress(key)}
              disabled={disabled}
            >
              {key === "BACKSPACE" ? (
                "⌫"
              ) : key === "ENTER" ? (
                <CornerDownLeft />
              ) : (
                key
              )}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
