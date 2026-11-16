import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export function AgentAvatar({ className }: { className?: string }) {
  return (
    <div className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground", className)}>
      <Leaf className="size-5" />
    </div>
  );
}
