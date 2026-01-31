import React from "react";
import { useTranslation } from "react-i18next";
import { Monitor, Cloud } from "lucide-react";

interface TranscriptionModeSelectorProps {
  mode: "offline" | "cloud";
  onModeChange: (mode: "offline" | "cloud") => void;
  disabled?: boolean;
}

export const TranscriptionModeSelector: React.FC<
  TranscriptionModeSelectorProps
> = ({ mode, onModeChange, disabled = false }) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 p-1 bg-mid-gray/10 rounded-lg">
      <button
        type="button"
        onClick={() => onModeChange("offline")}
        disabled={disabled}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          mode === "offline"
            ? "bg-background shadow-sm border border-mid-gray/20 text-text"
            : "text-mid-gray hover:text-text hover:bg-mid-gray/10"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <Monitor className="w-4 h-4" />
        <span>{t("cloudStt.mode.offline")}</span>
      </button>
      <button
        type="button"
        onClick={() => onModeChange("cloud")}
        disabled={disabled}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          mode === "cloud"
            ? "bg-background shadow-sm border border-mid-gray/20 text-text"
            : "text-mid-gray hover:text-text hover:bg-mid-gray/10"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <Cloud className="w-4 h-4" />
        <span>{t("cloudStt.mode.cloud")}</span>
      </button>
    </div>
  );
};
