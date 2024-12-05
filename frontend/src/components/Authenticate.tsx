import { useEffect, useState, useRef } from "react";
import * as faceapi from "face-api.js";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

const Authenticate = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/";

    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    loadModels();

    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: {} })
        .then((stream) => {
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            video.play();
          }
        })
        .catch((err) => console.error("Error accessing webcam:", err));
    };

    startVideo();
  }, []);

  const detectFaceLandmarks = async () => {
    const video : HTMLVideoElement = videoRef.current;
    const canvas : HTMLCanvasElement = canvasRef.current;

    if (modelsLoaded && video && canvas) {
      const displaySize = { width: video.videoWidth, height: video.videoHeight };

      // Set canvas dimensions to match video dimensions
      canvas.width = displaySize.width;
      canvas.height = displaySize.height;

      const drawLandmarks = async () => {
        const detection = await faceapi
          .detectSingleFace(video)
          .withFaceLandmarks()
          .withFaceDescriptor();

        const resizedDetections = faceapi.resizeResults([detection], displaySize);

        const context = canvas.getContext("2d");
        context!.clearRect(0, 0, canvas.width, canvas.height);

      

        resizedDetections.forEach(detection => {
          faceapi.draw.drawFaceLandmarks(canvas, detection);
        });

        requestAnimationFrame(drawLandmarks);
      };

      drawLandmarks();
    }
  };

  useEffect(() => {
    if (modelsLoaded) detectFaceLandmarks();
  }, [modelsLoaded]);

  const handleAuthenticate = async () => {
    const video = videoRef.current;

    if (modelsLoaded && video) {
      const detection = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const faceEmbedding = Array.from(detection.descriptor);
        socket.emit("authenticate", { faceEmbedding });

        socket.on("authResult", (result) => {
          if (result.success) {
            setAuthMessage(
              "Authentication successful for user " + `${result.user}`
            );

            setTimeout(() => {
              setAuthMessage("");
            },7000);
            setIsLoggedIn(true);
          } else {
            setAuthMessage("Authentication failed. Please try again.");
            setIsLoggedIn(false);
          }
        });
      } else {
        console.log("No face detected");
      }
    } else {
      console.log("Models not yet loaded or video not accessible");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md relative">
      <h2 className="text-xl font-semibold mb-4">Authenticate User</h2>
      <div className="relative w-full">
        <video
          ref={videoRef}
          id="video"
          width="720"
          height="560"
          autoPlay
          muted
          className="rounded-lg shadow-lg mb-4 transform scale-x-[-1]"
          style={{ display: "block" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 rounded-lg pointer-events-none transform scale-x-[-1]"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        />
      </div>
      <button
        onClick={handleAuthenticate}
        disabled={!modelsLoaded}
        className={`w-full py-2 rounded-lg text-white ${
          modelsLoaded
            ? "bg-green-500 hover:bg-green-600"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        {modelsLoaded ? "Authenticate" : "Loading models..."}
      </button>
      {authMessage && isLoggedIn ? (
        <p className="mt-4 text-lg text-green-600">{authMessage}</p>
      ) : (
        <p className="mt-4 text-lg text-red-600">{authMessage}</p>
      )}
    </div>
  );
};

export default Authenticate;
