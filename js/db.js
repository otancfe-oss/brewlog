"use strict";

/* ── Data Access Layer ── */
const db = (() => {
  const KEYS = {
    records: "brewlog_records",
    beans: "brewlog_beans_v3",
    equip: "brewlog_equip",
    fontSize: "brewlog_fontsize",
    grinders: "brewlog_custom_grinders",
    version: "brewlog_data_version"
  };
  const CURRENT_VERSION = 1;

  /* 低レベル読み書き */
  function _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      alert("データの保存に失敗しました。ストレージの空き容量を確認してください。");
      console.error("[BrewLog] Save failed:", key, e);
      return false;
    }
  }

  /* マイグレーション */
  function migrate() {
    const v = _get(KEYS.version, 0);
    if (v >= CURRENT_VERSION) return;
    /* v0 → v1: 初期バージョン設定のみ。将来ここに変換処理を追加 */
    _set(KEYS.version, CURRENT_VERSION);
    console.log("[BrewLog] Data migrated to v" + CURRENT_VERSION);
  }

  /* Public API */
  return {
    init() { migrate(); },

    /* Records */
    getRecords()        { return _get(KEYS.records, []); },
    saveRecords(recs)   { return _set(KEYS.records, recs); },
    addRecord(rec)      {
      const recs = this.getRecords();
      recs.unshift(rec);
      return this.saveRecords(recs);
    },
    deleteRecord(id)    {
      const recs = this.getRecords().filter(r => r.id !== id);
      return this.saveRecords(recs);
    },
    updateRecord(rec)   {
      const recs = this.getRecords();
      const idx = recs.findIndex(r => r.id === rec.id);
      if (idx >= 0) { recs[idx] = rec; return this.saveRecords(recs); }
      return false;
    },

    /* Beans */
    getBeans()          { return _get(KEYS.beans, []); },
    saveBeans(beans)    { return _set(KEYS.beans, beans); },
    addBean(bean)       {
      const beans = this.getBeans();
      beans.push(bean);
      return this.saveBeans(beans);
    },
    deleteBean(id)      {
      const beans = this.getBeans().filter(b => b.id !== id);
      return this.saveBeans(beans);
    },
    updateBean(bean)    {
      const beans = this.getBeans();
      const idx = beans.findIndex(b => b.id === bean.id);
      if (idx >= 0) { beans[idx] = bean; return this.saveBeans(beans); }
      return false;
    },

    /* Equipment */
    getEquip()          { return _get(KEYS.equip, { grinderId: "fellow_opus", dripper: "Hario V60" }); },
    saveEquip(equip)    { return _set(KEYS.equip, equip); },

    /* Font size */
    getFontSize()       { return _get(KEYS.fontSize, "M"); },
    saveFontSize(size)  { return _set(KEYS.fontSize, size); },

    /* Custom grinders */
    getCustomGrinders()    { return _get(KEYS.grinders, []); },
    saveCustomGrinders(g)  { return _set(KEYS.grinders, g); },
    addCustomGrinder(g)    {
      const list = this.getCustomGrinders();
      list.push(g);
      return this.saveCustomGrinders(list);
    },
    deleteCustomGrinder(id) {
      const list = this.getCustomGrinders().filter(x => x.id !== id);
      return this.saveCustomGrinders(list);
    },

    /* 全データ export/import */
    exportAll() {
      return {
        records: this.getRecords(),
        beans: this.getBeans(),
        equip: this.getEquip(),
        customGrinders: this.getCustomGrinders(),
        fontSize: this.getFontSize(),
        version: CURRENT_VERSION,
        exportedAt: new Date().toISOString()
      };
    },
    importAll(data) {
      if (!data.records || !data.beans) return false;
      this.saveRecords(data.records);
      this.saveBeans(data.beans);
      if (data.equip) this.saveEquip(data.equip);
      if (data.customGrinders) this.saveCustomGrinders(data.customGrinders);
      if (data.fontSize) this.saveFontSize(data.fontSize);
      return true;
    }
  };
})();
db.init();
