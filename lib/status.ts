/* ---------------------------------------------------------------------------
 * Live "currently working on" status. Edit this file (or wire it to a
 * Notion/Airtable webhook later) to update without redeploying. Keeps the
 * site reading "alive" — judges note this.
 * ------------------------------------------------------------------------- */

export type LiveStatus = {
  /** What you're currently building / focused on. Keep under 60 chars. */
  building: string
  /** Where you are in time (timezone, season). Optional. */
  where?: string
  /** What you're listening to / inspired by lately. Optional. */
  listening?: string
}

export const liveStatus: LiveStatus = {
  building: "watch-party rituals & a runic arcade",
  where: "asia / late nights",
  listening: "oneohtrix, jon hopkins, anjunadeep",
}
