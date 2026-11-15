import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
// CRF не задаём: у h264 по умолчанию и так 18, а глобальный --crf ломает рендер звука (--codec=wav в render:cta)
Config.setConcurrency("75%");

// Проект лежит на Desktop (папка под защитой macOS), и helper-процессы Chrome Headless Shell
// не могут читать оттуда свои файлы (падают на icudtl.dat). Поэтому браузер копируется
// в ~/Library/Caches скриптом `npm run setup:browser`. Запасной вариант — установленный Google Chrome,
// но он рендерит в 2–3 раза медленнее
const cachedShell = join(homedir(), "Library/Caches/video-kit-studio/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// `remotion browser ensure` (npm run setup:browser) должен скачать свой браузер, а не взять системный
const ensuring = process.argv.includes("browser");
if (existsSync(cachedShell)) Config.setBrowserExecutable(cachedShell);
else if (existsSync(systemChrome) && !ensuring) Config.setBrowserExecutable(systemChrome);
