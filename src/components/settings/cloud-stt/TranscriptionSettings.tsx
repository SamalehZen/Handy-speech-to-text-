import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { TranscriptionModeSelector } from "./TranscriptionModeSelector";
import { CloudSTTSettings } from "./CloudSTTSettings";
import ModelSelector from "../../model-selector/ModelSelector";

export const TranscriptionSettings: React.FC = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"offline" | "cloud">("offline");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await commands.getCloudSttConfig();
      if (result.status === "ok") {
        setMode(result.data.enabled ? "cloud" : "offline");
      }
    } catch (error) {
      console.error("Failed to load cloud STT config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = async (newMode: "offline" | "cloud") => {
    setMode(newMode);
    try {
      await commands.setCloudSttEnabled(newMode === "cloud");
    } catch (error) {
      console.error("Failed to set cloud STT enabled:", error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-6">
      <SettingsGroup title={t("cloudStt.title")}>
        <div className="px-4 py-3">
          <TranscriptionModeSelector mode={mode} onModeChange={handleModeChange} />
        </div>
      </SettingsGroup>

      {mode === "offline" ? (
        <SettingsGroup title={t("cloudStt.offlineSettings")}>
          <div className="px-4 py-3">
            <ModelSelector />
          </div>
        </SettingsGroup>
      ) : (
        <SettingsGroup title={t("cloudStt.cloudSettings")}>
          <CloudSTTSettings />
        </SettingsGroup>
      )}
    </div>
  );
};
