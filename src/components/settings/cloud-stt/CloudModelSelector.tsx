import React from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../../ui/Dropdown";
import type { CloudSTTProvider } from "@/bindings";

interface CloudModelSelectorProps {
  provider: CloudSTTProvider;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export const CloudModelSelector: React.FC<CloudModelSelectorProps> = ({
  provider,
  selectedModel,
  onModelChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const options = provider.models.map((model) => ({
    value: model.id,
    label: model.name,
  }));

  return (
    <Dropdown
      options={options}
      selectedValue={selectedModel || provider.default_model}
      onSelect={onModelChange}
      placeholder={t("cloudStt.selectModel")}
      disabled={disabled}
      className="min-w-[250px]"
    />
  );
};
