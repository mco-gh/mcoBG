import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";

interface Props {
  gameId: string;
}

export default function WaitingRoom({ gameId }: Props) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f0e8] dark:bg-[#0a0a1a] transition-colors p-4">
      <div className="text-center space-y-6">
        <Loader2 className="w-12 h-12 text-amber-600 dark:text-amber-400 animate-spin mx-auto" />
        <h2 className="text-2xl font-bold text-[#2c1810] dark:text-[#e8e0d4]">
          Waiting for Opponent
        </h2>
        <p className="text-[#6b5a4e] dark:text-[#a89880]">
          Share this Game ID with your friend:
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="px-8 py-4 bg-white dark:bg-[#1a1a2e] rounded-xl border-2 border-amber-600 dark:border-amber-400 font-mono text-3xl tracking-[0.3em] text-[#2c1810] dark:text-amber-400 font-bold">
            {gameId}
          </div>
          <button
            onClick={copyId}
            className="p-3 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-sm text-[#8b7355] dark:text-[#666]">
          You are playing as <span className="font-bold text-amber-700 dark:text-amber-400">White</span>
        </p>
      </div>
    </div>
  );
}
