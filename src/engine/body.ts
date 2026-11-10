import type { BreathPattern } from '../db'

/** Body & sexuality journeys: personal (solo), adults only. Level 2 involves self-touch and works directly with arousal. */
export interface BodyJourney {
  id: string
  level: 1 | 2 | 3
  title: string
  sub: string
  defaultMin: number
  minMin: number
  maxMin: number
  /** breath pattern for the release + return phases */
  breath: BreathPattern
  question: string
  /** level 3 (couples): ordered steps – clip, on-screen label, phase, and relative share of the free (music) time after it */
  steps?: CoupleStep[]
  /** built-in music loop per phase (public/music/<id>.mp3) */
  music: Record<1 | 2 | 3 | 4 | 5, string>
}
export interface CoupleStep { clip: string; label: string; phase: 1 | 2 | 3 | 4 | 5; w: number; breath?: BreathPattern }

export const BODY_JOURNEYS: BodyJourney[] = [
  { id: 'home', music: { 1: 'body-1a', 2: 'body-1a', 3: 'body-1b', 4: 'body-1b', 5: 'body-1b' }, level: 1, title: 'בית בגוף', sub: 'סריקת גוף. הגוף כבית, לא כמראה. מקום לעונג קטן.', defaultMin: 20, minMin: 15, maxMin: 40, breath: 'coherent', question: 'איפה בגוף הרגשתי הכי בבית?' },
  { id: 'desire', music: { 1: 'body-1a', 2: 'body-1a', 3: 'body-1b', 4: 'body-1b', 5: 'body-1b' }, level: 1, title: 'תשוקה ונוכחות', sub: 'נשימה לאגן. תשוקה כאנרגיה חיה, בלי מטרה.', defaultMin: 25, minMin: 15, maxMin: 40, breath: 'wave', question: 'מה הגוף שלי אוהב, שלא נתתי לו מקום?' },
  { id: 'shame', music: { 1: 'body-1a', 2: 'body-1a', 3: 'body-1b', 4: 'body-1b', 5: 'body-1b' }, level: 1, title: 'לשחרר בושה', sub: 'המסרים שקיבלנו על הגוף, והחזרה שלו אליך.', defaultMin: 25, minMin: 20, maxMin: 40, breath: 'coherent', question: 'מה הגוף שלי צריך לשמוע ממני?' },
  { id: 'touch', music: { 1: 'body-2a', 2: 'body-2a', 3: 'body-2b', 4: 'body-2b', 5: 'body-2b' }, level: 2, title: 'מגע מודע', sub: 'מגע עצמי איטי: ידיים, מפת הגוף, ובסוף מגע אינטימי – רק אם נכון.', defaultMin: 25, minMin: 20, maxMin: 45, breath: 'wave', question: 'איזה מגע הגוף שלי ביקש, שלא ידעתי?' },
  { id: 'fire', music: { 1: 'body-2a', 2: 'fire', 3: 'fire', 4: 'body-2b', 5: 'body-2b' }, level: 2, title: 'נשימת אש', sub: 'רצפת האגן, גל חום בעמוד השדרה, עוררות כאנרגיה שמתפשטת.', defaultMin: 20, minMin: 15, maxMin: 35, breath: 'wave', question: 'איפה הרגשתי את האנרגיה, ולאן היא רצתה לזרום?' },
  { id: 'pleasure', music: { 1: 'body-2a', 2: 'body-2a', 3: 'body-2b', 4: 'body-2b', 5: 'body-2b' }, level: 2, title: 'עונג בלי יעד', sub: 'עונג עצמי מודע: האטה, גלים של עלייה ומנוחה, בלי שיא כמטרה.', defaultMin: 30, minMin: 20, maxMin: 50, breath: 'wave', question: 'מה השתנה כשהאטתי?' },
  { id: 'breathe2', music: { 1: 'couple-a', 2: 'couple-a', 3: 'couple-b', 4: 'couple-b', 5: 'couple-b' }, level: 3, title: 'נשימה משותפת', sub: 'מבט בעיניים, נשימה מסונכרנת, יד על הלב, מילים טובות.', defaultMin: 25, minMin: 20, maxMin: 40, breath: 'wave', question: 'מה הרגשנו כשהנשימות נפגשו?', steps: [
    { clip: 'c-b-open', label: 'שניכם · מול זה מול זו', phase: 1, w: 1 },
    { clip: 'c-b-gaze', label: 'שניכם · מבט בעיניים', phase: 1, w: 5 },
    { clip: 'c-b-sync', label: 'שניכם · נשימה משותפת', phase: 2, w: 6, breath: 'wave' },
    { clip: 'c-b-him-heart', label: 'הוא · יד על הלב שלה', phase: 2, w: 4, breath: 'wave' },
    { clip: 'c-b-her-heart', label: 'היא · יד על הלב שלו', phase: 3, w: 4, breath: 'wave' },
    { clip: 'c-b-peak', label: 'שניכם · שתיקה משותפת', phase: 3, w: 9 },
    { clip: 'c-b-him-words', label: 'הוא מדבר', phase: 4, w: 2 },
    { clip: 'c-b-her-words', label: 'היא מדברת', phase: 4, w: 2 },
    { clip: 'c-b-close', label: 'שניכם · חיבוק', phase: 5, w: 2 },
  ] },
  { id: 'listen', music: { 1: 'couple-a', 2: 'couple-a', 3: 'couple-a', 4: 'couple-b', 5: 'couple-b' }, level: 3, title: 'מגע שמקשיב', sub: 'מגע בתורות: היא מקבלת והוא נותן, ואז מחליפים. יותר · פחות · בדיוק.', defaultMin: 45, minMin: 30, maxMin: 70, breath: 'none', question: 'מה למדנו על המגע שכל אחד מאיתנו אוהב?', steps: [
    { clip: 'c-l-open', label: 'שניכם · פתיחה', phase: 1, w: 0.3 },
    { clip: 'c-l-stop', label: 'שניכם · מילת עצירה', phase: 1, w: 0.4 },
    { clip: 'c-l-feedback', label: 'יותר · פחות · בדיוק', phase: 1, w: 0.2 },
    { clip: 'c-l-her-receive', label: 'היא מקבלת · הוא נותן', phase: 2, w: 0.1 },
    { clip: 'c-l-him-give', label: 'היא מקבלת · הוא נותן', phase: 2, w: 5 },
    { clip: 'c-l-check', label: 'היא מקבלת · הוא נותן', phase: 2, w: 3 },
    { clip: 'c-l-swap', label: 'החלפה', phase: 2, w: 0.3 },
    { clip: 'c-l-him-receive', label: 'הוא מקבל · היא נותנת', phase: 3, w: 0.1 },
    { clip: 'c-l-her-give', label: 'הוא מקבל · היא נותנת', phase: 3, w: 5 },
    { clip: 'c-l-check', label: 'הוא מקבל · היא נותנת', phase: 3, w: 3 },
    { clip: 'c-l-round2', label: 'סבב שני · היא מקבלת', phase: 3, w: 5 },
    { clip: 'c-l-swap', label: 'סבב שני · הוא מקבל', phase: 4, w: 5 },
    { clip: 'c-l-share', label: 'שניכם · שיתוף', phase: 5, w: 3 },
    { clip: 'c-l-close', label: 'שניכם', phase: 5, w: 0.5 },
  ] },
  { id: 'desire2', music: { 1: 'groove', 2: 'groove', 3: 'couple-a', 4: 'couple-b', 5: 'couple-b' }, level: 3, title: 'ערב של תשוקה', sub: 'טקס פתיחה, ריקוד איטי, מגע בתורות ומגע משותף – ואז "מכאן זה שלכם".', defaultMin: 60, minMin: 40, maxMin: 90, breath: 'none', question: 'מה נרצה להביא איתנו לערב הבא?', steps: [
    { clip: 'c-d-open', label: 'שניכם · טקס פתיחה', phase: 1, w: 1 },
    { clip: 'c-d-dance', label: 'שניכם · ריקוד איטי', phase: 1, w: 2 },
    { clip: 'c-d-him-lead', label: 'הוא מוביל', phase: 2, w: 2 },
    { clip: 'c-d-her-lead', label: 'היא מובילה', phase: 2, w: 2 },
    { clip: 'c-d-her-touch', label: 'היא נוגעת · הוא מקבל', phase: 2, w: 4 },
    { clip: 'c-d-him-touch', label: 'הוא נוגע · היא מקבלת', phase: 3, w: 4 },
    { clip: 'c-d-check', label: 'שניכם · בדיקה', phase: 3, w: 0.5 },
    { clip: 'c-d-mutual', label: 'שניכם · מגע משותף', phase: 3, w: 4 },
    { clip: 'c-d-him-slow', label: 'הוא · להאט', phase: 4, w: 2 },
    { clip: 'c-d-her-wide', label: 'היא · להתרחב', phase: 4, w: 2 },
    { clip: 'c-d-yours', label: 'מכאן זה שלכם', phase: 5, w: 14 },
  ] },
]
export const bodyJourney = (id?: string) => BODY_JOURNEYS.find((j) => j.id === id)

