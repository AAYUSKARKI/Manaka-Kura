import { Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (val: number) => void;
  className?: string;
}

export function VolumeControl({ volume, onVolumeChange, className }: VolumeControlProps) {
  return (
    <div className={cn("flex items-center gap-3 w-full max-w-[200px] sm:max-w-[240px]", className)}>
      {/* Icon size matched to PTT small buttons */}
      <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
      
      <Slider
        value={[volume * 100]}
        onValueChange={(value) => onVolumeChange(value[0] / 100)}
        max={100}
        step={1}
        // Using touch-target friendly height but keeping visual bar slim
        className="flex-1 py-4 cursor-pointer" 
      />
      
      {/* Optional: Add percentage for clarity on mobile */}
      <span className="text-[10px] sm:text-xs font-mono text-muted-foreground w-6 shrink-0">
        {Math.round(volume * 100)}
      </span>
    </div>
  );
}