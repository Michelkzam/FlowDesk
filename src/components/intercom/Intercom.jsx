import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Radio, Mic, MicOff, Headphones, Volume2, Send, Search, X, Minus,
  MessageSquare, Users, Hash, Phone, PhoneOff, Pause, Play, ArrowLeft,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/AuthContext"

const GROUPS = [
  { id: "all", label: "Todos" },
  { id: "admin", label: "Administradores" },
  { id: "agent", label: "Técnicos" },
  { id: "user", label: "Usuários" },
]

const CHANNELS = [
  { id: "geral", name: "Geral" },
  { id: "suporte", name: "Suporte" },
  { id: "financeiro", name: "Financeiro" },
]

const STATUS_MAP = {
  available: { label: "Disponível", color: "bg-emerald-500" },
  busy: { label: "Ocupado", color: "bg-amber-500" },
  offline: { label: "Offline", color: "bg-zinc-500" },
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function SoundWaves({ active, size = "sm" }) {
  const barH = size === "sm" ? [3, 12, 3] : [4, 20, 4]
  return (
    <div className="flex items-center justify-center gap-[2px]">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn("rounded-full bg-current", size === "sm" ? "w-[2px]" : "w-[3px]")}
          animate={active ? { height: barH, opacity: [0.4, 1, 0.4] } : { height: barH[0], opacity: 0.3 }}
          transition={active ? { duration: 0.5, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" } : { duration: 0.2 }}
        />
      ))}
    </div>
  )
}

function StatusDot({ status, size = "sm" }) {
  const sz = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
  return (
    <span className={cn("absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-zinc-900", sz, STATUS_MAP[status]?.color)} />
  )
}

function CallScreen({ operator, callState, elapsed, onAnswer, onHold, onResume, onHangUp }) {
  const initials = operator.full_name?.split(" ").map((n) => n[0]).join("") || "?"
  const isRinging = callState === "ringing"
  const isActive = callState === "active"
  const isOnHold = callState === "hold"

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-1 flex-col items-center justify-center px-4 py-6">
      <div className="relative mb-4">
        {isRinging && <motion.div className="absolute inset-0 rounded-full border-2 border-zinc-500" animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />}
        {isActive && !isOnHold && <motion.div className="absolute inset-0 rounded-full border-2 border-emerald-500" animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />}
        <Avatar className="h-20 w-20"><AvatarFallback className="bg-zinc-700 text-xl text-zinc-300">{initials}</AvatarFallback></Avatar>
        <StatusDot status="available" size="lg" />
      </div>
      <h3 className="text-base font-semibold text-zinc-100">{operator.full_name}</h3>
      <p className="text-xs text-zinc-500">{operator.role === "admin" ? "Administrador" : operator.role === "agent" ? "Técnico" : "Usuário"}</p>
      <div className="mt-3 flex flex-col items-center gap-1">
        {isRinging && <motion.div className="flex items-center gap-2 text-zinc-400" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}><Phone className="h-3.5 w-3.5" /><span className="text-xs">Chamando...</span></motion.div>}
        {isActive && !isOnHold && <div className="flex items-center gap-2 text-emerald-400"><SoundWaves active size="sm" /><span className="text-xs font-medium">Chamada ativa</span></div>}
        {isOnHold && <div className="flex items-center gap-2 text-amber-400"><Pause className="h-3.5 w-3.5" /><span className="text-xs font-medium">Em espera</span></div>}
        <span className="font-mono text-lg text-zinc-300">{formatTimer(elapsed)}</span>
      </div>
      <div className="mt-6 flex items-center gap-3">
        {isRinging && (
          <>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onHangUp} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30 hover:bg-red-600"><PhoneOff className="h-6 w-6 text-white" /></motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onAnswer} className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"><Phone className="h-6 w-6 text-white" /></motion.button>
          </>
        )}
        {(isActive || isOnHold) && (
          <>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onHangUp} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30 hover:bg-red-600"><PhoneOff className="h-6 w-6 text-white" /></motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={isOnHold ? onResume : onHold} className={cn("flex h-14 w-14 items-center justify-center rounded-full shadow-lg", isOnHold ? "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-600" : "bg-amber-500 shadow-amber-500/30 hover:bg-amber-600")}>
              {isOnHold ? <Play className="h-6 w-6 text-white" /> : <Pause className="h-6 w-6 text-white" />}
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  )
}

