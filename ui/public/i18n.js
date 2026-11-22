const STRINGS = {
  en: {
    navigate: "Navigate", today: "Today", library: "Library", swim: "Swim", settings: "Settings",
    ready_title: "Ready when you are.", ready_lede: "Your next session is prepared around your plan.",
    start_workout: "Start workout", resume_workout: "Resume workout", session_preview: "Session preview",
    whats_ahead: "What’s ahead", in_progress: "In progress", exercise_queue: "Exercise queue",
    tap_to_jump: "Tap to jump", explore: "Explore", movement_library: "Movement library",
    library_lede: "Discover movements by the way your body trains.", search: "Search",
    search_exercises: "Search exercises", swim_title: "Build your swim.",
    swim_lede: "Compose a focused technique session from the drill progression.",
    swim_progress: "Swim progress", recent_swims: "Recent swims", preferences: "Preferences",
    settings_lede: "Keep your training profile current.", goal: "Goal", experience: "Experience",
    days_week: "Days per week", equipment: "Equipment", limitations: "Limitations",
    language: "Language", save_changes: "Save changes", recommendation: "Recommendation",
    step_of: "Step {step} of {total}", continue: "Continue", back: "Back", see_plan: "See my plan",
    your_plan: "Your plan", plan_ready: "A simple plan, made for you.",
    plan_ready_copy: "We’ll keep the decisions out of your workout and move you forward one session at a time.",
    recommended: "Recommended", use_this_plan: "Use this plan",
    onboarding_goal_eyebrow: "Start with your intention", onboarding_goal_title: "What are you training for?",
    onboarding_goal_copy: "Choose the outcome that matters most right now. You can change it later.",
    onboarding_level_eyebrow: "Your experience", onboarding_level_title: "Where are you starting from?",
    onboarding_level_copy: "This helps us choose movements that feel challenging, not overwhelming.",
    onboarding_days_eyebrow: "Your rhythm", onboarding_days_title: "How often do you want to train?",
    onboarding_days_copy: "Choose a pace you can repeat consistently.",
    onboarding_equipment_eyebrow: "Your setup", onboarding_equipment_title: "What can you train with?",
    onboarding_equipment_copy: "Select everything you usually have available.",
    onboarding_limits_eyebrow: "Train with care", onboarding_limits_title: "Anything we should work around?",
    onboarding_limits_copy: "We’ll avoid movements that commonly aggravate these areas.",
    general_health: "General fitness", strength: "Build strength", muscle: "Build muscle",
    fat_loss: "Move & condition", athleticism: "Athletic performance",
    beginner: "New to training", intermediate: "Comfortable training", advanced: "Highly experienced",
    days_count: "{n} days / week", none: "No limitations",
    bodyweight: "Bodyweight", dbs: "Dumbbells", barbell: "Barbell", bench: "Bench",
    pullup_bar: "Pull-up bar", cables: "Cables", kettlebell: "Kettlebell", machines: "Machines", bands: "Bands",
    knee_sensitive: "Knee sensitivity", shoulder_irritable: "Shoulder sensitivity",
    overhead_limited: "Limited overhead range", axial_spine_sensitive: "Back sensitivity", wrist_sensitive: "Wrist sensitivity",
    desc_bodyweight: "No equipment needed", desc_dbs: "A pair or adjustable", desc_barbell: "Bar and plates",
    desc_bench: "Flat or adjustable", desc_pullup_bar: "Fixed bar", desc_cables: "Cable station",
    desc_kettlebell: "One or more", desc_machines: "Gym machines", desc_bands: "Resistance bands",
    about_minutes: "About {n} min", exercise_count: "{n} exercises", cycle_day: "Cycle {cycle} · Day {day}",
    workout: "Workout", swap: "Swap", watch_form: "Watch form", set: "Set", weight: "Weight", reps: "Reps",
    finish_exercise: "Finish exercise", mark_incomplete: "Mark incomplete", choose_replacement: "Choose a replacement",
    no_swaps: "No suitable replacements found.", session_complete: "Session complete", well_done: "Nicely done.",
    summary_copy: "You showed up and moved the plan forward.", minutes: "Minutes", exercises: "Exercises",
    sets: "Sets", back_to_today: "Back to today", all_movements: "All movements", no_exercises: "No exercises found.",
    history: "History", history_eyebrow: "Log", history_lede: "Every set from a finished workout, in one table.",
    workout_name: "Workout", plan_name: "Plan", drill_number: "#", drill_name: "Drill",
    no_history: "Finish a workout and the sets will show up here.", sessions_logged: "{n} workouts", sessions_logged_one: "1 workout",
    this_drill: "This drill", alternative: "Alternative", swipe_alternatives: "Swipe for other drills",
    previous_drill: "Previous drill", next_drill: "Next drill",
    daily_flow: "Daily flow", open_block: "Open", watch_flow: "Watch the flow",
    daily_flow_cue: "Nine moves, one minute each.",
    daily_flow_moves: "Lymphatic hops|Body wave|Arm swings|Trunk twists|Dead arms|Golf swings|March slap|Windmill / push side|Plié squats",
    push_horizontal: "Horizontal push", push_vertical: "Vertical push", pull_horizontal: "Horizontal pull",
    pull_vertical: "Vertical pull", squat: "Squat", hinge: "Hinge", lunge: "Lunge", carry: "Carry",
    rotate: "Rotation", locomotion: "Movement", corrective: "Mobility",
    swim_build_title: "Build a technique session", swim_build_copy: "Begin with a preset or choose drills that fit today.",
    swim_preset: "Session preset", custom_session: "Custom session", session_name: "Session name",
    pool_length: "Pool length", lengths: "Lengths", selected_drills: "Selected drills",
    choose_drills: "Choose a preset or add drills from the catalog.", start_swim: "Start swim",
    drill_catalog: "Drill catalog", all_phases: "All", add: "Add", added: "Added",
    active_swim: "Active swim", planned_distance: "{n} m planned", back_to_builder: "Back to builder",
    drills_complete: "{done}/{total} drills complete", average_spl: "Average SPL", rpe: "RPE (1–10)",
    technique_note: "Technique note", finish_swim: "Finish swim", swims: "Swims",
    planned_total: "Planned distance", drills: "Drills", average_logged_spl: "Average SPL",
    no_swims: "No completed swims yet.", choose_swim_feel: "Choose how the swim felt before finishing.",
    move_up: "Move up", move_down: "Move down", remove: "Remove", default_swim_name: "Technique practice",
    demonstrating: "Tziki demonstrating {name}", ti_swim: "TI swim",
    Balance: "Balance", Streamline: "Streamline", Propulsion: "Propulsion", Recovery: "Recovery",
    Breathing: "Breathing", Integration: "Integration", good: "Good", mid: "Okay", bad: "Hard",
    kb_title: "One bell. About twenty minutes.",
    kb_lede: "The session is already built. Same weight the whole way. Press start and follow the bell.",
    kb_chipper: "Chipper", kb_cycles: "Cycles",
    kb_chipper_copy: "Each drill once, in order.",
    kb_cycles_copy: "The same drills, round after round.",
    kb_work: "Work", kb_rest: "Rest", kb_total: "Total",
    kb_one_bell: "One kettlebell. Don't change it.",
    kb_drills: "{n} drills", kb_rounds: "{n} rounds",
    kb_round_of: "Round {n} of {total}", kb_station_of: "{n} of {total}",
    kb_start: "Start", kb_new: "New workout", kb_again: "Run it again",
    kb_bell: "Bell", kb_preview: "Preview",
    kb_boxing: "Boxing bell", kb_bowl: "Bowl", kb_buzzer: "Gym buzzer", kb_beep: "Beep",
    kb_ready: "Get ready", kb_switch: "Switch sides", kb_switch_note: "Switch halfway",
    kb_next: "Next", kb_stop: "Stop", kb_done: "Done",
    kb_done_copy: "The bell has the last word.",
    kb_history: "Recent sessions", kb_no_history: "No kettlebell sessions yet.",
    kb_pattern_hinge: "Hinge", kb_pattern_squat: "Squat", kb_pattern_push: "Push",
    kb_pattern_pull: "Pull", kb_pattern_carry: "Carry", kb_pattern_core: "Core", kb_pattern_full: "Full body",
  },
  he: {
    navigate: "ניווט", today: "היום", library: "ספרייה", swim: "שחייה", settings: "הגדרות",
    ready_title: "מוכנים כשאתם מוכנים.", ready_lede: "האימון הבא כבר מוכן לפי התוכנית שלכם.",
    start_workout: "התחלת אימון", resume_workout: "המשך אימון", session_preview: "תצוגה מקדימה",
    whats_ahead: "מה מחכה היום", in_progress: "האימון בעיצומו", exercise_queue: "תור התרגילים",
    tap_to_jump: "לחצו כדי לעבור", explore: "לגלות", movement_library: "ספריית התנועות",
    library_lede: "גלו תרגילים לפי הדרך שבה הגוף מתאמן.", search: "חיפוש",
    search_exercises: "חיפוש תרגילים", swim_title: "בנו את אימון השחייה.",
    swim_lede: "הרכיבו אימון טכניקה ממוקד מתוך רצף התרגילים.",
    swim_progress: "התקדמות בשחייה", recent_swims: "אימונים אחרונים", preferences: "העדפות",
    settings_lede: "שמרו על פרופיל אימון עדכני.", goal: "מטרה", experience: "ניסיון",
    days_week: "ימים בשבוע", equipment: "ציוד", limitations: "מגבלות",
    language: "שפה", save_changes: "שמירת שינויים", recommendation: "המלצה",
    step_of: "שלב {step} מתוך {total}", continue: "המשך", back: "חזרה", see_plan: "הצגת התוכנית",
    your_plan: "התוכנית שלכם", plan_ready: "תוכנית פשוטה, שנבנתה עבורכם.",
    plan_ready_copy: "אנחנו נוציא את ההחלטות מהאימון ונקדם אתכם אימון אחד בכל פעם.",
    recommended: "מומלץ", use_this_plan: "בחירת התוכנית",
    onboarding_goal_eyebrow: "מתחילים בכוונה", onboarding_goal_title: "בשביל מה אתם מתאמנים?",
    onboarding_goal_copy: "בחרו את התוצאה שהכי חשובה עכשיו. תמיד אפשר לשנות בהמשך.",
    onboarding_level_eyebrow: "הניסיון שלכם", onboarding_level_title: "מאיפה מתחילים?",
    onboarding_level_copy: "כך נבחר תרגילים מאתגרים, בלי להציף.",
    onboarding_days_eyebrow: "הקצב שלכם", onboarding_days_title: "כמה פעמים תרצו להתאמן?",
    onboarding_days_copy: "בחרו קצב שתוכלו לשמור עליו לאורך זמן.",
    onboarding_equipment_eyebrow: "הציוד שלכם", onboarding_equipment_title: "עם מה אפשר להתאמן?",
    onboarding_equipment_copy: "בחרו את כל הציוד שבדרך כלל זמין.",
    onboarding_limits_eyebrow: "מתאמנים בזהירות", onboarding_limits_title: "יש משהו שכדאי לעקוף?",
    onboarding_limits_copy: "נמנע מתרגילים שבדרך כלל מגרים את האזורים האלה.",
    general_health: "כושר כללי", strength: "בניית כוח", muscle: "בניית שריר",
    fat_loss: "תנועה וסיבולת", athleticism: "ביצועים ספורטיביים",
    beginner: "חדשים באימונים", intermediate: "מתאמנים בביטחון", advanced: "מנוסים מאוד",
    days_count: "{n} ימים בשבוע", none: "ללא מגבלות",
    bodyweight: "משקל גוף", dbs: "משקולות יד", barbell: "מוט", bench: "ספסל",
    pullup_bar: "מתח", cables: "כבלים", kettlebell: "קטלבל", machines: "מכונות", bands: "גומיות",
    knee_sensitive: "רגישות בברך", shoulder_irritable: "רגישות בכתף",
    overhead_limited: "טווח מוגבל מעל הראש", axial_spine_sensitive: "רגישות בגב", wrist_sensitive: "רגישות בשורש כף היד",
    desc_bodyweight: "ללא ציוד", desc_dbs: "זוג או מתכווננות", desc_barbell: "מוט וצלחות",
    desc_bench: "שטוח או מתכוונן", desc_pullup_bar: "מוט קבוע", desc_cables: "תחנת כבלים",
    desc_kettlebell: "אחד או יותר", desc_machines: "מכשירי חדר כושר", desc_bands: "גומיות התנגדות",
    about_minutes: "כ־{n} דקות", exercise_count: "{n} תרגילים", cycle_day: "מחזור {cycle} · יום {day}",
    workout: "אימון", swap: "החלפה", watch_form: "צפייה בביצוע", set: "סט", weight: "משקל", reps: "חזרות",
    finish_exercise: "סיום תרגיל", mark_incomplete: "סימון כלא הושלם", choose_replacement: "בחרו תרגיל חלופי",
    no_swaps: "לא נמצאו חלופות מתאימות.", session_complete: "האימון הושלם", well_done: "עבודה יפה.",
    summary_copy: "הגעתם וקידמתם את התוכנית.", minutes: "דקות", exercises: "תרגילים",
    sets: "סטים", back_to_today: "חזרה להיום", all_movements: "כל התנועות", no_exercises: "לא נמצאו תרגילים.",
    history: "היסטוריה", history_eyebrow: "יומן", history_lede: "כל סט מאימון שהסתיים, בטבלה אחת.",
    workout_name: "אימון", plan_name: "תוכנית", drill_number: "#", drill_name: "תרגיל",
    no_history: "סיימו אימון והסטים יופיעו כאן.", sessions_logged: "{n} אימונים", sessions_logged_one: "אימון אחד",
    this_drill: "התרגיל הזה", alternative: "חלופה", swipe_alternatives: "החליקו לחלופות",
    previous_drill: "התרגיל הקודם", next_drill: "התרגיל הבא",
    daily_flow: "זרימה יומית", open_block: "פתיחה", watch_flow: "צפייה בזרימה",
    daily_flow_cue: "תשע תנועות, דקה לכל תנועה.",
    daily_flow_moves: "קפיצות לימפתיות|גל גוף|הנפות ידיים|סיבובי גו|ידיים רפויות|הנפות גולף|מארש עם מחיאה|טחנת רוח / דחיפה לצד|סקוואט פלייה",
    push_horizontal: "דחיפה אופקית", push_vertical: "דחיפה אנכית", pull_horizontal: "משיכה אופקית",
    pull_vertical: "משיכה אנכית", squat: "סקוואט", hinge: "ציר ירך", lunge: "מכרע", carry: "נשיאה",
    rotate: "סיבוב", locomotion: "תנועה", corrective: "ניידות",
    swim_build_title: "בניית אימון טכניקה", swim_build_copy: "התחילו מתבנית או בחרו תרגילים שמתאימים להיום.",
    swim_preset: "תבנית אימון", custom_session: "אימון מותאם", session_name: "שם האימון",
    pool_length: "אורך הבריכה", lengths: "בריכות", selected_drills: "תרגילים שנבחרו",
    choose_drills: "בחרו תבנית או הוסיפו תרגילים מהקטלוג.", start_swim: "התחלת שחייה",
    drill_catalog: "קטלוג תרגילים", all_phases: "הכל", add: "הוספה", added: "נוסף",
    active_swim: "שחייה פעילה", planned_distance: "{n} מ׳ מתוכננים", back_to_builder: "חזרה לבנייה",
    drills_complete: "{done}/{total} תרגילים הושלמו", average_spl: "ממוצע תנועות לבריכה", rpe: "מאמץ (1–10)",
    technique_note: "הערת טכניקה", finish_swim: "סיום שחייה", swims: "אימוני שחייה",
    planned_total: "מרחק מתוכנן", drills: "תרגילים", average_logged_spl: "ממוצע תנועות",
    no_swims: "עדיין אין אימוני שחייה שהושלמו.", choose_swim_feel: "בחרו איך הרגישה השחייה לפני הסיום.",
    move_up: "הזזה למעלה", move_down: "הזזה למטה", remove: "הסרה", default_swim_name: "אימון טכניקה",
    demonstrating: "ציקי מדגים {name}", ti_swim: "שחיית TI",
    Balance: "איזון", Streamline: "קו גוף", Propulsion: "הנעה", Recovery: "התאוששות",
    Breathing: "נשימה", Integration: "שילוב", good: "טוב", mid: "בסדר", bad: "קשה",
    kb_title: "פעמון אחד. בערך עשרים דקות.",
    kb_lede: "האימון כבר בנוי. אותו משקל לכל הדרך. לוחצים התחלה ועוקבים אחרי הפעמון.",
    kb_chipper: "צ'יפר", kb_cycles: "מחזורים",
    kb_chipper_copy: "כל תרגיל פעם אחת, לפי הסדר.",
    kb_cycles_copy: "אותם תרגילים, סבב אחרי סבב.",
    kb_work: "עבודה", kb_rest: "מנוחה", kb_total: "סה״כ",
    kb_one_bell: "קטלבל אחד. לא מחליפים משקל.",
    kb_drills: "{n} תרגילים", kb_rounds: "{n} סבבים",
    kb_round_of: "סבב {n} מתוך {total}", kb_station_of: "{n} מתוך {total}",
    kb_start: "התחלה", kb_new: "אימון חדש", kb_again: "עוד פעם אותו אימון",
    kb_bell: "צליל הפעמון", kb_preview: "השמעה",
    kb_boxing: "פעמון אגרוף", kb_bowl: "קערה", kb_buzzer: "זמזם", kb_beep: "ביפ",
    kb_ready: "מתכוננים", kb_switch: "מחליפים צד", kb_switch_note: "החלפת צד באמצע",
    kb_next: "הבא", kb_stop: "עצירה", kb_done: "סיום",
    kb_done_copy: "הפעמון אמר את המילה האחרונה.",
    kb_history: "אימונים אחרונים", kb_no_history: "עדיין אין אימוני קטלבל.",
    kb_pattern_hinge: "ציר ירך", kb_pattern_squat: "סקוואט", kb_pattern_push: "דחיפה",
    kb_pattern_pull: "משיכה", kb_pattern_carry: "נשיאה", kb_pattern_core: "ליבה", kb_pattern_full: "כל הגוף",
  },
};

let currentLang = "en";

export function getLang() {
  try {
    const saved = localStorage.getItem("gym-trainer-lang");
    if (saved === "he" || saved === "en") return saved;
  } catch {
    // Storage may be unavailable.
  }
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang === "he" ? "he" : "en";
  try {
    localStorage.setItem("gym-trainer-lang", currentLang);
  } catch {
    // Storage may be unavailable.
  }
  return currentLang;
}

export function t(key) {
  const lang = getLang();
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}

export function applyI18n(lang = getLang()) {
  currentLang = lang === "he" ? "he" : "en";
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "he" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
}
