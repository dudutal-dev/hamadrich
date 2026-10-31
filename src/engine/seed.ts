import { type Phase, type TextItem, db, uid } from '../db'

/** 15 original Hebrew texts in the spirit of the Tao, one per moment of the journey. Not a translation of any copyrighted work. */
const SEED: Array<{ title: string; body: string; phases: Phase[]; intentions: string[]; estSec: number }> = [
  { title: 'הדלת', body: 'אתה כאן. הגוף מונח, הנשימה יודעת את דרכה. אין לאן ללכת ואין מה להשיג. הדלת פתוחה, ואתה כבר בפנים.', phases: [1], intentions: ['שקט', 'שחרור'], estSec: 20 },
  { title: 'הכוונה', body: 'לפני שהכול מתחיל, אמור לעצמך בשקט למה באת. לא כתביעה, כמו זרע שמניחים באדמה. ואז הרפה ממנו. הוא ידע לצמוח לבד.', phases: [1], intentions: ['בהירות', 'ריפוי', 'חיבור'], estSec: 22 },
  { title: 'התנוחה', body: 'עמוד השדרה ארוך ורך. הכתפיים נופלות. הלסת רפויה. הידיים לא צריכות לאחוז בכלום. מה שיושב ישר, מבלי להתאמץ, יושב נכון.', phases: [1], intentions: ['שקט'], estSec: 20 },
  { title: 'כל הדברים חולפים', body: 'מחשבה מגיעה, מחשבה הולכת. כמו עננים מעל הר. ההר לא מחזיק אותם ולא דוחף אותם. הוא פשוט עומד. היה ההר.', phases: [2], intentions: ['שחרור', 'שקט'], estSec: 22 },
  { title: 'הדברים הפשוטים', body: 'תן לדברים להיות פשוטים. מים זורמים למטה. אש עולה למעלה. הנשימה נכנסת ויוצאת. גם אתה חלק מהסדר הזה, ואין צורך לתקן אותו.', phases: [2], intentions: ['שחרור', 'הודיה'], estSec: 22 },
  { title: 'להניח', body: 'כל מה שאחזת בו היום – הנח אותו עכשיו ליד הגוף. הוא יחכה. הוא תמיד מחכה. כרגע אין בו צורך.', phases: [2], intentions: ['שחרור'], estSec: 16 },
  { title: 'החומר', body: 'הגוף נהיה כבד וחם. הוא שוקע בדרכו שלו. אתה לא עושה את זה – זה קורה. תן לזה לקרות.', phases: [2], intentions: ['ריפוי', 'שקט'], estSec: 16 },
  { title: 'מה שאין לו שם', body: 'מה שאפשר לקרוא לו בשם אינו הדבר עצמו. הדבר עצמו שקט. הוא כאן, לפני המילים, ואחריהן. אין צורך לתפוס אותו.', phases: [3], intentions: ['בהירות', 'חיבור'], estSec: 20 },
  { title: 'אור', body: 'אם מגיע אור – אל תרדוף. אם מגיע חושך – אל תברח. שניהם אורחים. אתה הבית.', phases: [3], intentions: ['שקט', 'ריפוי'], estSec: 16 },
  { title: 'אחד', body: 'הנשימה שלך והאוויר של החדר הם אותו אוויר. הגוף שלך והאדמה הם אותה אדמה. לא צריך להאמין בזה. פשוט להרגיש.', phases: [3], intentions: ['חיבור', 'הודיה'], estSec: 20 },
  { title: 'השורש', body: 'עכשיו, לאט, חזור אל כף הרגל. אל הגב שנוגע. אל קול הנשימה. הגוף היה כאן כל הזמן. הוא שמר לך מקום.', phases: [4], intentions: ['שקט', 'ריפוי'], estSec: 20 },
  { title: 'זרע', body: 'מה שראית לא צריך הסבר. הוא כבר נטוע. הוא יצמח בימים שיבואו, בלי שתשים לב. תן לו זמן.', phases: [4], intentions: ['בהירות', 'ריפוי'], estSec: 18 },
  { title: 'שם ומקום', body: 'אמור בלב את השם שלך. את המקום שבו אתה שוכב. את היום. אתה חוזר, ומביא איתך משהו שקט.', phases: [4], intentions: ['שחרור', 'חיבור'], estSec: 18 },
  { title: 'הודיה', body: 'תודה לגוף שנשא. תודה לנשימה שלא עצרה. תודה למה שהתגלה ולמה שנשאר מוסתר. גם זה בסדר.', phases: [5], intentions: ['הודיה'], estSec: 16 },
  { title: 'הסגירה', body: 'המסע נגמר, וממשיך. קח נשימה אחת אחרונה בתוכו. ואז פקח עיניים כשתהיה מוכן. העולם חיכה לך.', phases: [5], intentions: ['שקט', 'שחרור', 'בהירות', 'ריפוי', 'חיבור', 'הודיה'], estSec: 18 },
]

export async function ensureSeed() {
  const n = await db.texts.count()
  if (n > 0) return
  const now = new Date().toISOString()
  const items: TextItem[] = SEED.map((s) => ({ id: uid(), source: 'מקורי', createdAt: now, ...s }))
  await db.texts.bulkAdd(items)
}
