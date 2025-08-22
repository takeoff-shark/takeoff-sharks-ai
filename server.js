import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";

dotenv.config();
const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const TRUSTED_ORIGINS = (process.env.TRUSTED_ORIGINS || "").split(",").map(s=>s.trim()).filter(Boolean);

const logsDir = path.join(process.cwd(), "logs");
if(!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const accessLogStream = fs.createWriteStream(path.join(logsDir, "requests.log"), { flags: "a" });

const app = express();
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(process.cwd(), "public")));
app.use(morgan("combined", { stream: accessLogStream }));

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null,true);
    if(TRUSTED_ORIGINS.length === 0 || TRUSTED_ORIGINS.includes(origin)) return callback(null,true);
    callback(new Error("Not allowed by CORS"));
  }
}));

app.use("/api/", rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS)||60000,
  max: Number(process.env.RATE_LIMIT_MAX)||30,
  standardHeaders:true, legacyHeaders:false
}));

app.get("/api/health",(req,res)=>res.json({ok:true,ts:Date.now()}));

app.post("/api/chat", async (req,res)=>{
  try{
    if(!OPENAI_KEY) return res.status(500).json({error:"OPENAI_API_KEY not configured"});
    const {message, history=[]}=req.body||{};
    if(!message) return res.status(400).json({error:"Missing message"});

    const systemPrompt=`You are Takeoff Sharks AI — a practical construction estimating assistant.
- Focus only on construction estimating tasks: takeoffs, BOQs, unit-rate build-ups, labor hours.
- If inputs are missing, make reasonable estimating assumptions and list them clearly.
- Use units m³, m², lm, ea; show formulas and short tables when useful.
- Keep tone professional, concise and actionable. Include URL: https://takeoffsharks.us/`;

    const messages=[
      {role:"system",content:systemPrompt},
      ...Array.isArray(history)?history.slice(-8).map(h=>({role:h.role,content:h.content})):[],
      {role:"user",content:message}
    ];

    const payload={model:"gpt-4o-mini",messages,temperature:0.25,max_tokens:900};
    const r=await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${OPENAI_KEY}`
      },
      body:JSON.stringify(payload)
    });

    if(!r.ok){
      const t=await r.text();
      console.error("OpenAI error:",t);
      return res.status(500).json({error:"OpenAI error",details:t});
    }

    const data=await r.json();
    const reply=data?.choices?.[0]?.message?.content || "No reply";

    fs.appendFileSync(path.join(logsDir,"requests.log"),`${new Date().toISOString()} | ${req.ip} | msg=${message.slice(0,80).replace(/\n/g,' ')}\n`);
    res.json({reply});
  }catch(err){
    console.error("Server error:",err);
    res.status(500).json({error:"Server error"});
  }
});

app.get("/",(req,res)=>res.sendFile(path.join(process.cwd(),"public","index.html")));

app.listen(PORT,()=>console.log(`Server running at http://localhost:${PORT}`));
