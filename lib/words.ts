// A list of 5-letter words for the Wordle game
/*export const WORDS = [
  "APPLE",
  "BEACH",
  "CHAIR",
  "DANCE",
  "EAGLE",
  "FLAME",
  "GHOST",
  "HEART",
  "IMAGE",
  "JUICE",
  "KNIFE",
  "LEMON",
  "MUSIC",
  "NIGHT",
  "OCEAN",
  "PIANO",
  "QUEEN",
  "RIVER",
  "SNAKE",
  "TIGER",
  "UNCLE",
  "VOICE",
  "WATER",
  "XENON",
  "YACHT",
  "ZEBRA",
  "ACTOR",
  "BREAD",
  "CLOUD",
  "DREAM",
  "EARTH",
  "FRUIT",
  "GRAPE",
  "HOUSE",
  "IVORY",
  "JELLY",
  "KOALA",
  "LIGHT",
  "MONEY",
  "NOBLE",
  "OLIVE",
  "PAPER",
  "QUILT",
  "RADIO",
  "STORM",
  "TRAIN",
  "URBAN",
  "VIRUS",
  "WHALE",
  "XYLYL",
]*/

export const WORDS = [
  "AHLAK",
  "GURUR",
  "KİBİR",
  "SİNİR",
  "MADDE",
  "ANLAM",
  "NAMUS",
  "EFSUN",
  "HİTAP",
  "KELAM",
  "KANIT",
  "DELİL",
  "BATIL",
  "YALAN",
  "DOĞRU",
  "YÜZEY",
  "ÇIKIŞ",
  "GİRİŞ",
  "DEFİN",
  "KABİR",
  "GÖMÜT",
  "MEZAR",
  "BAHÇE",
  "HOTEL",
  "ANTRE",
  "SALON",
  "KİLER",
  "BANYO",
  "BETON",
  "DORUK",
  "DAHİL",
  "DAVUL",
  "KABUL",
  "DİĞER",
  "ÖTEKİ",
  "DAİMA",
  "ŞİMDİ",
  "YARIN",
  "BUGÜN",
  "EVVEL",
  "SONRA",
  "KAYIT",
  "SATIR",
  "MISRA",
  "ROMAN",
  "ÇANTA",
  "TAHTA",
  "ÇEKİÇ",
  "RADYO",
  "KAĞIT",
  "SEHPA",
  "DOLAP",
  "KALEM",
  "KAŞIK",
  "BIÇAK",
  "TABAK",
  "TABLO",
  "LAMBA",
  "TEPSİ",
  "KİLİT",
  "RENDE",
  "AYRAÇ",
  "MAKAS",
  "KAZAK",
  "HIRKA",
  "CEKET",
  "KEMER",
  "FULAR",
  "KABAN",
  "PALTO",
  "YILAN",
  "KÖPEK",
  "DOMUZ",
  "KUMRU",
  "AKREP",
  "SERÇE",
  "TAVUK",
  "HOROZ",
  "HİNDİ",
  "ŞAHİN",
  "KOYUN",
  "KATIR",
  "MANDA",
  "TİLKİ",
  "GEYİK",
  "KİRPİ",
  "SADIK",
  "ZAYIF",
  "SAKİN",
  "YALIN",
  "ALÇAK",
  "REZİL",
  "EBEDİ",
  "EZELİ",
  "VAZIH",
  "FAKİR",
  "ASABİ",
  "FERAH",
  "GÜZEL",
  "NADİR",
  "NAZİK",
  "KİBAR",
  "SABİT",
  "YAKIN",
  "DERİN",
  "TEMİZ",
  "GİZLİ",
  "KUTLU",
  "KOLAY",
  "BASİT",
  "BEŞİR",
  "GAMLI",
  "LATİF",
  "İÇSEL",
  "ZEBUN",
  "CİMRİ",
  "BİBER",
  "HELVA",
  "GAZOZ",
  "HURMA",
  "SALÇA",
  "CEVİZ",
  "BADEM",
  "KEKİK",
  "ARMUT",
  "MARUL",
  "SOĞAN",
  "KİRAZ",
  "ÇİLEK",
  "VİŞNE",
  "KAVUN",
  "BAMYA",
  "SUSAM",
  "TAHİN",
  "REÇEL",
  "AYRAN"
];

// Get a random word from the list
export const getRandomWord = (): string => {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}

// Check if a word is valid (5 letters)
export const isValidWord = (word: string): boolean => {
  return word.length === 5
}

// Evaluate a guess against the target word
export type LetterState = "correct" | "present" | "absent"

export const evaluateGuess = (guess: string, targetWord: string): LetterState[] => {
  const result: LetterState[] = Array(5).fill("absent")
  const targetLetters = targetWord.split("")

  // First pass: mark correct letters
  for (let i = 0; i < 5; i++) {
    if (guess[i] === targetWord[i]) {
      result[i] = "correct"
      targetLetters[i] = "" // Mark as used
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < 5; i++) {
    if (result[i] === "absent") {
      const index = targetLetters.indexOf(guess[i])
      if (index !== -1) {
        result[i] = "present"
        targetLetters[index] = "" // Mark as used
      }
    }
  }

  return result
}
