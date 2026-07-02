const fs = require('fs');
let code = fs.readFileSync('src/pages/chat/MeusAtendimentos.jsx', 'utf8');

// Find and replace the message rendering section
// The pattern is: messages.map(msg => (
//   <div key={msg.id}...
// We need to replace from this line to the closing )) before {Message input}

const startMarker = 'messages.map(msg => (';
const startIdx = code.indexOf(startMarker);
if (startIdx === -1) { console.log('Start not found'); process.exit(1); }

// Find the end: look for the closing of the map
let depth = 0;
let endIdx = startIdx;
let inString = false;
let stringChar = '';

for (let j = startIdx; j < code.length; j++) {
  const c = code[j];
  if (inString) {
    if (c === stringChar && code[j-1] !== '\\') inString = false;
    continue;
  }
  if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
  if (c === '(') depth++;
  if (c === ')') {
    depth--;
    if (depth === 0) {
      endIdx = j + 1;
      break;
    }
  }
}

console.log('Map block from', startIdx, 'to', endIdx, 'length:', endIdx - startIdx);

const newRender = `messages.map(msg => {
              const isOwn = msg.sender_type === "agent";
              const isHighlighted = msg.is_highlighted || highlighted.has(msg.id);
              const isEditing = editingMsg === msg.id;
              const isCurrentUser = currentUser?.id === msg.sender_id;
              return (
                <div key={msg.id} className={\`group relative flex \${isOwn ? "justify-end" : "justify-start"}\`}>
                  <div className="max-w-xs lg:max-w-md">
                    {isHighlighted && <div className="text-[10px] text-amber-600 mb-0.5 ml-1 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400" /> Destacada</div>}
                    <div className={\`rounded-2xl px-4 py-2.5 \${
                      isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" :
                      msg.sender_type === "system" ? "bg-muted/50 text-muted-foreground italic text-xs" :
                      "bg-muted rounded-tl-sm"
                    }\`}>
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea className="text-sm bg-background text-foreground border border-border rounded-lg p-2 w-full resize-none" value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); editMsgMutation.mutate({ id: msg.id, body: editText }); } }} autoFocus rows={2} />
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setEditingMsg(null)} className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80"><X className="w-3 h-3" /></button>
                            <button onClick={() => editMsgMutation.mutate({ id: msg.id, body: editText })} className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"><Save className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ) : (() => {
                          const { text, attachments: atts } = parseBody(msg);
                          return (
                            <>
                              {text && <p className="text-sm whitespace-pre-wrap">{text}</p>}
                              {atts.length > 0 && (
                                <div className="flex flex-col gap-1.5 mt-1">
                                  {atts.map((a, j) => a.isImage ? <a key={j} href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.name} className="max-w-[280px] max-h-[220px] rounded-lg object-cover" /></a> : a.isVideo ? <video key={j} controls src={a.url} className="max-w-[280px] max-h-[220px] rounded-lg" /> : a.isAudio ? <div key={j} className="bg-muted rounded-lg p-2"><audio controls src={a.url} className="w-full h-10" preload="metadata" /></div> : <a key={j} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-xs"><span className="truncate">{a.name}</span></a>)}
                                </div>
                              )}
                            </>
                          );
                        })()
                      )}
                    </div>
                    <div className={\`flex items-center gap-1.5 mt-1 \${isOwn ? "justify-end mr-1" : "ml-1"}\`}>
                      <p className="text-xs text-muted-foreground">
                        {msg.sender_name || (isOwn ? "Operador" : "Cliente")} • {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                      {isCurrentUser && msg.sender_type !== "system" && (
                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setOpenMenu(openMenu === msg.id ? null : msg.id)} className="p-0.5 rounded hover:bg-muted"><MoreVertical className="w-3 h-3 text-muted-foreground" /></button>
                          {openMenu === msg.id && (
                            <div className="absolute right-0 top-6 z-10 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                              <button onClick={() => { setEditingMsg(msg.id); setEditText(msg.body); setOpenMenu(null); }} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted w-full text-left"><Pencil className="w-3 h-3" /> Editar</button>
                              <button onClick={() => { highlightMsgMutation.mutate({ id: msg.id, isHighlighted: !isHighlighted }); }} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted w-full text-left"><Star className={\`w-3 h-3 \${isHighlighted ? "fill-amber-400 text-amber-400" : ""}\`} /> {isHighlighted ? "Remover destaque" : "Destacar"}</button>
                              <button onClick={() => { if (confirm("Excluir esta mensagem?")) deleteMsgMutation.mutate(msg.id); }} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive w-full text-left"><Trash2 className="w-3 h-3" /> Excluir</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })`;

code = code.substring(0, startIdx) + newRender + code.substring(endIdx);
fs.writeFileSync('src/pages/chat/MeusAtendimentos.jsx', code, 'utf8');
console.log('Message rendering updated');