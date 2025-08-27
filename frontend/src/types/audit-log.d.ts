export interface LogEntry {
  id: number;
  type: "info" | "success" | "error" | "action" | "alert";
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}
