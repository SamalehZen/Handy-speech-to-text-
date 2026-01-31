import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Monitor, Cloud, Download, Key, Lock, Zap } from "lucide-react";
import { commands, type ModelInfo, type CloudSTTProvider } from "@/bindings";
import ModelCard from "./ModelCard";
import HandyTextLogo from "../icons/HandyTextLogo";
import { CloudSTTSettings } from "../settings/cloud-stt";

interface OnboardingProps {
  onModelSelected: () => void;
}

type OnboardingMode = "select" | "offline" | "cloud";

const ModeCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  benefits: { icon: React.ReactNode; text: string }[];
  onClick: () => void;
  variant?: "default" | "featured";
}> = ({ title, icon, benefits, onClick, variant = "default" }) => {
  const isFeatured = variant === "featured";

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200 text-left w-full ${
        isFeatured
          ? "border-logo-primary bg-logo-primary/5 hover:bg-logo-primary/10"
          : "border-mid-gray/20 hover:border-mid-gray/40 hover:bg-mid-gray/5"
      }`}
    >
      <div className="mb-4 p-3 rounded-full bg-mid-gray/10">{icon}</div>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-2 w-full">
        {benefits.map((benefit, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-sm text-mid-gray"
          >
            {benefit.icon}
            <span>{benefit.text}</span>
          </div>
        ))}
      </div>
    </button>
  );
};

const Onboarding: React.FC<OnboardingProps> = ({ onModelSelected }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<OnboardingMode>("select");
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [cloudProviders, setCloudProviders] = useState<CloudSTTProvider[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloudConfigured, setCloudConfigured] = useState(false);

  useEffect(() => {
    loadModels();
    loadCloudProviders();
  }, []);

  const loadModels = async () => {
    try {
      const result = await commands.getAvailableModels();
      if (result.status === "ok") {
        setAvailableModels(result.data.filter((m) => !m.is_downloaded));
      } else {
        setError(t("onboarding.errors.loadModels"));
      }
    } catch (err) {
      console.error("Failed to load models:", err);
      setError(t("onboarding.errors.loadModels"));
    }
  };

  const loadCloudProviders = async () => {
    try {
      const result = await commands.getCloudSttProviders();
      if (result.status === "ok") {
        setCloudProviders(result.data);
      }
    } catch (err) {
      console.error("Failed to load cloud providers:", err);
    }
  };

  const handleDownloadModel = async (modelId: string) => {
    setDownloading(true);
    setError(null);
    onModelSelected();

    try {
      const result = await commands.downloadModel(modelId);
      if (result.status === "error") {
        console.error("Download failed:", result.error);
        setError(t("onboarding.errors.downloadModel", { error: result.error }));
        setDownloading(false);
      }
    } catch (err) {
      console.error("Download failed:", err);
      setError(t("onboarding.errors.downloadModel", { error: String(err) }));
      setDownloading(false);
    }
  };

  const handleCloudSetupComplete = async () => {
    try {
      await commands.setCloudSttEnabled(true);
      onModelSelected();
    } catch (err) {
      console.error("Failed to enable cloud STT:", err);
    }
  };

  const handleCloudConfigChange = async () => {
    try {
      const result = await commands.getCloudSttConfig();
      if (result.status === "ok") {
        const hasApiKey = Object.values(result.data.api_keys).some(
          (key) => key && key.trim() !== "",
        );
        setCloudConfigured(hasApiKey && !!result.data.active_provider);
      }
    } catch (err) {
      console.error("Failed to check cloud config:", err);
    }
  };

  const getRecommendedBadge = (modelId: string): boolean => {
    return modelId === "parakeet-tdt-0.6b-v3";
  };

  if (mode === "select") {
    return (
      <div className="h-screen w-screen flex flex-col p-6 gap-6 inset-0">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <HandyTextLogo width={200} />
          <p className="text-text/70 max-w-md font-medium mx-auto text-center">
            {t("onboarding.modeSelection.title")}
          </p>
        </div>

        <div className="max-w-[700px] w-full mx-auto flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-2 gap-4">
            <ModeCard
              title={t("onboarding.modeSelection.offline.title")}
              icon={<Monitor className="w-8 h-8 text-mid-gray" />}
              benefits={[
                {
                  icon: <Lock className="w-4 h-4" />,
                  text: t("onboarding.modeSelection.offline.benefit1"),
                },
                {
                  icon: <Zap className="w-4 h-4" />,
                  text: t("onboarding.modeSelection.offline.benefit2"),
                },
                {
                  icon: <Download className="w-4 h-4" />,
                  text: t("onboarding.modeSelection.offline.benefit3"),
                },
              ]}
              onClick={() => setMode("offline")}
            />
            <ModeCard
              title={t("onboarding.modeSelection.cloud.title")}
              icon={<Cloud className="w-8 h-8 text-logo-primary" />}
              benefits={[
                {
                  icon: <Zap className="w-4 h-4" />,
                  text: t("onboarding.modeSelection.cloud.benefit1"),
                },
                {
                  icon: <Download className="w-4 h-4" />,
                  text: t("onboarding.modeSelection.cloud.benefit2"),
                },
                {
                  icon: <Key className="w-4 h-4" />,
                  text: t("onboarding.modeSelection.cloud.benefit3"),
                },
              ]}
              onClick={() => setMode("cloud")}
              variant="featured"
            />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "cloud") {
    return (
      <div className="h-screen w-screen flex flex-col p-6 gap-4 inset-0">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <HandyTextLogo width={200} />
          <p className="text-text/70 max-w-md font-medium mx-auto text-center">
            {t("onboarding.cloudSetup.subtitle")}
          </p>
        </div>

        <div className="max-w-[600px] w-full mx-auto flex-1 flex flex-col min-h-0">
          <div className="bg-background border border-mid-gray/20 rounded-lg p-4 mb-4">
            <CloudSTTSettings onConfigChange={handleCloudConfigChange} />
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setMode("select")}
              className="px-4 py-2 text-sm font-medium text-mid-gray hover:text-text transition-colors"
            >
              {t("common.back")}
            </button>
            <button
              onClick={handleCloudSetupComplete}
              disabled={!cloudConfigured}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                cloudConfigured
                  ? "bg-logo-primary text-white hover:bg-logo-primary/90"
                  : "bg-mid-gray/20 text-mid-gray cursor-not-allowed"
              }`}
            >
              {t("onboarding.cloudSetup.continue")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col p-6 gap-4 inset-0">
      <div className="flex flex-col items-center gap-2 shrink-0">
        <HandyTextLogo width={200} />
        <p className="text-text/70 max-w-md font-medium mx-auto">
          {t("onboarding.subtitle")}
        </p>
      </div>

      <div className="max-w-[600px] w-full mx-auto text-center flex-1 flex flex-col min-h-0">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4 shrink-0">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-4 pb-6">
          {availableModels
            .filter((model) => getRecommendedBadge(model.id))
            .map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                variant="featured"
                disabled={downloading}
                onSelect={handleDownloadModel}
              />
            ))}

          {availableModels
            .filter((model) => !getRecommendedBadge(model.id))
            .sort((a, b) => Number(a.size_mb) - Number(b.size_mb))
            .map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                disabled={downloading}
                onSelect={handleDownloadModel}
              />
            ))}
        </div>

        <button
          onClick={() => setMode("select")}
          className="text-sm text-mid-gray hover:text-text transition-colors"
        >
          {t("common.back")}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
