import { useState, useCallback } from "react";
import { useGame } from "@/hooks/useGame";
import { useTheme } from "@/hooks/useTheme";
import LandingPage from "@/components/LandingPage";
import WaitingRoom from "@/components/WaitingRoom";
import GameScreen from "@/components/GameScreen";

function App() {
  const game = useGame();
  const { isDark, toggleTheme } = useTheme();
  const [boardFlipped, setBoardFlipped] = useState(false);

  const toggleBoardFlip = useCallback(() => {
    setBoardFlipped((prev) => !prev);
  }, []);

  if (game.phase === "landing") {
    return (
      <LandingPage
        onCreateGame={game.createGame}
        onJoinGame={game.joinGame}
        error={game.error}
        onClearError={game.clearError}
      />
    );
  }

  if (game.phase === "waiting") {
    return <WaitingRoom gameId={game.gameId} />;
  }

  if (
    (game.phase === "playing" || game.phase === "gameover") &&
    game.gameState &&
    game.myColor
  ) {
    return (
      <GameScreen
        gameState={game.gameState}
        myColor={game.myColor}
        gameId={game.gameId}
        isMyTurn={game.isMyTurn}
        hasDice={game.hasDice}
        hasRemainingMoves={game.hasRemainingMoves}
        selectedPoint={game.selectedPoint}
        highlightedPoints={game.getHighlightedPoints()}
        selectablePoints={game.getSelectablePoints()}
        isRolling={game.isRolling}
        opponentDisconnected={game.opponentDisconnected}
        isDark={isDark}
        boardFlipped={boardFlipped}
        onToggleTheme={toggleTheme}
        onToggleBoardFlip={toggleBoardFlip}
        onSelectPoint={game.selectPoint}
        onSelectBar={game.selectBarChecker}
        onRoll={game.rollTheDice}
        onRequestRematch={game.requestRematch}
        onAcceptRematch={game.acceptRematch}
      />
    );
  }

  return null;
}

export default App;
