import { format, parseISO } from "date-fns";
import type { RationRecord } from "@workspace/api-client-react";

export function formatDateTime(dateStr: string, timeStr: string) {
  try {
    const d = parseISO(dateStr);
    return `${format(d, "dd.MM.yyyy")}, ${timeStr}`;
  } catch (e) {
    return `${dateStr}, ${timeStr}`;
  }
}

export function getStatusInfo(record: RationRecord) {
  const { status, codification } = record;
  const confLabel = codification?.confidence_label;
  const confValue = codification?.confidence;
  
  if (status === "pending") {
    return { label: "Ожидание", variant: "secondary", color: "bg-muted text-muted-foreground", hex: "gray" };
  }
  if (status === "codified" && confLabel === "Высокая уверенность") {
    return { label: "Кодифицировано", variant: "default", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100", hex: "green" };
  }
  if (status === "needs_review" && confLabel === "Требуется проверка") {
    return { label: "Требует проверки", variant: "outline", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100", hex: "amber" };
  }
  if (status === "needs_review" && confLabel === "Код не определён") {
    return { label: "Код не определён", variant: "destructive", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100", hex: "red" };
  }
  if (status === "confirmed") {
    return { label: "Подтверждено", variant: "default", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100", hex: "green" };
  }
  if (status === "sent_to_review") {
    return { label: "На проверке", variant: "outline", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100", hex: "orange" };
  }
  
  // Fallbacks
  if (status === "codified") {
     return { label: "Кодифицировано", variant: "default", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100", hex: "green" };
  }
  if (status === "needs_review") {
     return { label: "Требует проверки", variant: "outline", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100", hex: "amber" };
  }
  return { label: status, variant: "secondary", color: "bg-muted text-muted-foreground", hex: "gray" };
}
