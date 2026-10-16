import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadScenario, type Rules, type ScenarioFile } from '@ww2hex/engine';

/**
 * Finds every scenarios/<id>/scenario.json and keeps those that pass
 * validation. A broken scenario is reported and skipped, not fatal.
 */
export function loadScenarioCatalog(dir: string, rules: Rules, log: (msg: string) => void = console.warn): Map<string, ScenarioFile> {
  const out = new Map<string, ScenarioFile>();
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name, 'scenario.json');
    try {
      if (!statSync(path).isFile()) continue;
    } catch {
      continue;
    }
    try {
      const file = JSON.parse(readFileSync(path, 'utf8')) as ScenarioFile;
      loadScenario(file, rules);
      if (out.has(file.id)) throw new Error(`duplicate scenario id ${file.id}`);
      out.set(file.id, file);
    } catch (e) {
      log(`Skipping scenario ${path}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}
