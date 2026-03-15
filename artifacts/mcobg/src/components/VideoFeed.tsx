import { useEffect, useRef, useState, useCallback } from "react";
import Peer from "peerjs";
import { getSocket } from "@/lib/socket";
import { Video, VideoOff, Mic, MicOff } from "lucide-react";

interface Props {
  gameId: string;
  myColor: string;
  onPeerIdReady?: (peerId: string) => void;
}

export default function VideoFeed({ gameId, myColor, onPeerIdReady }: Props) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);

  const onPeerIdReadyRef = useRef(onPeerIdReady);
  onPeerIdReadyRef.current = onPeerIdReady;

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const peer = new Peer();
        peerRef.current = peer;

        peer.on("open", (peerId) => {
          const socket = getSocket();
          socket.emit("share-peer-id", { gameId, peerId });
          onPeerIdReadyRef.current?.(peerId);
        });

        peer.on("call", (call) => {
          call.answer(stream);
          call.on("stream", (remote) => {
            if (mounted) {
              setRemoteStream(remote);
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remote;
              }
            }
          });
        });

        const socket = getSocket();
        socket.on(
          "peer-id-shared",
          (data: { peerId: string; color: string }) => {
            if (data.color !== myColor && peerRef.current) {
              const call = peerRef.current.call(data.peerId, stream);
              call.on("stream", (remote) => {
                if (mounted) {
                  setRemoteStream(remote);
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remote;
                  }
                }
              });
            }
          }
        );
      } catch {
        if (mounted) setError("Camera/mic not available");
      }
    }

    const socket = getSocket();
    init();

    return () => {
      mounted = false;
      localStream?.getTracks().forEach((t) => t.stop());
      peerRef.current?.destroy();
      socket.off("peer-id-shared");
    };
  }, [gameId, myColor]);

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setVideoEnabled((v) => !v);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setAudioEnabled((a) => !a);
    }
  };

  if (error) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {remoteStream && (
        <div className="relative w-40 h-30 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700 dark:border-gray-500">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
            Opponent
          </span>
        </div>
      )}
      {localStream && (
        <div className="relative w-32 h-24 rounded-lg overflow-hidden shadow-lg border-2 border-gray-600 dark:border-gray-400">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
          <div className="absolute bottom-1 right-1 flex gap-1">
            <button
              onClick={toggleVideo}
              className="p-1 bg-black/50 rounded text-white hover:bg-black/70"
            >
              {videoEnabled ? <Video size={12} /> : <VideoOff size={12} />}
            </button>
            <button
              onClick={toggleAudio}
              className="p-1 bg-black/50 rounded text-white hover:bg-black/70"
            >
              {audioEnabled ? <Mic size={12} /> : <MicOff size={12} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
