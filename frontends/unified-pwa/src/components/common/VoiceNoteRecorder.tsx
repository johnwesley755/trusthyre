import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, RotateCcw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { mediaService } from "../../services/media.service";

interface VoiceNoteRecorderProps {
  onAudioRecorded?: (audioUrl: string | null) => void;
  maxDurationSeconds?: number;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onAudioRecorded,
  maxDurationSeconds = 20,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Voice recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const localPreviewUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(localPreviewUrl);

        // Upload to server
        await uploadAudio(audioBlob);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone permission denied. Please allow microphone access to record.");
      } else {
        setError("Failed to access microphone. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setIsUploading(true);
    setError(null);
    try {
      const extension = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `voicenote_${Date.now()}.${extension}`, { type: blob.type });
      
      const res = await mediaService.uploadMedia(file);
      const uploadedUrl = res.url;
      if (uploadedUrl) {
        setAudioUrl(uploadedUrl);
        if (onAudioRecorded) onAudioRecorded(uploadedUrl);
      } else {
        throw new Error("Could not retrieve uploaded audio URL");
      }
    } catch (err: any) {
      console.warn("Upload error, using local fallback preview:", err);
      setError("Audio saved locally. Please submit to continue.");
      // Still allow application with local blob or fallback
      if (onAudioRecorded) onAudioRecorded(audioUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const resetRecording = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setError(null);
    if (onAudioRecorded) onAudioRecorded(null);
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        console.error("Play error:", e);
        setIsPlaying(false);
      });
    }
  };

  return (
    <div className="bg-gradient-to-r from-sky-50 to-indigo-50/60 border border-sky-200/80 rounded-2xl p-4 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-sm">
            🎙️
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Voice Introduction (15s)</h4>
            <p className="text-xs text-slate-500">Employers respond 3x faster to candidates with voice notes</p>
          </div>
        </div>
        {audioUrl && !isRecording && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" /> Attached
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 my-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Recording in Progress */}
      {isRecording && (
        <div className="flex items-center justify-between bg-white dark:bg-[#121215] border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
            </span>
            <span className="text-sm font-bold text-rose-600 font-mono">
              00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:{maxDurationSeconds}
            </span>
            <span className="text-xs text-slate-500 animate-pulse">Speak clearly now...</span>
          </div>

          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" /> Stop
          </button>
        </div>
      )}

      {/* Audio Recorded Preview */}
      {!isRecording && audioUrl && (
        <div className="flex items-center justify-between bg-white dark:bg-[#121215] border border-sky-200 dark:border-sky-900/50 rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayback}
              disabled={isUploading}
              className="w-9 h-9 rounded-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center shadow-xs transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                {isUploading ? "Uploading audio note..." : "Your voice note is ready"}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                {isUploading ? "Please wait a moment" : "Click play to listen"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetRecording}
            disabled={isUploading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Redo
          </button>
        </div>
      )}

      {/* Default Idle State - Start Recording */}
      {!isRecording && !audioUrl && (
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={startRecording}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-[#121215] hover:bg-sky-50 dark:hover:bg-zinc-800 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold text-xs rounded-xl shadow-xs transition-all"
          >
            <Mic className="w-4 h-4 text-sky-600" />
            <span>Tap to Record Voice Intro (Optional)</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceNoteRecorder;

