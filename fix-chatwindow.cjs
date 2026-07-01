const fs = require('fs');
let code = fs.readFileSync('src/components/chat/ChatWindow.jsx', 'utf8');

code = code.replace(
  '.select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at")',
  '.select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at, attachments")'
);

const parseBodyStart = code.indexOf('function parseBody(body)');
const returnIdx = code.indexOf('return { text: textLines.join("\\n").trim(), attachments };');
const parseBodyEnd = code.indexOf('\n}', returnIdx) + 2;
const oldFunc = code.substring(parseBodyStart, parseBodyEnd);

const newFunc = 'function guessType(name) {\n' +
  '  const ext = name.split(\'.\').pop()?.toLowerCase() || \'\';\n' +
  '  if ([\'png\',\'jpg\',\'jpeg\',\'gif\',\'webp\',\'svg\'].includes(ext)) return \'image/\';\n' +
  '  if ([\'mp4\',\'webm\',\'avi\',\'mov\'].includes(ext)) return \'video/\';\n' +
  '  if ([\'mp3\',\'wav\',\'ogg\',\'m4a\'].includes(ext) || name.startsWith(\'audio_\')) return \'audio/\';\n' +
  '  return \'other\';\n' +
  '}\n\n' +
  'function parseBody(msg) {\n' +
  '  const inlineAttachments = [];\n' +
  '  let bodyText = msg.body || \'\';\n' +
  '  if (msg.attachments) {\n' +
  '    try {\n' +
  '      const atts = typeof msg.attachments === \'string\' ? JSON.parse(msg.attachments) : msg.attachments;\n' +
  '      if (Array.isArray(atts)) {\n' +
  '        atts.forEach(a => {\n' +
  '          const t = guessType(a.name || a.url?.split(\'/\').pop() || \'\');\n' +
  '          inlineAttachments.push({ name: a.name || a.url?.split(\'/\').pop() || \'arquivo\', url: a.url, isImage: t === \'image/\', isVideo: t === \'video/\', isAudio: t === \'audio/\' || a.isAudio });\n' +
  '        });\n' +
  '      }\n' +
  '    } catch {}\n' +
  '  }\n' +
  '  const ATTACHLINE = /^\\u{1F4CE}\\s*(.+?):\\s*(https?:\\/\\/\\S+)$/i;\n' +
  '  const lines = bodyText.split("\\n");\n' +
  '  const textLines = [];\n' +
  '  for (const line of lines) {\n' +
  '    const trimmed = line.trim();\n' +
  '    const match = trimmed.match(ATTACHLINE);\n' +
  '    if (match) {\n' +
  '      const name = match[1].trim();\n' +
  '      const url = match[2].trim();\n' +
  '      if (!inlineAttachments.some(a => a.url === url || a.name === name)) {\n' +
  '        const t = guessType(name);\n' +
  '        inlineAttachments.push({ name, url, isImage: t === \'image/\', isVideo: t === \'video/\', isAudio: t === \'audio/\' });\n' +
  '      }\n' +
  '    } else if (trimmed.match(/^https?:\\/\\/\\S+$/) && trimmed.match(/\\.(png|jpg|jpeg|gif|webp|mp4|webm|mp3|wav|ogg|pdf)/i)) {\n' +
  '      const url = trimmed;\n' +
  '      if (!inlineAttachments.some(a => a.url === url)) {\n' +
  '        const fileName = url.split(\'/\').pop().split(\'?\')[0] || \'arquivo\';\n' +
  '        const t = guessType(fileName);\n' +
  '        inlineAttachments.push({ name: fileName, url, isImage: t === \'image/\', isVideo: t === \'video/\', isAudio: t === \'audio/\' });\n' +
  '      }\n' +
  '    } else {\n' +
  '      textLines.push(line);\n' +
  '    }\n' +
  '  }\n' +
  '  return { text: textLines.join("\\n").trim(), attachments: inlineAttachments };\n' +
  '}\n\n';

code = code.replace(oldFunc, newFunc);

const oldCall = 'const body = msg.body;\n                    if (!body) return null;\n                    const hasAttachment = body.includes("\uD83D\uDCCE");\n                    if (!hasAttachment) return <p className="text-sm whitespace-pre-wrap">{body}</p>;\n                    const { text: msgText, attachments: inlineAtts } = parseBody(body);';
const newCall = 'const { text: msgText, attachments: inlineAtts } = parseBody(msg);\n                    if (!msgText && inlineAtts.length === 0) return null;';
code = code.replace(oldCall, newCall);

fs.writeFileSync('src/components/chat/ChatWindow.jsx', code, 'utf8');
console.log('parseBody(msg):', code.includes('function parseBody(msg)'));
console.log('guessType:', code.includes('function guessType'));
console.log('attachments select:', code.includes('created_at, attachments'));
console.log('parseBody(msg) call:', code.includes('parseBody(msg)'));
console.log('raw URL detection:', code.includes('trimmed.match'));