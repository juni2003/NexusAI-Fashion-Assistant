import Link from "next/link";
import { Sparkles, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-slate-950">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-8 glow-purple">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 tracking-tighter mb-4 drop-shadow-sm">
          404
        </h1>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Lost in the Matrix?
        </h2>

        <p className="text-slate-400 max-w-md mb-10 leading-relaxed text-sm sm:text-base">
          We couldn&apos;t find the page you&apos;re looking for. It might have
          been moved, deleted, or perhaps it never existed in this timeline.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/">
            <Button className="rounded-full px-6 py-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25 transition-all duration-300 w-full sm:w-auto text-base group">
              <Home className="w-4 h-4 mr-2 transition-transform group-hover:-translate-y-0.5" />
              Return Home
            </Button>
          </Link>
          <Link href="/chat">
            <Button
              variant="outline"
              className="rounded-full px-6 py-6 border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all duration-300 w-full sm:w-auto text-base group"
            >
              <Sparkles className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
              Ask NexusAI
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
