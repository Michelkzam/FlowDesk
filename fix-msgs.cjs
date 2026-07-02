const fs = require('fs');
const code = fs.readFileSync('src/pages/chat/MeusAtendimentos.jsx', 'utf8');

// Build the new file with all changes
const parts = code.split('\n');
const newParts = [];
let i = 0;
let changes = 0;

while (i < parts.length) {
  const line = parts[i];

  // 1. Add imports
  if (line.includes('import { Clock, Headphones, CheckCircle, User, Phone, MessageSquare, Plus, Search, ArrowLeft, Send }')) {
    newParts.push(line.replace('import { Clock, Headphones, CheckCircle, User, Phone, MessageSquare, Plus, Search, ArrowLeft, Send }', 'import { Clock, Headphones, CheckCircle, User, Phone, MessageSquare, Plus, Search, ArrowLeft, Send, Pencil, Trash2, Star, MoreVertical, X, Save }'));
    changes++; i++; continue;
  }

  // 2. Add state after selectedTicket
  if (line.includes('const [selectedTicket, setSelectedTicket] = useState(null);')) {
    newParts.push(line);
    newParts.push('  const [editingMsg, setEditingMsg] = useState(null);');
    newParts.push('  const [editText, setEditText] = useState("");');
    newParts.push('  const [highlighted, setHighlighted] = useState(new Set());');
    newParts.push('  const [openMenu, setOpenMenu] = useState(null);');
    changes++; i++; continue;
  }

  // 3. Add mutations before sendMessageMutation
  if (line.includes('const sendMessageMutation = useMutation({')) {
    newParts.push('  const editMsgMutation = useMutation({');
    newParts.push('    mutationFn: async ({ id, body }) => {');
    newParts.push('      const { error } = await supabase.from("ticket_messages").update({ body }).eq("id", id);');
    newParts.push('      if (error) throw error;');
    newParts.push('    },');
    newParts.push('    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedTicket?.id] }); setEditingMsg(null); setEditText(""); },');
    newParts.push('  });');
    newParts.push('');
    newParts.push('  const deleteMsgMutation = useMutation({');
    newParts.push('    mutationFn: async (id) => {');
    newParts.push('      const { error } = await supabase.from("ticket_messages").delete().eq("id", id);');
    newParts.push('      if (error) throw error;');
    newParts.push('    },');
    newParts.push('    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedTicket?.id] }); setOpenMenu(null); },');
    newParts.push('  });');
    newParts.push('');
    newParts.push('  const highlightMsgMutation = useMutation({');
    newParts.push('    mutationFn: async ({ id, isHighlighted }) => {');
    newParts.push('      const { error } = await supabase.from("ticket_messages").update({ is_highlighted: isHighlighted }).eq("id", id);');
    newParts.push('      if (error) throw error;');
    newParts.push('    },');
    newParts.push('    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedTicket?.id] }); setOpenMenu(null); },');
    newParts.push('  });');
    newParts.push('');
    newParts.push(line);
    changes++; i++; continue;
  }

  // 4. Add is_highlighted to select
  if (line.includes('.select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at, attachments")')) {
    newParts.push(line.replace('created_at, attachments")', 'created_at, attachments, is_highlighted")'));
    changes++; i++; continue;
  }

  // 5. Fix description timestamp
  if (line.includes('format(new Date(selectedTicket.created_date), "HH:mm"')) {
    newParts.push(line.replace('"HH:mm"', '"dd/MM/yyyy HH:mm"'));
    changes++; i++; continue;
  }

  newParts.push(line);
  i++;
}

fs.writeFileSync('src/pages/chat/MeusAtendimentos.jsx', newParts.join('\n'), 'utf8');
console.log('Changes:', changes);