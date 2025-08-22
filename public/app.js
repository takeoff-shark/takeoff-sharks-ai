const messagesEl=document.getElementById("messages");
const inputEl=document.getElementById("input");
const sendBtn=document.getElementById("send");
const chips=document.querySelectorAll(".chip");
let history=[];

function renderMarkdown(md){return window.marked?marked.parse(md||""):md;}
function pushMessage(role,content){
  const el=document.createElement("div");
  el.className="msg "+(role==="user"?"user":"bot");
  el.innerHTML=`<div class="md">${renderMarkdown(content)}</div>`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop=messagesEl.scrollHeight;
}
function replaceLastBot(content){
  const bots=messagesEl.querySelectorAll(".msg.bot");
  const last=bots[bots.length-1];
  if(last) last.querySelector(".md").innerHTML=renderMarkdown(content);
}

pushMessage("bot","**Welcome to Takeoff Sharks AI** — your construction estimating assistant.");

chips.forEach(c=>{
  c.addEventListener("click",()=>{inputEl.value=c.dataset.prompt;inputEl.focus();});
});

async function sendToServer(msg){
  const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg,history})});
  if(!r.ok) throw new Error(await r.text());
  const j=await r.json();
  return j.reply;
}

let sending=false;
async function handleSend(){
  if(sending) return;
  const text=(inputEl.value||"").trim();
  if(!text) return;
  inputEl.value="";
  pushMessage("user",text);
  history.push({role:"user",content:text});
  pushMessage("bot","_Working on estimate..._");
  sending=true;
  try{
    const reply=await sendToServer(text);
    replaceLastBot(reply);
    history.push({role:"assistant",content:reply});
  }catch(err){replaceLastBot("Error: Unable to reach service.");}
  finally{sending=false;}
}

sendBtn.addEventListener("click",handleSend);
inputEl.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}});