/** level-2 gate: confirmed adult + private place (kept on this device) */
const ADULT_KEY = 'hamadrich:adult'
export const isAdultUnlocked = () => { try { return localStorage.getItem(ADULT_KEY) === '1' } catch { return false } }
export const unlockAdult = () => { try { localStorage.setItem(ADULT_KEY, '1') } catch { /* private mode */ } }

/** level-3 gate: both partners adult, consenting, private place */
const COUPLE_KEY = 'hamadrich:couple'
export const isCoupleUnlocked = () => { try { return localStorage.getItem(COUPLE_KEY) === '1' } catch { return false } }
export const unlockCouple = () => { try { localStorage.setItem(COUPLE_KEY, '1') } catch { /* private mode */ } }

export const MUSIC_TITLES: Record<string, string> = {
  'body-1a': 'אמביינט חם', 'body-1b': 'מרחב עמוק', 'body-2a': 'דאב חושני איטי', 'body-2b': 'קוסמי חושני',
  fire: 'דאב טקסי', 'couple-a': 'קוסמי-טנטרי', 'couple-b': 'לילה קוסמי', groove: 'דאב חושני',
  'journey-arrive': 'קוסמי רך', 'journey-release': 'דאב עדין', 'journey-peak': 'קוסמי עמוק', sleep: 'לילה שקט',
}

