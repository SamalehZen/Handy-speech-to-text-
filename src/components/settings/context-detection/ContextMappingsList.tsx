import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { commands, ContextMapping, ContextStylePrompt } from "@/bindings";
import { Dropdown } from "@/components/ui";
import { Button } from "@/components/ui/Button";

const DEFAULT_APPS: { id: string; name: string; defaultStyle: string }[] = [
  { id: "gmail", name: "Gmail", defaultStyle: "email_pro" },
  { id: "outlook", name: "Outlook", defaultStyle: "email_pro" },
  { id: "outlook_web", name: "Outlook Web", defaultStyle: "email_pro" },
  { id: "apple_mail", name: "Apple Mail", defaultStyle: "email_pro" },
  { id: "slack", name: "Slack", defaultStyle: "chat" },
  { id: "slack_web", name: "Slack Web", defaultStyle: "chat" },
  { id: "discord", name: "Discord", defaultStyle: "chat" },
  { id: "discord_web", name: "Discord Web", defaultStyle: "chat" },
  { id: "whatsapp", name: "WhatsApp", defaultStyle: "chat" },
  { id: "whatsapp_web", name: "WhatsApp Web", defaultStyle: "chat" },
  { id: "telegram", name: "Telegram", defaultStyle: "chat" },
  { id: "telegram_web", name: "Telegram Web", defaultStyle: "chat" },
  { id: "imessage", name: "iMessage", defaultStyle: "chat" },
  { id: "vscode", name: "VS Code", defaultStyle: "code" },
  { id: "cursor", name: "Cursor", defaultStyle: "code" },
  { id: "notion", name: "Notion", defaultStyle: "notes" },
  { id: "notion_web", name: "Notion Web", defaultStyle: "notes" },
  { id: "obsidian", name: "Obsidian", defaultStyle: "notes" },
  { id: "chatgpt", name: "ChatGPT", defaultStyle: "ai_assistant" },
  { id: "claude", name: "Claude", defaultStyle: "ai_assistant" },
  { id: "linkedin", name: "LinkedIn", defaultStyle: "social_pro" },
  { id: "twitter", name: "Twitter/X", defaultStyle: "social_casual" },
  { id: "github", name: "GitHub", defaultStyle: "dev_tools" },
  { id: "linear", name: "Linear", defaultStyle: "dev_tools" },
  { id: "linear_web", name: "Linear Web", defaultStyle: "dev_tools" },
];

export const ContextMappingsList: React.FC = () => {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState<ContextMapping[]>([]);
  const [prompts, setPrompts] = useState<ContextStylePrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [mappingsResult, promptsResult] = await Promise.all([
        commands.getContextMappings(),
        commands.getContextStylePrompts(),
      ]);
      if (mappingsResult.status === "ok") {
        setMappings(mappingsResult.data);
      }
      if (promptsResult.status === "ok") {
        setPrompts(promptsResult.data);
      }
    } catch (error) {
      console.error("Failed to load context data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStyleForApp = (appId: string): string => {
    const mapping = mappings.find((m) => m.app_id === appId);
    if (mapping) return mapping.context_style;
    const defaultApp = DEFAULT_APPS.find((a) => a.id === appId);
    return defaultApp?.defaultStyle || "correction";
  };

  const handleStyleChange = async (appId: string, newStyle: string) => {
    try {
      const result = await commands.updateContextMapping(appId, newStyle);
      if (result.status === "ok") {
        await loadData();
      }
    } catch (error) {
      console.error("Failed to update mapping:", error);
    }
  };

  const handleResetMapping = async (appId: string) => {
    try {
      const result = await commands.deleteContextMapping(appId);
      if (result.status === "ok") {
        await loadData();
      }
    } catch (error) {
      console.error("Failed to reset mapping:", error);
    }
  };

  const styleOptions = prompts.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const isCustomMapping = (appId: string): boolean => {
    const defaultApp = DEFAULT_APPS.find((a) => a.id === appId);
    const currentStyle = getStyleForApp(appId);
    return defaultApp?.defaultStyle !== currentStyle;
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-mid-gray">
        {t("common.loading")}
      </div>
    );
  }

  const categories = [
    {
      key: "email",
      label: t("settings.context.categories.email"),
      apps: ["gmail", "outlook", "outlook_web", "apple_mail"],
    },
    {
      key: "chat",
      label: t("settings.context.categories.chat"),
      apps: [
        "slack",
        "slack_web",
        "discord",
        "discord_web",
        "whatsapp",
        "whatsapp_web",
        "telegram",
        "telegram_web",
        "imessage",
      ],
    },
    {
      key: "code",
      label: t("settings.context.categories.code"),
      apps: ["vscode", "cursor"],
    },
    {
      key: "notes",
      label: t("settings.context.categories.notes"),
      apps: ["notion", "notion_web", "obsidian"],
    },
    {
      key: "ai",
      label: t("settings.context.categories.ai"),
      apps: ["chatgpt", "claude"],
    },
    {
      key: "social",
      label: t("settings.context.categories.social"),
      apps: ["linkedin", "twitter"],
    },
    {
      key: "dev",
      label: t("settings.context.categories.dev"),
      apps: ["github", "linear", "linear_web"],
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-mid-gray mb-4">
        {t("settings.context.mappings.description")}
      </p>

      {categories.map((category) => (
        <div key={category.key} className="space-y-2">
          <h4 className="text-xs font-semibold text-mid-gray uppercase tracking-wide">
            {category.label}
          </h4>
          <div className="space-y-1">
            {category.apps.map((appId) => {
              const app = DEFAULT_APPS.find((a) => a.id === appId);
              if (!app) return null;

              return (
                <div
                  key={appId}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-mid-gray/5 hover:bg-mid-gray/10 transition-colors"
                >
                  <span className="text-sm font-medium">{app.name}</span>
                  <div className="flex items-center gap-2">
                    <Dropdown
                      selectedValue={getStyleForApp(appId)}
                      options={styleOptions}
                      onSelect={(value) =>
                        value && handleStyleChange(appId, value)
                      }
                      className="min-w-[180px]"
                    />
                    {isCustomMapping(appId) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetMapping(appId)}
                        title={t("settings.context.mappings.reset")}
                      >
                        <Trash2 className="w-4 h-4 text-mid-gray hover:text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