function useSocketRef() {
  const channelRef = useRef(null)

  const getChannel = useCallback(async () => {
    if (channelRef.current) return channelRef.current
    try {
      const { connectRealtime } = await import("@/services/realtime")
      const ch = connectRealtime()
      channelRef.current = ch
      return ch
    } catch (e) {
      console.warn('[Intercom] Realtime unavailable:', e.message)
      return null
    }
  }, [])

  return getChannel
}

export default function Intercom() {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState("team")
  const [activeChannel, setActiveChannel] = useState("geral")
  const [searchQuery, setSearchQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState("all")
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState("")
  const [volume, setVolume] = useState([75])
  const [isMutedMic, setIsMutedMic] = useState(false)
  const [isMutedHeadphones, setIsMutedHeadphones] = useState(false)
  const messagesEndRef = useRef(null)
  const [callState, setCallState] = useState(null)
  const [callTarget, setCallTarget] = useState(null)
  const [callElapsed, setCallElapsed] = useState(0)
  const callTimerRef = useRef(null)
  const { user: currentUser } = useAuth()
  const getSocket = useSocketRef()

  const { data: teamData = [] } = useQuery({
    queryKey: ["intercom-team"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, full_name, email, role, status").in("role", ["admin", "agent", "user"]);
      return (data || []).map(u => ({
        ...u,
        group: u.role,
        status: u.status === "active" ? "available" : "offline",
      }));
    },
  });

  useEffect(() => {
    if (callState === "active") {
      callTimerRef.current = setInterval(() => setCallElapsed((p) => p + 1), 1000)
    } else if (callState !== "hold") {
      clearInterval(callTimerRef.current)
      setCallElapsed(0)
    }
    return () => clearInterval(callTimerRef.current)
  }, [callState])

  useEffect(() => {
    if (callState !== "ringing") return
    const t = setTimeout(() => setCallState("active"), 3000)
    return () => clearTimeout(t)
  }, [callState])

  const [typingUsers, setTypingUsers] = useState([])

  useEffect(() => {
    if (!expanded) return
    let mounted = true
    let unsubMessage = null
    let unsubTyping = null

    getSocket().then(async (ch) => {
      if (!ch || !mounted) return
      const { onGlobalEvent } = await import("@/services/realtime")
      
      unsubMessage = onGlobalEvent("intercom:message", (data) => {
        if (data?.channel === activeChannel) {
          setMessages(prev => [...prev, { id: String(Date.now()), user: data.user, text: data.text, time: data.time, channel: data.channel }])
        }
      })
      
      unsubTyping = onGlobalEvent("intercom:typing", (data) => {
        if (data?.channel === activeChannel && data.user !== currentUser?.full_name) {
          setTypingUsers(prev => {
            if (prev.includes(data.user)) return prev
            return [...prev, data.user]
          })
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u !== data.user))
          }, 3000)
        }
      })
    })

    return () => {
      mounted = false
      if (unsubMessage) unsubMessage()
      if (unsubTyping) unsubTyping()
    }
  }, [expanded, activeChannel, currentUser])

  const filteredTeam = teamData.filter((op) => {
    const matchSearch = op.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || op.role?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchGroup = groupFilter === "all" || op.group === groupFilter
    return matchSearch && matchGroup
  })

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [])
  useEffect(() => { if (expanded) scrollToBottom() }, [messages, expanded, scrollToBottom])

  const handleStartCall = (operator) => { if (callState || operator.status === "offline") return; setCallTarget(operator); setCallState("ringing") }
  const handleAnswer = () => setCallState("active")
  const handleHold = () => setCallState("hold")
  const handleResume = () => setCallState("active")
  const handleHangUp = () => { clearInterval(callTimerRef.current); setCallState(null); setCallTarget(null); setCallElapsed(0); setIsMutedMic(false) }

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return
    const msg = { id: String(Date.now()), user: currentUser?.full_name || "Você", text: messageInput.trim(), time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), channel: activeChannel }
    setMessages(prev => [...prev, msg])
    try {
      const { broadcastTicketEvent } = await import("@/services/realtime")
      broadcastTicketEvent("intercom:message", msg)
    } catch (e) {
      console.warn('[Intercom] Broadcast failed:', e.message)
    }
    setMessageInput("")
    setTypingUsers(prev => prev.filter(u => u !== currentUser?.full_name))
  }

  const handleTyping = async () => {
    try {
      const { broadcastTicketEvent } = await import("@/services/realtime")
      broadcastTicketEvent("intercom:typing", { user: currentUser?.full_name, channel: activeChannel })
    } catch (e) {
      console.warn('[Intercom] Broadcast failed:', e.message)
    }
  }

  const channelMessages = messages.filter((m) => m.channel === activeChannel)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="fixed bottom-4 right-4 z-50">
        <AnimatePresence mode="wait">
          {expanded ? (
            <motion.div key="panel" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }} className="flex h-[520px] w-[380px] flex-col rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-zinc-100">Intercom</span>
                  {callState && <Badge variant="secondary" className="h-5 rounded-full bg-emerald-500/20 px-1.5 text-[10px] text-emerald-400">{callState === "ringing" ? "Chamando" : callState === "hold" ? "Em espera" : "Ativa"}</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-300" onClick={() => setExpanded(false)}><Minus className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-300" onClick={() => setExpanded(false)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              {callTarget ? (
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-300" onClick={handleHangUp}><ArrowLeft className="h-3.5 w-3.5" /></Button>
                    <span className="text-xs text-zinc-400">Chamada</span>
                  </div>
                  <CallScreen operator={callTarget} callState={callState} elapsed={callElapsed} onAnswer={handleAnswer} onHold={handleHold} onResume={handleResume} onHangUp={handleHangUp} />
                  {(callState === "active" || callState === "hold") && (
                    <div className="flex items-center justify-center gap-3 border-t border-zinc-800 px-4 py-3">
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8", isMutedMic ? "text-red-400" : "text-zinc-500 hover:text-zinc-300")} onClick={() => setIsMutedMic(p => !p)}>
                        {isMutedMic ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8", isMutedHeadphones ? "text-red-400" : "text-zinc-500 hover:text-zinc-300")} onClick={() => setIsMutedHeadphones(p => !p)}>
                        {isMutedHeadphones ? <Headphones className="h-4 w-4 text-red-400" /> : <Headphones className="h-4 w-4" />}
                      </Button>
                      <div className="flex w-24 items-center gap-2">
                        <Volume2 className="h-3 w-3 shrink-0 text-zinc-500" />
                        <Slider value={volume} onValueChange={setVolume} max={100} step={5} className="w-full" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <div className="px-3 pt-3">
                      <TabsList className="h-8 w-full rounded-lg bg-zinc-800/50 p-0.5">
                        <TabsTrigger value="team" className="h-full flex-1 rounded-md text-[11px] data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-200"><Users className="mr-1 h-3 w-3" />Equipe</TabsTrigger>
                        <TabsTrigger value="channels" className="h-full flex-1 rounded-md text-[11px] data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-200"><Hash className="mr-1 h-3 w-3" />Canais</TabsTrigger>
                        <TabsTrigger value="messages" className="h-full flex-1 rounded-md text-[11px] data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-200"><MessageSquare className="mr-1 h-3 w-3" />Chat</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="team" className="mt-0 flex flex-1 flex-col">
                      <div className="space-y-2 px-3 pt-3">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                          <Input placeholder="Buscar por nome ou cargo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 border-zinc-700 bg-zinc-800 pl-7 text-xs text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-zinc-600" />
                        </div>
                        <div className="flex gap-1">
                          {GROUPS.map((g) => (
                            <button key={g.id} onClick={() => setGroupFilter(g.id)} className={cn("rounded-md px-2 py-1 text-[10px] font-medium transition-colors", groupFilter === g.id ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300")}>{g.label}</button>
                          ))}
                        </div>
                      </div>
                      <ScrollArea className="flex-1 px-3 py-2">
                        <div className="space-y-0.5">
                          {filteredTeam.map((op) => {
                            const initials = op.full_name?.split(" ").map((n) => n[0]).join("") || "?"
                            const canCall = op.status !== "offline" && !callState
                            const roleLabel = op.role === "admin" ? "Administrador" : op.role === "agent" ? "Técnico" : "Usuário"
                            return (
                              <div key={op.id} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors", canCall ? "cursor-pointer hover:bg-zinc-800" : "opacity-50")} onClick={() => canCall && handleStartCall(op)}>
                                <div className="relative">
                                  <Avatar className="h-9 w-9"><AvatarFallback className="bg-zinc-700 text-xs text-zinc-300">{initials}</AvatarFallback></Avatar>
                                  <StatusDot status={op.status} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-zinc-200">{op.full_name}</p>
                                  <p className="truncate text-[11px] text-zinc-500">{roleLabel}</p>
                                </div>
                                {canCall && (
                                  <Tooltip><TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-zinc-500 hover:text-emerald-400" onClick={(e) => { e.stopPropagation(); handleStartCall(op) }}><Phone className="h-4 w-4" /></Button>
                                  </TooltipTrigger><TooltipContent>Ligar para {op.full_name?.split(" ")[0]}</TooltipContent></Tooltip>
                                )}
                              </div>
                            )
                          })}
                          {filteredTeam.length === 0 && <p className="py-8 text-center text-xs text-zinc-600">Nenhum membro encontrado</p>}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="channels" className="mt-0">
                      <ScrollArea className="h-[360px] px-3 py-2">
                        <div className="space-y-0.5">
                          {CHANNELS.map((ch) => (
                            <button key={ch.id} onClick={() => setActiveChannel(ch.id)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors", activeChannel === ch.id ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")}>
                              <Hash className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{ch.name}</span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="messages" className="mt-0 flex flex-1 flex-col">
                      <ScrollArea className="flex-1 px-3 py-2">
                        <div className="space-y-2">
                          {channelMessages.map((msg) => (
                            <div key={msg.id} className="rounded-md bg-zinc-800/50 px-3 py-2">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-medium text-zinc-300">{msg.user}</span>
                                <span className="text-[10px] text-zinc-600">{msg.time}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-zinc-400">{msg.text}</p>
                            </div>
                          ))}
                          {typingUsers.length > 0 && (
                            <div className="flex items-center gap-2 text-zinc-500 text-[10px] py-1">
                              <div className="flex gap-0.5">
                                <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              <span>{typingUsers.join(", ")} {typingUsers.length === 1 ? "está" : "estão"} digitando...</span>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                      <Separator className="bg-zinc-800" />
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Input placeholder="Mensagem rápida..." value={messageInput} onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} className="h-8 flex-1 border-zinc-700 bg-zinc-800 text-xs text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-zinc-600" />
                        <Button size="icon" onClick={handleSendMessage} disabled={!messageInput.trim()} className="h-8 w-8 shrink-0 bg-zinc-700 text-zinc-300 hover:bg-zinc-600"><Send className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </motion.div>
          ) : (
            <motion.button key="fab" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setExpanded(true)} className="relative flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 shadow-lg shadow-black/40 hover:bg-zinc-700">
              <Radio className="h-5 w-5 text-zinc-300" />
              {callState && <motion.span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-zinc-900 bg-emerald-500" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}
