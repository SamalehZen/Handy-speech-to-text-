const fs = require('fs');
const path = require('path');

const translations = {
  de: { sidebar: 'Kontext', saving: 'Speichern...' },
  es: { sidebar: 'Contexto', saving: 'Guardando...' },
  it: { sidebar: 'Contesto', saving: 'Salvataggio...' },
  ja: { sidebar: 'コンテキスト', saving: '保存中...' },
  pt: { sidebar: 'Contexto', saving: 'Salvando...' },
  ru: { sidebar: 'Контекст', saving: 'Сохранение...' },
  zh: { sidebar: '上下文', saving: '保存中...' },
  pl: { sidebar: 'Kontekst', saving: 'Zapisywanie...' },
  cs: { sidebar: 'Kontext', saving: 'Ukládání...' },
  tr: { sidebar: 'Bağlam', saving: 'Kaydediliyor...' },
  uk: { sidebar: 'Контекст', saving: 'Збереження...' },
  vi: { sidebar: 'Ngữ cảnh', saving: 'Đang lưu...' },
};

for (const [lang, trans] of Object.entries(translations)) {
  const filePath = path.join(lang, 'translation.json');
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove trailing commas before } or ]
    content = content.replace(/,(\s*[}\]])/g, '$1');
    
    const json = JSON.parse(content);
    
    if (!json.sidebar) json.sidebar = {};
    json.sidebar.context = trans.sidebar;
    
    if (!json.common) json.common = {};
    json.common.saving = trans.saving;
    
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
    console.log(`Updated ${lang}`);
  } catch (e) {
    console.error(`Error processing ${lang}: ${e.message}`);
  }
}
