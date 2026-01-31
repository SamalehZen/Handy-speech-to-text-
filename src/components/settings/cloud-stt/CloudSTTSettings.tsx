import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { commands, type CloudSTTProvider, type CloudSTTConfig } from "@/bindings";
import { SettingContainer } from "../../ui/SettingContainer";
import { CloudProviderCard } from "./CloudProviderCard";
import { ApiKeyInput } from "./ApiKeyInput";
import { CloudModelSelector } from "./CloudModelSelector";

interface CloudSTTSettingsProps {
  onConfigChange?: () => void;
}

export const CloudSTTSettings: React.FC<CloudSTTSettingsProps> = ({
  onConfigChange,
}) => {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<CloudSTTProvider[]>([]);
  const [config, setConfig] = useState<CloudSTTConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [providersResult, configResult] = await Promise.all([
        commands.getCloudSttProviders(),
        commands.getCloudSttConfig(),
      ]);

      if (providersResult.status === "ok") {
        setProviders(providersResult.data);
      }
      if (configResult.status === "ok") {
        setConfig(configResult.data);
      }
    } catch (error) {
      console.error("Failed to load cloud STT data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSelect = async (providerId: string) => {
    try {
      await commands.setCloudSttProvider(providerId);
      setConfig((prev) =>
        prev ? { ...prev, active_provider: providerId } : null
      );
      onConfigChange?.();
    } catch (error) {
      console.error("Failed to set provider:", error);
    }
  };

  const handleApiKeyChange = async (providerId: string, apiKey: string) => {
    try {
      await commands.setCloudSttApiKey(providerId, apiKey);
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              api_keys: { ...prev.api_keys, [providerId]: apiKey },
            }
          : null
      );
      onConfigChange?.();
    } catch (error) {
      console.error("Failed to set API key:", error);
    }
  };

  const handleModelChange = async (providerId: string, modelId: string) => {
    try {
      await commands.setCloudSttModel(providerId, modelId);
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              selected_models: { ...prev.selected_models, [providerId]: modelId },
            }
          : null
      );
      onConfigChange?.();
    } catch (error) {
      console.error("Failed to set model:", error);
    }
  };

  const handleTestConnection = async (providerId: string): Promise<boolean> => {
    const apiKey = config?.api_keys[providerId];
    if (!apiKey) return false;

    try {
      const result = await commands.testCloudSttConnection(providerId, apiKey);
      return result.status === "ok" && result.data === true;
    } catch {
      return false;
    }
  };

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-mid-gray">
          {t("common.loading")}...
        </div>
      </div>
    );
  }

  const selectedProvider = providers.find(
    (p) => p.id === config.active_provider
  );

  return (
    <div className="space-y-4">
      <SettingContainer
        title={t("cloudStt.provider")}
        description={t("cloudStt.providerDescription")}
        descriptionMode="tooltip"
        layout="stacked"
        grouped={true}
      >
        <div className="flex flex-col gap-2">
          {providers.map((provider) => (
            <CloudProviderCard
              key={provider.id}
              provider={provider}
              isSelected={config.active_provider === provider.id}
              isConfigured={!!config.api_keys[provider.id]?.trim()}
              onSelect={() => handleProviderSelect(provider.id)}
            />
          ))}
        </div>
      </SettingContainer>

      {selectedProvider && (
        <>
          <SettingContainer
            title={t("cloudStt.apiKey")}
            description={t("cloudStt.apiKeyDescription")}
            descriptionMode="tooltip"
            layout="stacked"
            grouped={true}
          >
            <div className="space-y-2">
              <ApiKeyInput
                value={config.api_keys[selectedProvider.id] || ""}
                onChange={(value) =>
                  handleApiKeyChange(selectedProvider.id, value)
                }
                onTest={() => handleTestConnection(selectedProvider.id)}
              />
              <a
                href={selectedProvider.api_key_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-logo-primary hover:underline"
              >
                {t("cloudStt.getApiKey", { provider: selectedProvider.label })}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </SettingContainer>

          <SettingContainer
            title={t("cloudStt.model")}
            description={t("cloudStt.modelDescription")}
            descriptionMode="tooltip"
            layout="horizontal"
            grouped={true}
          >
            <CloudModelSelector
              provider={selectedProvider}
              selectedModel={
                config.selected_models[selectedProvider.id] ||
                selectedProvider.default_model
              }
              onModelChange={(modelId) =>
                handleModelChange(selectedProvider.id, modelId)
              }
              disabled={!config.api_keys[selectedProvider.id]?.trim()}
            />
          </SettingContainer>
        </>
      )}
    </div>
  );
};
