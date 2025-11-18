# Media Pi UI

[![.github/workflows/ci.yml](https://github.com/sw-consulting/media-pi.ui/actions/workflows/ci.yml/badge.svg)](https://github.com/sw-consulting/media-pi.ui/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/sw-consulting/media-pi.ui/branch/main/graph/badge.svg)](https://codecov.io/gh/sw-consulting/media-pi.ui)

Media Pi system frontend

## Конфигурация

### Таймауты системных операций

Таймауты для системных операций (применение настроек, перезагрузка, выключение) настраиваются переменными окружения или с помощтью конфигурационного файла.

#### Переменные окружения 
Добавьте эти переменные в файл `.env`:

```bash
VITE_REBOOT_TIMEOUT=30000    # 30 секунд (по умолчанию)
VITE_SHUTDOWN_TIMEOUT=5000   # 5 секунд (по умолчанию)  
VITE_APPLY_TIMEOUT=10000     # 10 секунд (по умолчанию)
```

#### Конфигурация времени выполнения
Измените файл `public/config.json`:

```json
{
  "apiUrl": "http://localhost:8080/api",
  "enableLog": true,
  "timeouts": {
    "reboot": 45000,    // 45 секунд
    "shutdown": 10000,  // 10 секунд
    "apply": 15000      // 15 секунд
  }
}
```

#### Приоритет конфигурации
1. Конфигурация времени выполнения (config.json) имеет наивысший приоритет
2. Переменные окружения 
3. Значения по умолчанию 


