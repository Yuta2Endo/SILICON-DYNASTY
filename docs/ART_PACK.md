# Silicon Dynasty — Art Pack

Набор векторных эмблем и иконок приложения. Все изображения нарисованы вручную в SVG
(без AI-генерации), поэтому остаются чёткими на любом размере, имеют прозрачный фон
и единый визуальный язык.

## Что входит

| Группа | Количество | Расположение |
| --- | --- | --- |
| Эмблемы разделов | 18 | `public/art/sections/*.svg` |
| Иконки ресурсов и товаров | 8 | `public/art/resources/*.svg` |
| Иконка приложения | 3 варианта | `public/art/brand/` |
| Витрина всех иконок | 1 страница | `public/art/index.html` |
| Web/PWA иконки | 4 PNG + favicon | `public/icons/`, `public/favicon.svg` |
| Android launcher и splash | mipmap + drawable | `android/app/src/main/res/` |

Витрина открывается по адресу `/art/` после `npm run dev` или в собранном приложении.

### Разделы

`dashboard`, `company`, `research`, `hardware`, `cpu`, `gpu`, `components`, `os`,
`ai`, `software`, `devices`, `cloud`, `manufacturing`, `market`, `finance`,
`analytics`, `ecosystem`, `settings`.

### Ресурсы

`silicon`, `ingot`, `wafer`, `cpu-die`, `gpu-die`, `dram`, `motherboard`, `server`.

## Визуальный язык

- Плитка 512×512, squircle `rx=112`.
- Фон: навигационный градиент `#0B1626 → #132745 → #091528`.
- Материалы: стекло, металл, синий `#2E6BFF`, циан `#9BE7FF`, фиолетовый, медь.
- Тонкая сетка дорожек, мягкое свечение, блик по верхней кромке.
- Иконки читаются на 36 px; на малых размерах детали упрощаются визуально
  за счёт контрастных силуэтов.

Функциональные иконки интерфейса по-прежнему берутся из **Lucide React**
согласно `docs/UI_UX_SPECIFICATION.md`. Эмблемы из этого набора — декоративная
графика для карточек, меню и витрин, а не замена системных иконок.

## Генерация

```bash
npm run art        # SVG + все PNG
npm run art:generate   # только SVG и витрина
npm run art:render     # только PNG (Playwright + Chromium)
```

Исходники генератора:

- `scripts/art/generate-icons.mjs` — SVG-эмблемы, бренд-иконка, витрина.
- `scripts/art/render-assets.mjs` — растеризация в PNG для Web/PWA и Android,
  включая splash-экраны всех плотностей.

Для рендера нужен установленный Chromium Playwright:

```bash
npx playwright install chromium
```

## Приложение

- `index.html` подключает favicon, apple-touch-icon и `manifest.webmanifest`.
- `public/manifest.webmanifest` — PWA-манифест (standalone, `#f4f7fb`).
- `android/app/src/main/res/values/ic_launcher_background.xml` — фон adaptive icon
  `#0C1728`; foreground лежит в `mipmap-*/ic_launcher_foreground.png`.
- Splash-файлы имеют точные размеры для `drawable`, `drawable-land-*` и
  `drawable-port-*`, поэтому не растягиваются на устройствах с разными экранами.

## Интеграция в интерфейс

- `src/app/art.ts` — карта эмблем разделов и категорий исследований.
- `src/app/AppShell.tsx` — иконка приложения в сайдбаре и мобильном хедере,
  эмблема активного раздела в заголовке страницы.
- `src/features/menu/MainMenu.tsx` — бренд-иконка в главном меню.
- `src/features/research/ResearchPage.tsx` — эмблема категории в карточке
  технологии; статус и категория стоят в одной строке, название идёт ниже.
- `src/features/market/MarketPage.tsx` — эмблемы в заголовках секций, карточках
  продуктов, истории производства и пустых состояниях.

Все эмблемы декоративные: `alt=""` и `aria-hidden="true"`. Смысл интерфейса
остаётся в тексте и функциональных иконках Lucide.
