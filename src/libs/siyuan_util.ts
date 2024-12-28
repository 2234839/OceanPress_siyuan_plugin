interface IALObject {
  [key: string]: string;
}

/**
 * Converts an IAL string to a JSON object
 * @param ial - The IAL string to convert
 * @returns An object representing the IAL attributes
 */
export function ialToJson(ial: string): IALObject {
  const result: IALObject = {};
  const regex = /{:\s*(.+?)\s*}/;
  const match = ial.match(regex);

  if (match) {
    const content = match[1];
    const attributeRegex = /(\w+)="([^"]*)"/g;
    let attributeMatch: RegExpExecArray | null;

    while ((attributeMatch = attributeRegex.exec(content)) !== null) {
      result[attributeMatch[1]] = attributeMatch[2];
    }
  }

  return result;
}

/**
 * Converts a JSON object to an IAL string
 * @param json - The object to convert to IAL
 * @returns An IAL string representation of the object
 */
export function jsonToIal(json: IALObject): string {
  const ialContent = Object.entries(json)
    .sort(([keyA], [keyB]) => (keyA === "id" ? -1 : keyB === "id" ? 1 : 0))
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  return ialContent ? `{: ${ialContent}}` : "{: }";
}
