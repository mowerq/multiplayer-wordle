import { EN_VALID_WORDS } from "./en_valid_words";
import { TR_VALID_WORDS } from "./tr_valid_words";

// Turkish word list
export const TR_WORDS = [
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
  "KABİR",
  "MEZAR",
  "BAHÇE",
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
  "AYRAN",
];

// Get a random word from the list based on language
export const getRandomWord = (language: "en" | "tr" = "en"): string => {
  const wordList = language === "en" ? EN_VALID_WORDS : TR_WORDS;
  return wordList[Math.floor(Math.random() * wordList.length)];
};

// Check if a word is valid (5 letters and in the word list)
export const isValidWord = (
  word: string,
  language: "en" | "tr" = "en"
): boolean => {
  if (word.length !== 5) return false;

  const validWords = language === "en" ? EN_VALID_WORDS : TR_VALID_WORDS;
  return validWords.includes(word.toUpperCase());
};

// Evaluate a guess against the target word
export type LetterState = "correct" | "present" | "absent";

export const evaluateGuess = (
  guess: string,
  targetWord: string
): LetterState[] => {
  const result: LetterState[] = Array(5).fill("absent");
  const targetLetters = targetWord.split("");

  // First pass: mark correct letters
  for (let i = 0; i < 5; i++) {
    if (guess[i] === targetWord[i]) {
      result[i] = "correct";
      targetLetters[i] = ""; // Mark as used
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < 5; i++) {
    if (result[i] === "absent") {
      const index = targetLetters.indexOf(guess[i]);
      if (index !== -1) {
        result[i] = "present";
        targetLetters[index] = ""; // Mark as used
      }
    }
  }

  return result;
};
