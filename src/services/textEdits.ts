/** Live typing: turning a change in the phone's text field into keys for the TV. */

/** What to send to make the TV's text match a change from `before` to `after`. */
export function textEdits(before: string, after: string): { deletes: number; insert: string } {
  const a = [...before];
  const b = [...after];
  let common = 0;
  while (common < a.length && common < b.length && a[common] === b[common]) {
    common++;
  }
  return { deletes: a.length - common, insert: b.slice(common).join('') };
}
