// src/components/Loader.jsx
import { Loader2 } from "lucide-react";

const Loader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
    <Loader2 className="animate-spin text-blue-400 w-16 h-16 mb-4" />
    <p className="text-slate-400 font-semibold">Loading dashboard...</p>
  </div>
);

export default Loader;
