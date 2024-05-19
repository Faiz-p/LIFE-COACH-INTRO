import { exec } from "child_process";
import cors from "cors";
import express from "express";
import { promises as fs } from "fs";
import http from "http";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

const server = http.createServer(app);

// Define the introduction message action
const sendIntroduction = async (res) => {
  const name = "Wilson";
  const text = `Hi ${name}, I’m Sophia, your explorer and companion, Are you ready to be guided through exciting adventures and opportunities?  Whether you're exploring new horizons or planning your next big move, I'm here with you every step of the way? lets find your unique path and unlock endless possibilities together! `;
  const fileName = "output_0";

  try {
    // Generate audio file from the introduction text
    await generateAudioFile(text, fileName, "Samantha");

    const inputFileAIFF = `audios/${fileName}.aiff`;
    const outputFileWAV = `audios/${fileName}.wav`;
    const outputFileJSON = `audios/${fileName}.json`;

    // Convert audio to WAV
    await convertAIFFtoWAV(inputFileAIFF, outputFileWAV);

    // Generate lip sync JSON after both audio and WAV conversion are completed
    await convertWAVtoLipSyncJSON(outputFileWAV, outputFileJSON);

    // Send response with audio and lip sync data if res is defined
    if (res) {
      const audioData = await audioFileToBase64(outputFileWAV);
      const lipsyncData = await readJsonTranscript(outputFileJSON);

      res.send({
        messages: [
          {
            audio: audioData,
            lipsync: lipsyncData,
            facialExpression: "smile",
            animation: "Talking_2",
          }
        ]
      });

      console.log("Introduction message sent successfully.");
    } else {
      console.log("Introduction message not sent: No response object provided.");
    }
  } catch (error) {
    console.error("Error sending introduction message:", error);
    if (res) {
      res.status(500).send("Internal Server Error");
    }
  } finally {
    // Delete temporary files
    await deleteFiles([
      `${fileName}.wav`,
      `${fileName}.json`,
      `${fileName}.aiff`
    ]);
    console.log("Temporary files deleted successfully.");
  }
};


const generateAudioFile = async (text, fileName, voice = "Samantha") => {
  return new Promise((resolve, reject) => {
    exec(`say -v ${voice} -o audios/${fileName}.aiff ${text}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const convertAIFFtoWAV = async (inputFile, outputFile) => {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i ${inputFile} ${outputFile}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const convertWAVtoLipSyncJSON = async (inputFile, outputFile) => {
  return new Promise((resolve, reject) => {
    exec(`./bin/rhubarb -f json -o ${outputFile} ${inputFile} -r phonetic`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const deleteFiles = async (files) => {
  await Promise.all(files.map(async (file) => {
    try {
      await fs.unlink(`audios/${file}`);
      console.log(`File audios/${file} deleted successfully.`);
    } catch (error) {
      console.error(`Error deleting file audios/${file}:`, error);
    }
  }));
};

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

// POST request handler for /chat endpoint
app.post("/chat", async (req, res) => {
  // If no message is provided, send the introduction message
  await sendIntroduction(res);
});

// Automatically send introduction message when server starts up
server.listen(port, async () => {
  console.log(`Your project is listening on port ${port}`);
  await sendIntroduction();
});
