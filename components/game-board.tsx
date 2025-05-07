"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  evaluateGuess,
  isValidWord,
  type LetterState,
  getRandomWord,
} from "@/lib/words";
import { type PlayerInfo, refreshPlayerInfo } from "@/lib/player";
import { ArrowLeft, Share2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WordleKeyboard from "./wordle-keyboard";
import PlayerList from "./player-list";
import type { Database } from "@/lib/database.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

type Game = Database["public"]["Tables"]["games"]["Row"];
type GamePlayer = Database["public"]["Tables"]["game_players"]["Row"] & {
  player: {
    id: string;
    nickname: string;
  };
};
type Guess = Database["public"]["Tables"]["guesses"]["Row"] & {
  player: {
    id: string;
    nickname: string;
  };
};

interface GameBoardProps {
  game: Game;
  gamePlayers: GamePlayer[];
  initialGuesses: Guess[];
}

export default function GameBoard({
  game,
  gamePlayers: initialGamePlayers,
  initialGuesses,
}: GameBoardProps) {
  const { t, i18n } = useTranslation();

  // Get language from URL
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang");
  const [language, setLanguage] = useState<"en" | "tr">(
    langParam === "tr" ? "tr" : "en"
  );

  // Refs to prevent re-renders
  const mountedRef = useRef(true);
  const playerRef = useRef<PlayerInfo | null>(null);
  const channelRef = useRef<any>(null);
  const guessesRef = useRef<Guess[]>(initialGuesses);
  const gamePlayersRef = useRef<GamePlayer[]>(initialGamePlayers);
  const gameStatusRef = useRef(game.status);
  const keyboardStatesRef = useRef<Record<string, LetterState>>({});
  const supabaseRef = useRef(getSupabaseClient());
  const channelNameRef = useRef(`game-${game.id}-${Date.now()}`); // Unique channel name
  const winnerIdRef = useRef<string | null>(null);

  // UI state that needs to trigger re-renders
  const [isLoading, setIsLoading] = useState(true);
  const [currentGuess, setCurrentGuess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);
  const [showInvalidWordAlert, setShowInvalidWordAlert] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [, forceUpdate] = useState({});

  // Router and toast
  const router = useRouter();
  const { toast } = useToast();

  // Set i18n language
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  // Force a re-render
  const triggerRender = useCallback(() => {
    forceUpdate({});
  }, []);

  // Update keyboard states
  const updateKeyboardStates = useCallback(() => {
    if (!playerRef.current) return;

    const userGuesses = guessesRef.current.filter(
      (guess) => guess.player_id === playerRef.current?.id
    );

    const newKeyboardStates: Record<string, LetterState> = {};

    userGuesses.forEach((guess) => {
      const evaluation = evaluateGuess(guess.guess, game.word);

      for (let i = 0; i < guess.guess.length; i++) {
        const letter = guess.guess[i];
        const currentState = newKeyboardStates[letter];
        const newState = evaluation[i];

        // Only override if the new state is better
        if (
          !currentState ||
          (currentState === "absent" &&
            (newState === "present" || newState === "correct")) ||
          (currentState === "present" && newState === "correct")
        ) {
          newKeyboardStates[letter] = newState;
        }
      }
    });

    keyboardStatesRef.current = newKeyboardStates;
  }, [game.word]);

  // Submit guess - define this before handleKeyPress
  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== 5 || isSubmitting || !playerRef.current) return;

    // Check if the word is valid
    if (!isValidWord(currentGuess, language)) {
      setShowInvalidWordAlert(true);
      setTimeout(() => {
        setShowInvalidWordAlert(false);
      }, 2000);
      return;
    }

    setIsSubmitting(true);

    try {
      // For solo games, handle everything locally without server requests
      if (!game.is_multiplayer) {
        const newGuess = {
          id: `local-${Date.now()}`,
          game_id: game.id,
          player_id: playerRef.current.id,
          guess: currentGuess,
          created_at: new Date().toISOString(),
          player: {
            id: playerRef.current.id,
            nickname: playerRef.current.nickname,
          },
        };

        // Add to local guesses
        guessesRef.current = [...guessesRef.current, newGuess];

        // Check if this is a winning guess
        if (currentGuess === game.word) {
          gameStatusRef.current = "completed";
        }

        // Update keyboard states
        updateKeyboardStates();
        triggerRender();
      } else {
        // For multiplayer games, continue with server requests
        const { error } = await supabaseRef.current.from("guesses").insert([
          {
            game_id: game.id,
            player_id: playerRef.current.id,
            guess: currentGuess,
          },
        ]);

        if (error) throw error;

        // Check if this is a winning guess
        if (currentGuess === game.word) {
          // Update game status
          await supabaseRef.current
            .from("games")
            .update({
              status: "completed",
              winner_id: playerRef.current.id,
            })
            .eq("id", game.id);
        }
      }

      setCurrentGuess("");
    } catch (err: any) {
      toast({
        title: t("toast.error"),
        description: t("toast.submitFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentGuess,
    game.id,
    game.word,
    game.is_multiplayer,
    isSubmitting,
    toast,
    language,
    t,
    updateKeyboardStates,
    triggerRender,
  ]);

  // Handle keyboard input - now submitGuess is defined before this
  const handleKeyPress = useCallback(
    (key: string) => {
      if (!playerRef.current) return;

      const userGuesses = guessesRef.current.filter(
        (guess) => guess.player_id === playerRef.current?.id
      );

      const isGameOver =
        gameStatusRef.current === "completed" ||
        userGuesses.length >= game.max_attempts;

      if (isGameOver || isSubmitting) return;

      if (key === "ENTER") {
        if (currentGuess.length === 5) {
          submitGuess();
        }
      } else if (key === "BACKSPACE") {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (currentGuess.length < 5 && /^[A-ZÇĞİÖŞÜ]$/.test(key)) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [currentGuess, isSubmitting, game.max_attempts, submitGuess]
  );

  // Set up Supabase channel with better error handling
  const setupChannel = useCallback(() => {
    // Skip setting up channel for solo games
    if (!game.is_multiplayer) {
      setIsLoading(false);
      return;
    }

    // Clean up existing channel
    if (channelRef.current) {
      try {
        supabaseRef.current.removeChannel(channelRef.current);
      } catch (error) {
        console.error("Error removing channel:", error);
      }
      channelRef.current = null;
    }

    setConnectionError(null);
    setIsReconnecting(false);

    try {
      // Create a new channel with a unique name
      const channelName = channelNameRef.current;
      console.log("Setting up channel:", channelName);

      const channel = supabaseRef.current.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: playerRef.current?.id || "anonymous" },
        },
      });

      // Listen for new guesses
      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "guesses",
            filter: `game_id=eq.${game.id}`,
          },
          async (payload) => {
            if (!mountedRef.current) return;

            try {
              // Fetch the complete guess with player info
              const { data } = await supabaseRef.current
                .from("guesses")
                .select(`*, player:player_id(id, nickname)`)
                .eq("id", payload.new.id)
                .single();

              if (data && mountedRef.current) {
                // Check if we already have this guess
                if (!guessesRef.current.some((g) => g.id === data.id)) {
                  guessesRef.current = [...guessesRef.current, data as Guess];
                  updateKeyboardStates();
                  triggerRender();
                }
              }
            } catch (error) {
              console.error("Error fetching new guess:", error);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "games",
            filter: `id=eq.${game.id}`,
          },
          (payload) => {
            if (!mountedRef.current) return;
            gameStatusRef.current = payload.new.status;
            winnerIdRef.current = payload.new.winner_id;
            triggerRender();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "game_players",
            filter: `game_id=eq.${game.id}`,
          },
          async (payload) => {
            if (!mountedRef.current) return;

            try {
              // Fetch the complete player with profile
              const { data } = await supabaseRef.current
                .from("game_players")
                .select(`*, player:player_id(id, nickname)`)
                .eq("id", payload.new.id)
                .single();

              if (data && mountedRef.current) {
                // Check if we already have this player
                if (!gamePlayersRef.current.some((p) => p.id === data.id)) {
                  gamePlayersRef.current = [
                    ...gamePlayersRef.current,
                    data as GamePlayer,
                  ];
                  triggerRender();
                }
              }
            } catch (error) {
              console.error("Error fetching new player:", error);
            }
          }
        );

      // Handle channel status changes
      channel
        .on("error", (error) => {
          console.error("Channel error:", error);
          if (mountedRef.current) {
            setConnectionError(t("errors.connectionError"));
            triggerRender();
          }
        })
        .on("close", () => {
          console.log("Channel closed");
          if (mountedRef.current) {
            setConnectionError(t("errors.connectionLost"));
            triggerRender();
          }
        })
        .on("disconnect", (reason) => {
          console.log("Channel disconnected:", reason);
          if (mountedRef.current) {
            setConnectionError(t("errors.connectionLost"));
            triggerRender();
          }
        });

      // Subscribe with better error handling
      channel.subscribe((status) => {
        console.log("Channel status:", status);
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to channel:", channelName);
          if (mountedRef.current) {
            setConnectionError(null);
            triggerRender();
          }
        } else if (status === "TIMED_OUT") {
          console.error("Channel subscription timed out");
          if (mountedRef.current) {
            setConnectionError(t("errors.connectionTimeout"));
            triggerRender();
          }
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          console.error("Channel subscription failed:", status);
          if (mountedRef.current) {
            setConnectionError(t("errors.connectionFailed"));
            triggerRender();
          }
        }
      });

      // Store the channel for cleanup
      channelRef.current = channel;
    } catch (error) {
      console.error("Error setting up channel:", error);
      setConnectionError(t("errors.setupFailed"));
      triggerRender();
    }
  }, [game.id, triggerRender, t, game.is_multiplayer]);

  // Initialize everything in a single effect with no dependencies
  useEffect(() => {
    // Set mounted ref
    mountedRef.current = true;

    // Initialize player and game
    const initialize = async () => {
      try {
        // Get or create player with forced refresh to ensure we have the latest data
        const playerInfo = await refreshPlayerInfo();
        if (!mountedRef.current || !playerInfo) return;

        // Store in ref
        playerRef.current = playerInfo;

        // For solo games, skip server interactions
        if (!game.is_multiplayer) {
          // Update keyboard states
          updateKeyboardStates();
          setIsLoading(false);
          return;
        }

        // Join game if needed (multiplayer only)
        const isInGame = initialGamePlayers.some(
          (gp) => gp.player_id === playerInfo.id
        );
        if (!isInGame) {
          await supabaseRef.current.from("game_players").insert({
            game_id: game.id,
            player_id: playerInfo.id,
          });
        }

        // Set up Supabase channel (multiplayer only)
        setupChannel();

        // Update keyboard states
        updateKeyboardStates();

        // Done loading
        if (mountedRef.current) {
          setIsLoading(false);
          triggerRender();
        }
      } catch (error) {
        console.error("Initialization error:", error);
        if (mountedRef.current) {
          setIsLoading(false);
          setConnectionError(t("errors.initFailed"));
          triggerRender();
        }
      }
    };

    initialize();

    // Cleanup function
    return () => {
      mountedRef.current = false;

      // Clean up Supabase channel
      if (channelRef.current) {
        try {
          supabaseRef.current.removeChannel(channelRef.current);
        } catch (error) {
          console.error("Error removing channel during cleanup:", error);
        }
        channelRef.current = null;
      }
    };
  }, []); // Empty dependency array - run once only

  // Copy game link
  const copyGameLink = useCallback(() => {
    const url = `${window.location.origin}/game/${game.id}?lang=${language}`;
    navigator.clipboard.writeText(url);
    toast({
      title: t("game.linkCopied"),
      description: t("game.linkCopiedDesc"),
    });
  }, [game.id, toast, language, t]);

  // Handle language change
  const handleLanguageChange = useCallback(
    (newLanguage: "en" | "tr") => {
      setLanguage(newLanguage);
      i18n.changeLanguage(newLanguage);

      // Save language preference to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("wordle_language", newLanguage);
      }
    },
    [i18n]
  );

  // Retry connection
  const handleRetryConnection = useCallback(() => {
    setIsReconnecting(true);
    // Generate a new channel name to avoid conflicts
    channelNameRef.current = `game-${game.id}-${Date.now()}`;
    setConnectionError(null);
    setupChannel();
  }, [setupChannel, game.id]);

  // Play again - create a new game with the same settings
  const handlePlayAgain = useCallback(async () => {
    if (!playerRef.current || isCreatingNewGame) return;

    setIsCreatingNewGame(true);

    try {
      // Refresh player info to ensure we have the latest nickname
      await refreshPlayerInfo();

      const supabase = getSupabaseClient();
      const word = getRandomWord(language);

      // Create a new game with the same multiplayer setting
      const { data: newGame, error: gameError } = await supabase
        .from("games")
        .insert([
          {
            creator_id: playerRef.current.id,
            word,
            status: "active",
            is_multiplayer: game.is_multiplayer,
          },
        ])
        .select()
        .single();

      if (gameError) throw gameError;

      // Add creator as a player
      const { error: playerError } = await supabase
        .from("game_players")
        .insert([
          {
            game_id: newGame.id,
            player_id: playerRef.current.id,
          },
        ]);

      if (playerError) throw playerError;

      // Navigate to the new game
      router.push(`/game/${newGame.id}?lang=${language}`);
    } catch (err) {
      console.error("Failed to create new game:", err);
      toast({
        title: t("toast.error"),
        description: "Failed to create new game",
        variant: "destructive",
      });
      setIsCreatingNewGame(false);
    }
  }, [game.is_multiplayer, language, router, toast, t]);

  // Compute derived state for rendering
  const player = playerRef.current;
  const guesses = guessesRef.current;
  const gamePlayers = gamePlayersRef.current;
  const gameStatus = gameStatusRef.current;
  const keyboardStates = keyboardStatesRef.current;

  const userGuesses = player
    ? guesses.filter((guess) => guess.player_id === player.id)
    : [];

  const isGameOver =
    gameStatus === "completed" || userGuesses.length >= game.max_attempts;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div>
              <h1 className="text-3xl font-bold text-white">Wordle</h1>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageChange("en")}
              >
                EN
              </Button>

              <Button
                variant={language === "tr" ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageChange("tr")}
              >
                TR
              </Button>
            </div>

            {game.is_multiplayer && (
              <div>
                <Button variant="outline" size="sm" onClick={copyGameLink}>
                  <Share2 className="h-4 w-4 mr-2" />

                  {t("game.share")}
                </Button>
              </div>
            )}
          </div>
        </header>

        {connectionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>{t("game.connectionError")}</AlertTitle>

            <AlertDescription className="flex justify-between items-center">
              <span>{connectionError}</span>

              <Button
                size="sm"
                onClick={handleRetryConnection}
                disabled={isReconnecting}
              >
                {isReconnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />

                    {t("game.retry")}
                  </>
                ) : (
                  t("game.retry")
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6 bg-slate-800 border-slate-700">
              {isGameOver && (
                <div className="mb-6 p-4 bg-slate-700 rounded-md text-center">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {userGuesses.some((g) => g.guess === game.word)
                      ? t("game.youWon")
                      : `${t("game.gameOver")}!${
                          game.is_multiplayer &&
                          winnerIdRef.current &&
                          winnerIdRef.current !== player?.id
                            ? ` ${t("game.winner")}: ${
                                gamePlayers.find(
                                  (p) => p.player_id === winnerIdRef.current
                                )?.player.nickname
                              }`
                            : ""
                        }`}
                  </h3>

                  <p className="text-slate-300">
                    {t("game.theWordWas")}:{" "}
                    <span className="font-bold">{game.word}</span>
                  </p>

                  <div className="mt-4 flex flex-col justify-center gap-2">
                    <Button onClick={() => router.push("/")}>
                      {t("game.backToHome")}
                    </Button>

                    <Button
                      onClick={handlePlayAgain}
                      disabled={isCreatingNewGame}
                      variant="outline"
                    >
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

                  <AlertDescription>
                    {t("game.invalidWordDesc")}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-5 gap-2 mb-4">
                {Array.from({ length: game.max_attempts }).flatMap(
                  (_, attemptIndex) => {
                    const guess = userGuesses[attemptIndex];

                    const isCurrentRow =
                      attemptIndex === userGuesses.length && !isGameOver;

                    return Array.from({ length: 5 }).map((_, letterIndex) => {
                      let letter = "";

                      let state: LetterState | "" = "";

                      if (guess) {
                        letter = guess.guess[letterIndex];

                        state = evaluateGuess(guess.guess, game.word)[
                          letterIndex
                        ];
                      } else if (
                        isCurrentRow &&
                        letterIndex < currentGuess.length
                      ) {
                        letter = currentGuess[letterIndex];
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
                              ? "border-gray-500 text-gray-400" // Changed text color to gray-300 for better visibility
                              : "border-gray-700"
                          }

                        `}
                        >
                          {letter}
                        </div>
                      );
                    });
                  }
                )}
              </div>

              <WordleKeyboard
                onKeyPress={handleKeyPress}
                keyStates={keyboardStates}
                disabled={isGameOver || isSubmitting}
                language={language}
              />
            </Card>
          </div>

          <div>
            {game.is_multiplayer && (
              <PlayerList
                players={gamePlayers}
                currentPlayerId={player?.id || ""}
                t={t}
              />
            )}

            <Card className="mt-6 bg-slate-800 border-slate-700">
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-4">
                  {t("game.recentGuesses")}
                </h3>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {guesses.length === 0 ? (
                    <p className="text-slate-400 text-sm">
                      {t("game.noGuesses")}
                    </p>
                  ) : (
                    guesses.map((guess) => (
                      <div
                        key={guess.id}
                        className="flex items-center justify-between p-2 rounded bg-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {player && guess.player_id === player.id
                              ? `${t("game.you")}`
                              : guess.player.nickname}
                            :
                          </span>

                          <div className="flex gap-1">
                            {guess.guess.split("").map((letter, i) => (
                              <span
                                key={i}
                                className={`

                                  w-6 h-6 flex items-center justify-center text-xs font-bold

                                  ${
                                    player && guess.player_id === player.id
                                      ? evaluateGuess(guess.guess, game.word)[
                                          i
                                        ] === "correct"
                                        ? "bg-green-600 text-white"
                                        : evaluateGuess(guess.guess, game.word)[
                                            i
                                          ] === "present"
                                        ? "bg-yellow-600 text-white"
                                        : "bg-gray-700 text-white"
                                      : "bg-slate-600 text-white"
                                  }

                                `}
                              >
                                {letter}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
