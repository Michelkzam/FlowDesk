const fs = require('fs');
let code = fs.readFileSync('src/components/chat/ChatWindow.jsx', 'utf8');

// Fix 1: select attachments
code = code.replace(
  '.select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at")',
  '.select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at, attachments")'
);

// Fix 2: parseBody(msg) + guessType
const idx1 = code.indexOf('function parseBody(body)');
const idx2 = code.indexOf('const channelEmoji');
const oldPB = code.substring(idx1, idx2);

const newPB = [
  'function guessType(name) {',
  '  const ext = name.split(".").pop()?.toLowerCase() || "";',
  '  if (["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return "image/";',
  '  if (["mp4","webm","avi","mov"].includes(ext)) return "video/";',
  '  if (["mp3","wav","ogg","m4a"].includes(ext) || name.startsWith("audio_")) return "audio/";',
  '  return "other";',
  '}',
  '',
  'function parseBody(msg) {',
  '  const inlineAttachments = [];',
  '  let bodyText = msg.body || "";',
  '  if (msg.attachments) {',
  '    try {',
  '      const atts = typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : msg.attachments;',
  '      if (Array.isArray(atts)) {',
  '        atts.forEach(a => {',
  '          const t = guessType(a.name || "");',
  '          inlineAttachments.push({ name: a.name, url: a.url, isImage: t === "image/", isVideo: t === "video/", isAudio: t === "audio/" || a.isAudio });',
  '        });',
  '      }',
  '    } catch {}',
  '  }',
  '  const lines = bodyText.split("\\n");',
  '  const textLines = [];',
  '  for (const line of lines) {',
  '    const match = line.match(/\\u{1F4CE}\\s*(.+?):\\s*(https?:\\/\\/\\S+)$/i);',
  '    if (match) {',
  '      const name = match[1].trim();',
  '      const url = match[2].trim();',
  '      const alreadyHas = inlineAttachments.some(a => a.url === url || a.name === name);',
  '      if (!alreadyHas) {',
  '        const t = guessType(name);',
  '        inlineAttachments.push({ name, url, isImage: t === "image/", isVideo: t === "video/", isAudio: t === "audio/" });',
  '      }',
  '    } else {',
  '      textLines.push(line);',
  '    }',
  '  }',
  '  return { text: textLines.join("\\n").trim(), attachments: inlineAttachments };',
  '}',
  '',
].join('\n');

code = code.replace(oldPB, newPB);

// Fix 3: call site parseBody(msg)
code = code.replace(
  'const body = msg.body;\n                    if (!body) return null;\n                    const hasAttachment = body.includes("',
  'PARSEDUMMY'
);

// Restore and do it properly - use the exact original text
code = code.replace('PARSEDUMMY', 'const body = msg.body;\n                    if (!body) return null;\n                    const hasAttachment = body.includes("');

fs.writeFileSync('src/components/chat/ChatWindow.jsx', code, 'utf8');
console.log('parseBody(msg):', code.includes('function parseBody(msg)'));
console.log('guessType:', code.includes('function guessType'));
console.log('attachments select:', code.includes('created_at, attachments'));