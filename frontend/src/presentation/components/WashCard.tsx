import { Card, CardContent } from "@/presentation/ui/card";
import { Button } from "@/presentation/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/presentation/ui/dropdown-menu";
import { Car, Droplets, User, MoreVertical, ArrowRight, Trash2, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { WashJob } from "@/domain/entities/wash-job.entity";
import type { WashStatus } from "@/domain/enums/wash-status.enum";
import { WASH_STATUS_TRANSITIONS } from "@/domain/rules/wash-status.rules";

interface WashCardProps {
  job: WashJob;
  currentStatus: WashStatus;
  onStatusChange: (id: string, status: WashStatus) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  canAdvance: boolean;
}

export function WashCard({
  job,
  currentStatus,
  onStatusChange,
  onDelete,
  canDelete,
  canAdvance,
}: WashCardProps) {
  const transition = WASH_STATUS_TRANSITIONS[currentStatus];
  const canShowActions = canAdvance || canDelete;

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow animate-fade-in bg-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Car className="w-4 h-4 text-primary" />
              <span className="font-medium">{job.car_type}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Droplets className="w-4 h-4" />
              <span>{job.wash_type}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{job.washer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <DollarSign className="w-4 h-4" />
              <span>${(job.price || 0).toFixed(2)}</span>
            </div>
            {job.addons.length > 0 && (
              <div className="pt-1 text-xs text-muted-foreground">
                <p className="font-medium">Adiciones:</p>
                <ul>
                  {job.addons.map((addon) => (
                    <li key={addon.id}>
                      {addon.addon_name_snapshot} (+${addon.price_snapshot.toFixed(2)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {canShowActions && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canAdvance && transition && (
                <>
                  <DropdownMenuItem onClick={() => onStatusChange(job.id, transition.next)}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {transition.label}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(job.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>}
        </div>

        <div className="text-xs text-muted-foreground">
          Creado {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: es })}
        </div>

        {canAdvance && transition && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 gap-2"
            onClick={() => onStatusChange(job.id, transition.next)}
          >
            <ArrowRight className="w-4 h-4" />
            {transition.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
