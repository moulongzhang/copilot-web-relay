import AnsiToHtml from 'ansi-to-html';

const converter = new AnsiToHtml({
  fg: '#ececec',
  bg: 'transparent',
  newline: true,
  escapeXML: true,
});

export function ansiToHtml(text: string): string {
  return converter.toHtml(text);
}
