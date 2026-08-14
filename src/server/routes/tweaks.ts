import { Router } from 'express';
import { getOne, runSql } from '../db';

export const tweaksRouter = Router();

tweaksRouter.get('/', async (_req, res) => {
  try {
    const row = await getOne<{ config_json: string }>('SELECT config_json FROM system_config WHERE id = ?', ['design_tweaks']);
    if (row && typeof row.config_json === 'string') {
      try {
        const parsed = JSON.parse(row.config_json);
        return res.json({ data: parsed });
      } catch (_) {}
    }
    res.json({ data: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

tweaksRouter.post('/', async (req, res) => {
  try {
    const incoming = req.body;
    let existingConfig: any = { tweaks: {}, elementOverrides: {} };

    // Fetch existing settings to merge rather than overwrite non-matching elements
    const row = await getOne<{ config_json: string }>('SELECT config_json FROM system_config WHERE id = ?', ['design_tweaks']);
    if (row && typeof row.config_json === 'string') {
      try {
        existingConfig = JSON.parse(row.config_json);
      } catch (_) {}
    }

    if (!existingConfig.elementOverrides) existingConfig.elementOverrides = {};
    if (!existingConfig.tweaks) existingConfig.tweaks = {};

    let updatedTweaks = { ...existingConfig.tweaks };
    let updatedOverrides = { ...existingConfig.elementOverrides };

    if (incoming.tweaks && typeof incoming.tweaks === 'object') {
      updatedTweaks = { ...updatedTweaks, ...incoming.tweaks };
    }

    if (incoming.elementOverrides && typeof incoming.elementOverrides === 'object') {
      // Merge selector overrides key by key (updating existing selector or adding new ones)
      Object.entries(incoming.elementOverrides).forEach(([selector, override]) => {
        updatedOverrides[selector] = {
          ...(updatedOverrides[selector] || {}),
          ...(override as object)
        };
      });
    }

    // Support direct batch array or map if passed as incoming.batchOverrides
    if (incoming.batchOverrides && typeof incoming.batchOverrides === 'object') {
      Object.entries(incoming.batchOverrides).forEach(([selector, override]) => {
        updatedOverrides[selector] = {
          ...(updatedOverrides[selector] || {}),
          ...(override as object)
        };
      });
    }

    const finalData = {
      tweaks: updatedTweaks,
      elementOverrides: updatedOverrides,
      updatedAt: new Date().toISOString()
    };

    const configJson = JSON.stringify(finalData);

    const existingRecord = await getOne('SELECT id FROM system_config WHERE id = ?', ['design_tweaks']);
    if (existingRecord) {
      await runSql('UPDATE system_config SET config_json = ?, updated_at = datetime("now") WHERE id = ?', [configJson, 'design_tweaks']);
    } else {
      await runSql('INSERT INTO system_config (id, config_json) VALUES (?, ?)', ['design_tweaks', configJson]);
    }

    res.json({
      success: true,
      message: 'Твики и стили элементов успешно сохранены на сервере',
      data: finalData
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

