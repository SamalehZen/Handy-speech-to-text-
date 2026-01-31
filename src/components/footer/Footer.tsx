import React, { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useTranslation } from "react-i18next";
import { Cloud } from "lucide-react";
import { commands, type CloudSTTConfig } from "@/bindings";

import ModelSelector from "../model-selector";
import UpdateChecker from "../update-checker";

const CloudIndicator: React.FC<{ config: CloudSTTConfig }> = ({ config }) => {
  const { t } = useTranslation();

  const providerLabel =
    config.active_provider === "gemini" ? "Gemini" : "OpenAI";

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-logo-primary/10 rounded text-sm font-medium text-logo-primary">
      <Cloud className="w-4 h-4" />
      <span>{t("cloudStt.activeProvider", { provider: providerLabel })}</span>
    </div>
  );
};

const Footer: React.FC = () => {
  const [version, setVersion] = useState("");
  const [cloudConfig, setCloudConfig] = useState<CloudSTTConfig | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("0.1.2");
      }
    };

    const fetchCloudConfig = async () => {
      try {
        const result = await commands.getCloudSttConfig();
        if (result.status === "ok") {
          setCloudConfig(result.data);
        }
      } catch (error) {
        console.error("Failed to get cloud STT config:", error);
      }
    };

    fetchVersion();
    fetchCloudConfig();
  }, []);

  const showCloudIndicator =
    cloudConfig?.enabled && cloudConfig?.active_provider;

  return (
    <div className="w-full border-t border-mid-gray/20 pt-3">
      <div className="flex justify-between items-center text-xs px-4 pb-3 text-text/60">
        <div className="flex items-center gap-4">
          {showCloudIndicator ? (
            <CloudIndicator config={cloudConfig} />
          ) : (
            <ModelSelector />
          )}
        </div>

        {/* Update Status */}
        <div className="flex items-center gap-1">
          <UpdateChecker />
          <span>•</span>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span>v{version}</span>
        </div>
      </div>
    </div>
  );
};

export default Footer;
