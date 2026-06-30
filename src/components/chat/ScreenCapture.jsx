import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Camera, Video, VideoOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ScreenCapture({ onCapture }) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handleScreenshot = useCallback(async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      stream.getTracks().forEach((track) => track.stop());

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" });

      if (onCapture) {
        onCapture(file);
      }

      toast({
        title: "Screenshot capturada",
        description: "A imagem foi anexada à mensagem.",
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        toast({
          title: "Erro ao capturar tela",
          description: "Não foi possível capturar a tela.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture, toast]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "video/webm" });

        if (onCapture) {
          onCapture(file);
        }

        toast({
          title: "Gravação finalizada",
          description: "O vídeo foi anexado à mensagem.",
        });
      };

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            setIsRecording(false);
          }
        };
      });

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);

      toast({
        title: "Gravação iniciada",
        description: "Clique novamente para parar a gravação.",
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        toast({
          title: "Erro ao iniciar gravação",
          description: "Não foi possível iniciar a gravação da tela.",
          variant: "destructive",
        });
      }
    }
  }, [onCapture, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleScreenshot}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Capturar tela</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${isRecording ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <VideoOff className="h-4 w-4" />
            ) : (
              <Video className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isRecording ? "Parar gravação" : "Gravar tela"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
