import { useEffect, useState, useRef } from "react";
import * as faceapi from "face-api.js";
import axios from "axios";

const Register = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const MODEL_URL =
      "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/";

    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
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
          const video: HTMLVideoElement = videoRef.current;
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
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (modelsLoaded && video && canvas) {
      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };

      canvas.width = displaySize.width;
      canvas.height = displaySize.height;

      const drawLandmarksAndInfo = async () => {
        const detections = await faceapi
          .detectAllFaces(video)
          .withFaceLandmarks()
          .withAgeAndGender();

        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );

        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.setTransform(-1, 0, 0, 1, canvas.width, 0);

        resizedDetections.forEach((detection) => {
          const { age, gender, genderProbability } = detection;
          const box = detection.detection.box;

          const drawBox = new faceapi.draw.DrawBox(box, {
            label: `${gender} (${(genderProbability * 100).toFixed(
              1
            )}%), Age: ${Math.round(age)}`,
          });
          drawBox.draw(canvas);

          faceapi.draw.drawFaceLandmarks(canvas, detection);
        });

        requestAnimationFrame(drawLandmarksAndInfo);
      };

      drawLandmarksAndInfo();
    }
  };

  useEffect(() => {
    if (modelsLoaded) detectFaceLandmarks();
  }, [modelsLoaded]);

  const registerUser = async () => {
    const video = videoRef.current;

    if (modelsLoaded && video) {
      const detection = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withAgeAndGender();

      if (detection) {
        const {age, gender} = detection;
        const faceEmbedding = Array.from(detection.descriptor);
        try {
          await axios.post("http://localhost:3000/register", {
            name,
            email,
            faceEmbedding,
            age,
            gender
          });
          alert("User registered successfully");
        } catch (error) {
          console.error("Error registering user:", error);
        }
      } else {
        console.log("No face detected");
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md relative">
      <h2 className="text-xl font-semibold mb-4 text-center">Register User</h2>
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
          onPlay={() => detectFaceLandmarks()}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 rounded-lg pointer-events-none transform scale-x-[-1]"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
          }}
        />
      </div>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
        className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full"
      />
      <button
        onClick={registerUser}
        disabled={!modelsLoaded}
        className={`w-full py-2 rounded-lg text-white ${
          modelsLoaded
            ? "bg-blue-500 hover:bg-blue-600"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        Register
      </button>
    </div>
  );
};

export default Register;
