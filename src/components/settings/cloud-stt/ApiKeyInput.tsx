import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, Loader2 } from "lucide-react";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onTest: () => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  value,
  onChange,
  onTest,
  disabled = false,
  placeholder,
}) => {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    setLocalValue(value);
    setTestResult(null);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
      setTestResult(null);
    }
  };

  const handleTest = async () => {
    if (!localValue.trim()) return;

    if (localValue !== value) {
      onChange(localValue);
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const result = await onTest();
      setTestResult(result);
    } catch {
      setTestResult(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <Input
        type="password"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setTestResult(null);
        }}
        onBlur={handleBlur}
        placeholder={placeholder || t("cloudStt.apiKeyPlaceholder")}
        variant="compact"
        disabled={disabled}
        className="flex-1 min-w-[280px]"
      />
      <Button
        onClick={handleTest}
        disabled={disabled || isLoading || !localValue.trim()}
        variant="secondary"
        size="sm"
        className="min-w-[80px] flex items-center justify-center gap-1"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : testResult === true ? (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-green-500">{t("cloudStt.testSuccess")}</span>
          </>
        ) : testResult === false ? (
          <>
            <X className="w-4 h-4 text-red-500" />
            <span className="text-red-500">{t("cloudStt.testFailed")}</span>
          </>
        ) : (
          t("cloudStt.testConnection")
        )}
      </Button>
    </div>
  );
};
