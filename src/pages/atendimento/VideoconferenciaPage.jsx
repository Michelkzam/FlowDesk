import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, ExternalLink, Copy, Link2, Calendar } from "lucide-react";

const tools = [
  {
    name: "Microsoft Teams",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg/120px-Microsoft_Office_Teams_%282018%E2%80%93present%29.svg.png",
    description: "Reuniões corporativas integradas ao Office 365",
    urlBase: "https://teams.microsoft.com/l/meetup-new/",
    idLabel: "Link da Reunião ou ID",
    placeholder: "Cole o link ou ID da reunião Teams",
    color: "bg-purple-50 border-purple-200",
    btnColor: "bg-purple-600 hover:bg-purple-700",
    createUrl: "https://teams.microsoft.com/l/meeting/new",
  },
  {
    name: "Google Meet",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Google_Meet_icon_%282020%29.svg/120px-Google_Meet_icon_%282020%29.svg.png",
    description: "Videoconferência simples e rápida",
    urlBase: "https://meet.google.com/",
    idLabel: "Código da Reunião",
    placeholder: "Ex: abc-defg-hij",
    color: "bg-green-50 border-green-200",
    btnColor: "bg-green-600 hover:bg-green-700",
    createUrl: "https://meet.google.com/new",
  },
  {
    name: "Zoom Meetings",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Zoom_Communications_Logo.svg/120px-Zoom_Communications_Logo.svg.png",
    description: "Solução completa de videoconferência",
    urlBase: "zoommtg://zoom.us/join?confno=",
    idLabel: "ID da Reunião",
    placeholder: "Ex: 123 456 7890",
    color: "bg-blue-50 border-blue-200",
    btnColor: "bg-blue-600 hover:bg-blue-700",
    createUrl: "https://zoom.us/start/videomeeting",
  },
];

export default function VideoconferenciaPage() {
  const [selectedTool, setSelectedTool] = useState(0);
  const [meetingId, setMeetingId] = useState("");

  const tool = tools[selectedTool];

  const handleConnect = () => {
    if (!meetingId.trim()) return;
    const url = tool.urlBase + meetingId.replace(/\s/g, "");
    window.open(url, "_blank");
  };

  const copy = (text) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Video className="w-5 h-5 text-primary" /> Videoconferência</h1>
        <p className="text-sm text-muted-foreground">Inicie ou participe de reuniões por videoconferência com os clientes</p>
      </div>

      {/* Tool selector */}
      <div>
        <p className="text-sm font-medium mb-2">Plataforma de Videoconferência</p>
        <div className="grid grid-cols-3 gap-3">
          {tools.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setSelectedTool(i)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${selectedTool === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"}`}
            >
              <div className="flex items-center gap-3">
                <img src={t.logo} alt={t.name} className="h-7 object-contain" onError={e => { e.target.style.display = "none"; }} />
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Join meeting */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Participar de Reunião</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">{tool.idLabel}</label>
              <Input
                placeholder={tool.placeholder}
                value={meetingId}
                onChange={e => setMeetingId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConnect()}
              />
            </div>
            <Button onClick={handleConnect} disabled={!meetingId.trim()} className={`w-full gap-2 text-white ${tool.btnColor}`}>
              <Video className="w-4 h-4" /> Entrar na Reunião
            </Button>
          </CardContent>
        </Card>

        {/* Create meeting */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Criar Nova Reunião</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Crie uma nova sala de reunião para compartilhar o link com o cliente.</p>
            <Button variant="outline" className="w-full gap-2" onClick={() => window.open(tool.createUrl, "_blank")}>
              <ExternalLink className="w-4 h-4" /> Criar Reunião no {tool.name}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs flex-1 gap-1" onClick={() => copy(tool.createUrl)}>
                <Copy className="w-3 h-3" /> Copiar link de criação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick tips */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
        <Video className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium mb-1">Dicas para videoconferência:</p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li>Certifique-se de ter uma boa conexão de internet</li>
            <li>Use fones de ouvido para melhor qualidade de áudio</li>
            <li>Compartilhe o link da reunião com o cliente antes do horário agendado</li>
            <li>O aplicativo desktop oferece melhor experiência que o navegador</li>
          </ul>
        </div>
      </div>
    </div>
  );
}