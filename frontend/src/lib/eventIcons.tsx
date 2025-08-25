import {
  Send,
  Download,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

export function getEventIcon(type: string, size = 16) {
  let icon = null;
  let title = "";

  switch (type) {
    case "sent":
      icon = <Send className={`h-${size/4} w-${size/4} text-rose-500`} />;
      title = "Sent Transaction";
      break;
    case "recv":
      icon = <Download className={`h-${size/4} w-${size/4} text-emerald-500`} />;
      title = "Received Transaction";
      break;
    case "info":
      icon = <Info className={`h-${size/4} w-${size/4} text-blue-500`} />;
      title = "Info";
      break;
    case "alert":
      icon = <AlertTriangle className={`h-${size/4} w-${size/4} text-amber-500`} />;
      title = "Alert";
      break;
    case "success":
      icon = <CheckCircle className={`h-${size/4} w-${size/4} text-green-500`} />;
      title = "Success";
      break;
    case "error":
      icon = <XCircle className={`h-${size/4} w-${size/4} text-red-500`} />;
      title = "Error";
      break;
    case "action":
      icon = <RefreshCw className={`h-${size/4} w-${size/4} text-indigo-500`} />;
      title = "Action";
      break;
    default:
      icon = <Info className={`h-${size/4} w-${size/4} text-zinc-400`} />;
      title = "Event";
      break;
  }

  return <span title={title}>{icon}</span>;
}
