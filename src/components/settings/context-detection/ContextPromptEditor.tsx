import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { commands, ContextStylePrompt } from "@/bindings";
import { SettingContainer, Dropdown, Textarea } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const ContextPromptEditor: React.FC = () => {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<ContextStylePrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadPrompts = async () => {
    try {
      const result = await commands.getContextStylePrompts();
      if (result.status === "ok") {
        setPrompts(result.data);
        if (!selectedPromptId && result.data.length > 0) {
          setSelectedPromptId(result.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load prompts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    const selected = prompts.find((p) => p.id === selectedPromptId);
    if (selected) {
      setDraftName(selected.name);
      setDraftDescription(selected.description);
      setDraftPrompt(selected.prompt);
    }
  }, [selectedPromptId, prompts]);

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  const isDirty =
    selectedPrompt &&
    (draftName !== selectedPrompt.name ||
      draftDescription !== selectedPrompt.description ||
      draftPrompt !== selectedPrompt.prompt);

  const handleSave = async () => {
    if (!selectedPromptId || !isDirty) return;

    setIsSaving(true);
    try {
      const result = await commands.updateContextStylePrompt(
        selectedPromptId,
        draftName.trim() || null,
        draftDescription.trim() || null,
        draftPrompt.trim() || null
      );
      if (result.status === "ok") {
        await loadPrompts();
      }
    } catch (error) {
      console.error("Failed to update prompt:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedPromptId) return;

    setIsSaving(true);
    try {
      const result = await commands.resetContextStylePrompt(selectedPromptId);
      if (result.status === "ok") {
        await loadPrompts();
      }
    } catch (error) {
      console.error("Failed to reset prompt:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const promptOptions = prompts.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  if (isLoading) {
    return (
      <div className="p-4 text-center text-mid-gray">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-mid-gray">
        {t("settings.context.prompts.description")}
      </p>

      <SettingContainer
        title={t("settings.context.prompts.selectStyle")}
        layout="stacked"
        grouped={true}
      >
        <Dropdown
          selectedValue={selectedPromptId}
          options={promptOptions}
          onSelect={(value) => setSelectedPromptId(value)}
          className="w-full max-w-sm"
        />
      </SettingContainer>

      {selectedPrompt && (
        <div className="space-y-4 pt-2">
          <SettingContainer
            title={t("settings.context.prompts.styleName")}
            layout="stacked"
            grouped={true}
          >
            <Input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={t("settings.context.prompts.styleNamePlaceholder")}
              variant="compact"
              className="max-w-sm"
            />
          </SettingContainer>

          <SettingContainer
            title={t("settings.context.prompts.styleDescription")}
            layout="stacked"
            grouped={true}
          >
            <Input
              type="text"
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder={t(
                "settings.context.prompts.styleDescriptionPlaceholder"
              )}
              variant="compact"
              className="w-full"
            />
          </SettingContainer>

          <SettingContainer
            title={t("settings.context.prompts.promptText")}
            layout="stacked"
            grouped={true}
          >
            <Textarea
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              placeholder={t("settings.context.prompts.promptPlaceholder")}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-mid-gray/70 mt-2">
              {t("settings.context.prompts.promptTip")}
            </p>
          </SettingContainer>

          <div className="flex gap-2 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving
                ? t("common.saving")
                : t("settings.context.prompts.save")}
            </Button>
            {selectedPrompt.is_builtin && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleReset}
                disabled={isSaving}
                title={t("settings.context.prompts.resetToDefault")}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("settings.context.prompts.reset")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
