import { Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (val: number) => void;
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 mt-3 sm:mt-4">
      <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
      <Slider
        value={[volume * 100]}
        onValueChange={(value) => onVolumeChange(value[0] / 100)}
        max={100}
        step={1}
        className="w-32 xs:w-40 sm:w-48"
      />
    </div>
  );
}