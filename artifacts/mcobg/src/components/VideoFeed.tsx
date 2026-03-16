import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import type { MediaConnection } from "peerjs";
import { getSocket } from "@/lib/socket";
import { Video, VideoOff, Mic, MicOff, X, Loader2 } from "lucide-react";

interface Props {
  gameId: string;
  myColor: string;
}

type Status = "idle" | "connecting" | "active" | "error";

export default function VideoFeed({ gameId, myColor }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const opponentPeerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const wireCall = (call: MediaConnection) => {
    call.on("stream", (remote: MediaStream) => setRemoteStream(remote));
    call.on("close", () => setRemoteStream(null));
    call.on("error", () => setRemoteStream(null));
  };

  const makeCall = (peerId: string, stream: MediaStream) => {
    if (!peerRef.current) return;
    wireCall(peerRef.current.call(peerId, stream));
  };

  // Always listen for opponent peer IDs — even before we start streaming,
  // so we cache the ID and call immediately when we do start.
  useEffect(() => {
    const socket = getSocket();
    const onPeerShared = (data: { peerId: string; color: string }) => {
      if (data.color !== myColor) {
        opponentPeerIdRef.current = data.peerId;
        if (peerRef.current && localStreamRef.current) {
          makeCall(data.peerId, localStreamRef.current);
        }
      }
    };
    socket.on("peer-id-shared", onPeerShared);
    return () => { socket.off("peer-id-shared", onPeerShared); };
  }, [myColor]);

  // Stop tracks and destroy peer on unmount.
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.destroy();
    };
  }, []);

  const startVideo = async () => {
    setStatus("connecting");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const peer = new Peer();
      peerRef.current = peer;

      peer.on("open", (peerId) => {
        getSocket().emit("share-peer-id", { gameId, peerId });
        setStatus("active");
        if (opponentPeerIdRef.current) {
          makeCall(opponentPeerIdRef.current, stream);
        }
      });

      peer.on("call", (call: MediaConnection) => {
        call.answer(stream);
        wireCall(call);
      });

      peer.on("error", () => {
        setStatus("error");
        setErrorMsg("Peer connection failed");
      });
    } catch {
      setStatus("error");
      setErrorMsg("Camera or mic not available");
    }
  };

  const stopVideo = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setVideoOn(true);
    setAudioOn(true);
    setStatus("idle");
  };

  const toggleVideoTrack = () => {
    if (!localStreamRef.current) return;
    const next = !videoOn;
    localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = next; });
    setVideoOn(next);
  };

  const toggleAudioTrack = () => {
    if (!localStreamRef.current) return;
    const next = !audioOn;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = next; });
    setAudioOn(next);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">

      {/* ── IDLE: Video button ─────────────────────────────────────────── */}
      {status === "idle" && (
        <button
          onClick={startVideo}
          className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium
            bg-[#1a1a2e] border border-[#2a2a40] text-[#c8c0b8]
            hover:bg-[#252540] hover:text-white hover:border-amber-600/50 transition-all"
        >
          <Video size={15} />
          Video
        </button>
      )}

      {/* ── CONNECTING: spinner ─────────────────────────────────────────── */}
      {status === "connecting" && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm
          bg-[#1a1a2e] border border-[#2a2a40] text-[#888]">
          <Loader2 size={15} className="animate-spin" />
          Starting…
        </div>
      )}

      {/* ── ERROR ──────────────────────────────────────────────────────── */}
      {status === "error" && (
        <div className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-full shadow-lg text-sm
          bg-red-950/60 border border-red-800/60 text-red-400">
          <VideoOff size={15} />
          <span>{errorMsg}</span>
          <button
            onClick={() => setStatus("idle")}
            title="Dismiss"
            className="ml-1 p-0.5 rounded-full hover:bg-red-800/40 text-red-400 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── ACTIVE: video feeds ─────────────────────────────────────────── */}
      {status === "active" && (
        <>
          {/* Opponent video */}
          {remoteStream ? (
            <div className="relative w-44 rounded-xl overflow-hidden shadow-xl border border-white/10">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-28 object-cover"
              />
              <span className="absolute bottom-1 left-2 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded-full">
                Opponent
              </span>
            </div>
          ) : (
            <div className="w-44 h-16 rounded-xl border border-dashed border-white/10 bg-black/20 flex items-center justify-center">
              <span className="text-[11px] text-[#555]">Waiting for opponent…</span>
            </div>
          )}

          {/* Local video + controls */}
          {localStream && (
            <div className="relative w-36 rounded-xl overflow-hidden shadow-xl border border-white/10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-24 object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <span className="absolute top-1 left-1.5 text-[10px] text-white bg-black/50 px-1 py-0.5 rounded-full">
                You
              </span>
              {/* Controls overlay */}
              <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1.5 px-2 py-1.5
                bg-gradient-to-t from-black/80 to-transparent">
                <button
                  onClick={toggleVideoTrack}
                  title={videoOn ? "Turn off camera" : "Turn on camera"}
                  className={`p-1 rounded-full transition-colors ${
                    videoOn
                      ? "bg-white/10 hover:bg-white/25 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  }`}
                >
                  {videoOn ? <Video size={11} /> : <VideoOff size={11} />}
                </button>
                <button
                  onClick={toggleAudioTrack}
                  title={audioOn ? "Mute mic" : "Unmute mic"}
                  className={`p-1 rounded-full transition-colors ${
                    audioOn
                      ? "bg-white/10 hover:bg-white/25 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  }`}
                >
                  {audioOn ? <Mic size={11} /> : <MicOff size={11} />}
                </button>
                {/* Stop button — prominent red with X */}
                <button
                  onClick={stopVideo}
                  title="Stop video"
                  className="p-1 rounded-full bg-red-700 hover:bg-red-600 text-white transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
