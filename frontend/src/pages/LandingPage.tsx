import { Link } from "react-router-dom";
import { PromptingIsAllYouNeed } from "@/components/ui/animated-hero-section";

export function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-[#0c0518]">
      <PromptingIsAllYouNeed />
      
      <div className="absolute bottom-16 sm:bottom-24 z-10 animate-fade-in-up">
        <Link 
          to="/login"
          className="group relative inline-flex items-center justify-center rounded-full bg-black/50 px-8 py-4 text-lg font-black tracking-widest text-fuchsia-300 uppercase shadow-[0_0_40px_-10px_rgba(217,70,239,0.5)] border border-fuchsia-500/30 backdrop-blur-md hover:bg-black/70 hover:scale-105 hover:shadow-[0_0_60px_-10px_rgba(217,70,239,0.8)] transition-all duration-300"
        >
          <span className="relative z-10 flex items-center gap-2">
            Get Started
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:translate-x-1 transition-transform">
               <path d="M5 12h14"></path>
               <path d="m12 5 7 7-7 7"></path>
            </svg>
          </span>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>
      </div>
    </div>
  );
}