/** "what happens in this journey" – per body journey, from the scripts in docs/body-journeys-script.md */
export interface BodyLong { what: string; stages: string[]; forWhom: string; visuals: string; safety: string }
export const BODY_LONG: Record<string, BodyLong> = {
  home: {
    what: 'סריקת גוף עדינה בשכיבה. המדריכה עוברת מכפות הרגליים, דרך האגן והמקומות שבהם הגוף מחזיק, ומזמינה להרגיש את הגוף מבפנים – לא איך הוא נראה, אלא איך הוא מרגיש.',
    stages: ['הגעה – שכיבה, יד על הבטן, נשימה איטית אל הבטן', 'שחרור – כפות הרגליים, האגן, ואיפה הגוף מחזיק מתח', 'שיא – הגוף כבית, ומקום לעונג קטן: חום, אוויר על העור', 'חזרה – תנועה קטנה באצבעות', 'סגירה – יד על המקום שביקש תשומת לב, ו"אני כאן"'],
    forWhom: 'מתאים לכולם, גם בפעם הראשונה. טוב בערב, אחרי יום עמוס, או כשהגוף מרגיש רחוק.',
    visuals: 'האלה שוכבת במקדש של אור; אור זהוב עולה מכפות הרגליים, קשרים של אור נמסים לפטלים, והגוף הופך לבית של אור.',
    safety: 'אם עולה משהו קשה – מותר לפקוח עיניים ולחזור לנשימה. {אתה מוביל|את מובילה}.',
  },
  desire: {
    what: 'מסע של נשימה אל האגן ונוכחות עם תשוקה – כאנרגיה חיה בגוף ולא כמשהו שצריך לעשות איתו משהו. אין מטרה ואין יעד; רק להרגיש, ולתת לה מקום בדיוק בגודל שהיא.',
    stages: ['הגעה – תנוחה פתוחה ובטוחה', 'שחרור – לשים לב לחום, לדופק ולעקצוץ; מותר לה להיות', 'אור חם שעולה מבסיס הגוף אל הבטן והלב', 'שיא – "הגוף יודע", ופשוט להיות {חי|חיה}', 'חזרה – האור מתמקם בלב'],
    forWhom: 'למי שרוצה להתקרב לתשוקה בלי לחץ ובלי מבחן. בלי מגע – רק נשימה ותשומת לב.',
    visuals: 'גחלים מרחפות, נקודות חום שפועמות על העור, נחש של אור אדום-זהוב שעולה ופורח ללוטוס בלב, וריקוד חופשי באש של חיים.',
    safety: 'אם משהו לא נעים – אפשר לעצור בכל רגע, לפקוח עיניים, ולחזור לנשימה.',
  },
  shame: {
    what: 'מסע עדין על המסרים שקיבלנו על הגוף ועל המיניות – משפט, מבט, שתיקה – ועל החזרה של הגוף אלינו. לא חופרים ולא מנתחים; רק מאפשרים, ומניחים את מה שלא שלנו.',
    stages: ['הגעה – מקום בטוח, ורשות לעצור', 'שחרור – המסר: איפה הוא יושב בגוף', 'קטע ייעודי לגבר או לאישה – כי המסרים החברתיים שונים', 'להניח – יד על המקום, "אני רואה אותך, זה לא שלי"', 'שיא – "הגוף הזה שלך", ורכות כדרך הביתה', 'חזרה – נשימה רחבה מהקודקוד ועד כפות הרגליים'],
    forWhom: 'למי ש{מרגיש|מרגישה} מבוכה, ביקורת עצמית או ריחוק מהגוף. כדאי ברגע שקט, בלי למהר אחריו לשום מקום.',
    visuals: 'עשן אפור של מילים ישנות עוטף את האלה, קליפה של אפר נסדקת ונושרת כפטלים לבנים, ובסוף היא עומדת חופשייה בגשם של פרחים בזריחה.',
    safety: 'אם עולים דברים כבדים מהעבר – לעצור, להרגיש את הרגליים, ולשקול ליווי של אדם. זה לא חולשה; זה מגיע לך.',
  },
  touch: {
    what: 'מגע עצמי איטי ומודע: ידיים חמות על הפנים, מפת הגוף – צוואר, כתפיים, זרועות, חזה, בטן – הירכיים, ובסוף, רק אם זה מרגיש נכון, יד שנחה על איברי המין בלי לעשות כלום. להכיר, לא לבצע.',
    stages: ['הגעה – לאט, בלי יעד, {אתה מוביל|את מובילה}', 'ידיים – לחמם את כפות הידיים ולהניח על הפנים', 'מפת הגוף – לגעת כאילו פוגשים את הגוף בפעם הראשונה', 'הירכיים – איך העור מגיב, איך הנשימה משתנה', 'מגע אינטימי (רק אם נכון) – יד שנחה, חום, נשימה', 'שיא – הקשבה, והעונג הזה שלך', 'מנוחה – ידיים על הבטן, החום מתפזר'],
    forWhom: 'למבוגרים בלבד, במקום פרטי, עם אוזניות. מתאים למי שרוצה ללמוד מה הגוף אוהב – בקצב שלו.',
    visuals: 'ידיים שמתחממות באור, פרחים ונהרות של אור שפורחים על העור בכל מקום שהאצבעות נוגעות, ולוטוס של אור שנפתח מתחת ליד שנחה על הבטן.',
    safety: 'כל שלב הוא הזמנה, לא הוראה. מותר להישאר בשלב קודם, או לעצור.',
  },
  fire: {
    what: 'מסע של נשימה ואנרגיה: מכירים את רצפת האגן, מעוררים חום בבסיס הגוף בדקה של נשימת אש, ומזיזים אותו כגל לאורך עמוד השדרה – אל הלב ואל הראש – עד שכל הגוף זוהר.',
    stages: ['הגעה – ישיבה זקופה ונוחה', 'רצפת האגן – הרפיה בשאיפה, כיווץ עדין בנשיפה', 'נשימת אש – דקה של נשימה מהירה דרך האף', 'גל בעמוד השדרה – חום שעולה ושוקע', 'לגבר: לפזר את העוררות למעלה · לאישה: לתת לגל להתרחב ולפתוח', 'שיא – נשימה עמוקה, החזקה למעלה, ושחרור', 'פיזור – החום מתפשט לידיים, לרגליים ולפנים'],
    forWhom: 'למבוגרים, למי ש{אוהב|אוהבת} עבודה פעילה עם נשימה. לא בהריון, ולא עם לחץ דם גבוה או אפילפסיה בלי אישור רופא.',
    visuals: 'גחלת בבסיס עמוד השדרה, טבעות אש שפועמות בקצב הנשימה, נחש של אש שעולה דרך הצ׳אקרות עם כנפיים של להבות, ופיצוץ של אור לבן מעל הכתר.',
    safety: 'אם מסתחרר הראש – לחזור מיד לנשימה רגילה. תמיד.',
  },
  pleasure: {
    what: 'עונג עצמי מודע, בלי שיא כמטרה. מאטים לחצי מהמהירות ועוד חצי, ועובדים עם גלים: עולים, נחים, ועולים שוב – כל גל קצת עמוק ורחב יותר. אם מגיע שיא, הוא מוזמן; ואם לא – גם זה שלם.',
    stages: ['הגעה – אין יעד, רק להיות בתוך התחושה', 'האטה – חצי מהמהירות, ועוד חצי', 'גלים – עלייה ומנוחה, נשימה אל הבטן או האגן (שונה לגבר ולאישה)', 'שיא בלי יעד – העונג הוא הדרך', 'לנשום את זה – מהאגן ללב ולראש', 'מנוחה – יד על הלב ויד על הבטן'],
    forWhom: 'למבוגרים בלבד, במקום פרטי. למי שרוצה לגלות כמה עונג יכול להתרחב כשלא ממהרים.',
    visuals: 'חוף של אור זהוב בדמדומים, טיפות אור שמרחפות כשהזמן מאט, גלים סגולים-זהובים שעוברים דרך הגוף, ופריחה של זוהר צפוני בשמיים.',
    safety: 'אם מתישהו זה לא נעים – לעצור. אין דבר נכון יותר מזה.',
  },
  breathe2: {
    what: 'ערב רך לשניכם: יושבים קרוב, מבט בעיניים, נשימה מסונכרנת, יד על הלב של השני, ומילה טובה אחד לשנייה. בלי מגע מיני ובלי מטרה – רק להיות יחד.',
    stages: ['פתיחה – מול זה מול זו, ברכיים כמעט נוגעות', 'מבט בעיניים – להיראות ולראות', 'נשימה משותפת – שתי נשימות שנפגשות', 'הוא – יד על הלב שלה · היא – יד על הלב שלו', 'שתיקה משותפת', 'מילים טובות – כל אחד בתורו', 'חיבוק ארוך, שלוש נשימות'],
    forWhom: 'לכל זוג, גם כשקשה להתחיל. טוב כפתיחה לערב, או כחיבור אחרי תקופה עמוסה.',
    visuals: 'זוג של קווי אור פסיכדליים שנושמים, מביטים ומחבקים – על המסך כתוב בכל רגע של מי התור.',
    safety: 'מותר לצחוק, מותר להתבייש. כל אחד יכול לעצור בכל רגע.',
  },
  listen: {
    what: 'מגע בתורות בהשראת Sensate Focus: אחד נותן מתוך סקרנות, השני רק מקבל ומכוון בשלוש מילים – יותר, פחות, בדיוק. סבב ראשון בלי אזורים אינטימיים; סבב שני – רק אם שניכם אומרים כן.',
    stages: ['פתיחה ומילת עצירה', 'יותר · פחות · בדיוק', 'היא מקבלת · הוא נותן', 'בדיקה: זה עדיין טוב?', 'החלפה – הוא מקבל · היא נותנת', 'סבב שני (רק בהסכמה של שניכם)', 'שיתוף – רגע אחד טוב, ומשהו שלמדתי'],
    forWhom: 'לזוגות שרוצים להכיר מחדש את המגע של כל אחד – בלי ביצוע ובלי לחץ להגיע לשום מקום.',
    visuals: 'הזוג של קווי האור בתנועה איטית לפי התור – מי נוגע ומי מקבל – עם תווית גדולה על המסך.',
    safety: 'מילת העצירה עוצרת הכול, בלי שאלות. אין חובה להתפשט או להמשיך.',
  },
  desire2: {
    what: 'ערב של תשוקה: טקס פתיחה עם נר וכוונה, ריקוד איטי, הובלה בתורות, מגע שמתגלה לאט, ומגע משותף – ואז "מכאן זה שלכם": הקול נפרד והמוזיקה ממשיכה עוד 20 דקות.',
    stages: ['טקס פתיחה – נר, כוונה לכל אחד, מילת עצירה', 'ריקוד איטי – הוא מוביל, היא מובילה', 'היא נוגעת · הוא מקבל', 'הוא נוגע · היא מקבלת', 'בדיקה – מבט בעיניים, זה עדיין טוב?', 'מגע משותף – הוא מאט, היא מתרחבת', 'מכאן זה שלכם'],
    forWhom: 'לזוגות שכבר מרגישים בטוחים זה עם זו, לערב בלי מסכים ובלי הפרעות. מומלץ עם רמקול ומצב טלוויזיה.',
    visuals: 'הזוג של קווי האור – טקס, ריקוד, מגע ומיזוג לאור – מסונכרן לכל שלב בתסריט.',
    safety: 'בדיקות "זה עדיין טוב?" לאורך הערב. אם לא – עוצרים ומתחבקים. גם זה ערב טוב.',
  },
}

/** pick the masculine/feminine form inside '{m|f}' markers */
export const gx = (address: 'm' | 'f', s: string) => s.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m: string, f: string) => (address === 'f' ? f : m))
