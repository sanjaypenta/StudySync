import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import type { ProgressSummary } from "@/lib/api";

type Props = {
  dna: NonNullable<ProgressSummary["dna"]>;
};

export function StudyDNA({ dna }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-violet-500/20 bg-zinc-950/60 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-violet-600/10 blur-[80px]" />
        
        <h3 className="mb-4 text-center font-bold uppercase tracking-widest text-violet-300">
          Study DNA Profile
        </h3>
        
        <div className="h-64 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dna.radar}>
              <PolarGrid stroke="#6d28d9" strokeOpacity={0.2} />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: "#a78bfa", fontSize: 12, fontWeight: 600 }} 
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#09090b", 
                  borderColor: "#8b5cf6", 
                  borderRadius: "12px", 
                  color: "#ddd6fe" 
                }} 
              />
              <Radar
                name="You"
                dataKey="A"
                stroke="#a855f7"
                strokeWidth={2}
                fill="#8b5cf6"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex-1 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/40 to-transparent p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400/80">
            Peak Performance Time
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-rose-100">
            {dna.insights.bestTime}
          </p>
          <p className="text-xs text-rose-300/60 mt-2">
            Based on completed deep work sessions.
          </p>
        </div>

        <div className="flex-1 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-transparent p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">
            Avg Focus Duration
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-cyan-100">
            {dna.insights.avgFocus} <span className="text-lg">mins</span>
          </p>
          <p className="text-xs text-cyan-300/60 mt-2">
            Your natural momentum block.
          </p>
        </div>

        <div className="flex-1 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-transparent p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
            Current Weak Link
          </p>
          <p className="mt-1 font-serif text-xl font-bold text-amber-100 italic">
            {dna.insights.weakSubject}
          </p>
          <p className="text-xs text-amber-300/60 mt-2">
            Most frequently skipped or abandoned task.
          </p>
        </div>

        <div className="flex-1 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-transparent p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
            Stamina Signature
          </p>
          <p className="mt-1 font-sans text-xl font-bold text-emerald-100 uppercase tracking-tight">
            {dna.insights.burnoutPattern}
          </p>
          <p className="text-xs text-emerald-300/60 mt-2">
            Your long-run recovery mechanics.
          </p>
        </div>
      </div>
    </div>
  );
}
