import React from "react";
import { useTranslation } from "react-i18next";
import { Check, Sparkles } from "lucide-react";
import type { CloudSTTProvider } from "@/bindings";

interface CloudProviderCardProps {
  provider: CloudSTTProvider;
  isSelected: boolean;
  isConfigured: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export const CloudProviderCard: React.FC<CloudProviderCardProps> = ({
  provider,
  isSelected,
  isConfigured,
  onSelect,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const isGemini = provider.id === "gemini";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
        isSelected
          ? "border-logo-primary bg-logo-primary/5"
          : "border-mid-gray/20 hover:border-mid-gray/40 hover:bg-mid-gray/5"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{provider.label}</span>
          {isGemini && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-logo-primary bg-logo-primary/10 rounded">
              <Sparkles className="w-3 h-3" />
              {t("cloudStt.recommended")}
            </span>
          )}
        </div>
        <p className="text-xs text-mid-gray mt-0.5">{provider.description}</p>
      </div>
      <div className="flex items-center gap-2">
        {isConfigured && (
          <span className="text-green-500">
            <Check className="w-4 h-4" />
          </span>
        )}
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            isSelected
              ? "border-logo-primary bg-logo-primary"
              : "border-mid-gray/40"
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
};
