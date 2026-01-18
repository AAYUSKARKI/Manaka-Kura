import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";

interface LoginFormProps {
  onLogin: (username: string) => void;
  error?: string;
}

export function LoginForm({ onLogin, error }: LoginFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (val) onLogin(val);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto">
      <Card className="w-full max-w-md bg-[var(--bg-secondary)]/90 backdrop-blur-lg border-none shadow-2xl rounded-[var(--radius-2xl)] animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 animate-glow">
            <Radio className="w-16 h-16 sm:w-24 sm:h-24 text-[var(--accent)]" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-extrabold animate-glow">Manaka Kura</CardTitle>
          <p className="text-[var(--text-secondary)] mt-3 text-base sm:text-lg">Seamless Connections, Infinite Conversations</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Choose your handle"
              className="bg-[var(--bg-tertiary)]/60 border border-[var(--border)]/30 text-[var(--text-primary)] rounded-[var(--radius-lg)] text-base sm:text-lg"
            />
            <Button type="submit" className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] rounded-[var(--radius-lg)] text-base sm:text-lg">
              Join the Wave
            </Button>
          </form>
          {error && <p className="text-[var(--danger)] text-center animate-bounce text-sm sm:text-base">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}