const STRINGS = {
  en: {
    slogan: "The Exercises are many, but we will win!",
    tab_library: "Library",
    tab_generate: "Today",
    tab_overview: "Overview",
    theme_dark: "Dark",
    theme_light: "Light",
    theme_to_dark: "Switch to dark mode",
    theme_to_light: "Switch to light mode",
    lang_toggle: "עברית",
    lang_toggle_title: "Switch to Hebrew",
    library_title: "Exercise library",
    library_loading: "Loading…",
    search: "Search",
    search_ph: "Name or cue",
    pattern: "Pattern",
    all_patterns: "All patterns",
    skill: "Skill",
    all_skills: "All skills",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    equipment: "Equipment",
    any: "Any",
    generate_title: "Today’s session",
    generate_lede:
      "Follow a multi-day plan, or build a one-off session from your equipment and constraints.",
    plan_title: "Training plan",
    plan_desc_empty: "Pick a plan to unlock Today’s session.",
    plan: "Plan",
    plan_none: "No plan — one-off",
    build_today: "Build today’s session",
    clear_plan: "Clear plan",
    sample_profile: "Sample profile",
    custom: "Custom",
    template: "Template",
    goal: "Goal",
    general_health: "General health",
    muscle: "Muscle",
    strength: "Strength",
    fat_loss: "Fat loss",
    athleticism: "Athleticism",
    pain_management_support: "Pain-aware support",
    level: "Level",
    minutes: "Minutes",
    constraints: "Constraints",
    include_power: "Include power",
    include_conditioning: "Include conditioning",
    build_workout: "Build workout",
    workout_empty: "Build a session to preview it here.",
    overview_title: "What’s in the box",
    overview_lede:
      "Knowledge base → exercise library → session generator. This UI is a preview of those pieces.",
    history_title: "Recent sessions",
    history_lede: "Finished workouts on this device — used for load suggestions and plan variety.",
    history_empty: "No finished sessions yet.",
    backup_title: "Backup",
    backup_lede:
      "Progress lives in this browser only. Export a file to keep it safe, or restore on another device.",
    export_backup: "Export backup",
    import_backup: "Import backup",
    patterns_title: "Patterns",
    patterns_body:
      "Push, pull, hinge, squat, lunge, carry, rotate, locomotion, corrective — tagged for substitution and coverage checks.",
    hierarchy_title: "Hierarchy",
    hierarchy_body:
      "Prep and correctives before heavy load; power before strength when both appear; constraints soft-gate risky variations.",
    sources_title: "Sources",
    sources_body:
      "Principles distilled from Athlean-X, FMS/Cook, Boyle, Dan John, McGill, EXOS, and related systems — see knowledge/.",
    swap: "Swap",
    swap_with: "Swap with",
    swap_none: "No matching swaps for your equipment/constraints.",
    session_progress: "Session progress",
    session_progress_lede:
      "Saved on this device only — reopen the app to continue where you left off.",
    how_session: "How was the session?",
    feel_good: "Good",
    feel_mid: "Mid",
    feel_bad: "Bad",
    save_progress: "Save progress",
    finish_session: "Finish session",
    finish_need_feel: "Pick good / mid / bad before finishing.",
    session_saved: "Session saved",
    next_feel_tip: "Next session will suggest load changes from this feel.",
    demo: "Demo",
    cue: "Cue",
    coverage_ok: "coverage ok",
    coverage_gaps: "coverage gaps",
    restored_session: "Restored your last open session",
    generating: "Generating…",
  },
  he: {
    slogan: "התרגילים רבים, אבל אנחנו ננצח!",
    tab_library: "ספרייה",
    tab_generate: "היום",
    tab_overview: "סקירה",
    theme_dark: "כהה",
    theme_light: "בהיר",
    theme_to_dark: "מצב כהה",
    theme_to_light: "מצב בהיר",
    lang_toggle: "EN",
    lang_toggle_title: "Switch to English",
    library_title: "ספריית תרגילים",
    library_loading: "טוען…",
    search: "חיפוש",
    search_ph: "שם או רמז",
    pattern: "דפוס",
    all_patterns: "כל הדפוסים",
    skill: "רמה",
    all_skills: "כל הרמות",
    beginner: "מתחיל",
    intermediate: "בינוני",
    advanced: "מתקדם",
    equipment: "ציוד",
    any: "הכל",
    generate_title: "אימון היום",
    generate_lede: "עקבו אחרי תוכנית רב־יומית, או בנו אימון חד־פעמי לפי ציוד ומגבלות.",
    plan_title: "תוכנית אימונים",
    plan_desc_empty: "בחרו תוכנית כדי לפתוח את אימון היום.",
    plan: "תוכנית",
    plan_none: "בלי תוכנית — חד־פעמי",
    build_today: "בנו את אימון היום",
    clear_plan: "נקו תוכנית",
    sample_profile: "פרופיל לדוגמה",
    custom: "מותאם",
    template: "תבנית",
    goal: "מטרה",
    general_health: "בריאות כללית",
    muscle: "שריר",
    strength: "כוח",
    fat_loss: "ירידה בשומן",
    athleticism: "אתלטיות",
    pain_management_support: "תמיכה רגישה לכאב",
    level: "רמה",
    minutes: "דקות",
    constraints: "מגבלות",
    include_power: "כללו כוח מתפרץ",
    include_conditioning: "כללו מטבולי",
    build_workout: "בנו אימון",
    workout_empty: "בנו אימון כדי לראות אותו כאן.",
    overview_title: "מה יש בקופסה",
    overview_lede: "בסיס ידע → ספריית תרגילים → מחולל אימונים. זו תצוגה מקדימה.",
    history_title: "אימונים אחרונים",
    history_lede: "אימונים שהושלמו במכשיר הזה — לשימוש בהצעות עומס וגיוון.",
    history_empty: "עדיין אין אימונים שהושלמו.",
    backup_title: "גיבוי",
    backup_lede: "ההתקדמות נשמרת בדפדפן הזה בלבד. ייצאו קובץ לשמירה או שחזרו במכשיר אחר.",
    export_backup: "ייצוא גיבוי",
    import_backup: "ייבוא גיבוי",
    patterns_title: "דפוסים",
    patterns_body:
      "דחיפה, משיכה, ציר, סקוואט, לאנג', נשיאה, סיבוב, תנועה, מתקן — לתיוג, החלפה ובדיקת כיסוי.",
    hierarchy_title: "היררכיה",
    hierarchy_body:
      "הכנה ותיקונים לפני עומס כבד; כוח מתפרץ לפני כוח כששניהם מופיעים; מגבלות מרככות וריאציות מסוכנות.",
    sources_title: "מקורות",
    sources_body:
      "עקרונות מ־Athlean-X, FMS/Cook, Boyle, Dan John, McGill, EXOS ועוד — ראו knowledge/.",
    swap: "החלף",
    swap_with: "החלף ל־",
    swap_none: "אין החלפות מתאימות לציוד/מגבלות.",
    session_progress: "התקדמות האימון",
    session_progress_lede: "נשמר במכשיר הזה בלבד — פתחו שוב כדי להמשיך מאיפה שהפסקתם.",
    how_session: "איך היה האימון?",
    feel_good: "טוב",
    feel_mid: "בינוני",
    feel_bad: "רע",
    save_progress: "שמרו התקדמות",
    finish_session: "סיימו אימון",
    finish_need_feel: "בחרו טוב / בינוני / רע לפני סיום.",
    session_saved: "האימון נשמר",
    next_feel_tip: "באימון הבא יוצעו שינויי עומס לפי התחושה.",
    demo: "הדגמה",
    cue: "רמז",
    coverage_ok: "כיסוי תקין",
    coverage_gaps: "חסר כיסוי",
    restored_session: "שוחזר האימון הפתוח האחרון",
    generating: "מייצר…",
  },
};

const LANG_KEY = "gym-trainer-lang";

export function getLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "he" || saved === "en") return saved;
  } catch {}
  return "en";
}

export function setLang(lang) {
  const next = lang === "he" ? "he" : "en";
  localStorage.setItem(LANG_KEY, next);
  return next;
}

export function t(key, lang = getLang()) {
  const table = STRINGS[lang] || STRINGS.en;
  return table[key] ?? STRINGS.en[key] ?? key;
}

export function applyI18n(lang = getLang()) {
  document.documentElement.lang = lang === "he" ? "he" : "en";
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key, lang);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    el.setAttribute("placeholder", t(key, lang));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (!key) return;
    el.setAttribute("title", t(key, lang));
  });

  const brand = document.querySelector(".brand-mark");
  if (brand) brand.textContent = t("slogan", lang);
}
