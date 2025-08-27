import {
  Send,
  Download,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  CreditCard,
  Wallet,
  BarChart,
  Banknote,
} from "lucide-react";

export function getEventIcon(type: string, size = 16) {
  const props = { size };

  switch (type) {
    case "sent":
      return <Send {...props} className="text-rose-500" />;
    case "recv":
      return <Download {...props} className="text-emerald-500" />;
    case "info":
      return <Info {...props} className="text-blue-500" />;
    case "alert":
      return <AlertTriangle {...props} className="text-amber-500" />;
    case "success":
      return <CheckCircle {...props} className="text-green-500" />;
    case "error":
      return <XCircle {...props} className="text-red-500" />;
    case "action":
      return <RefreshCw {...props} className="text-indigo-500" />;
    case "subscription":
      return <CreditCard {...props} className="text-purple-500" />;
    case "wallet":
      return <Wallet {...props} className="text-teal-500" />;
    case "market":
      return <BarChart {...props} className="text-yellow-500" />;
    case "treasury":
      return <Banknote {...props} className="text-green-700" />;
    default:
      return <Info {...props} className="text-zinc-400" />;
  }
}
