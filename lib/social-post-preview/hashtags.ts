/** Count hashtags per Instagram rules (#word tokens). */
export function countHashtags(text: string): number {
  const matches = text.match(/#[\w]+(?:\.[\w]+)*/gu);
  return matches?.length ?? 0;
}
