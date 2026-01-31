import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsGroup } from "@/components/ui";
import { ContextMappingsList } from "./ContextMappingsList";
import { ContextPromptEditor } from "./ContextPromptEditor";
import { useSettings } from "@/hooks/useSettings";

const DisabledNotice: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="p-4 bg-mid-gray/5 rounded-lg border border-mid-gray/20">
    <p className="text-sm text-mid-gray">{children}</p>
  </div>
);

export const ContextSettings: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const enabled = getSetting("post_process_enabled") || false;

  if (!enabled) {
    return (
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <SettingsGroup title={t("settings.context.title")}>
          <DisabledNotice>
            {t("settings.context.disabledNotice")}
          </DisabledNotice>
        </SettingsGroup>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.context.mappings.title")}>
        <ContextMappingsList />
      </SettingsGroup>

      <SettingsGroup title={t("settings.context.prompts.title")}>
        <ContextPromptEditor />
      </SettingsGroup>
    </div>
  );
};
