firebase.initializeApp({apiKey:"AIzaSyAOU3BIcy8DgaZ3xoCPVoc3Qnmhniu1VBQ",authDomain:"quiz-platform-18585.firebaseapp.com",projectId:"quiz-platform-18585",storageBucket:"quiz-platform-18585.firebasestorage.app",messagingSenderId:"446597744668",appId:"1:446597744668:web:e632f18ee552809856b7d9"});
const db=firebase.firestore();
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let state={screen:'home',grade:null,difficulty:null,questions:[],answers:[],qIndex:0,userId:null,stats:null,mode:null,claudeKey:localStorage.getItem('claudeKey')||null};
let olympiadQuestions={Easy:[],Normal:[],Hard:[]};
const grades=['Kelas 4','Kelas 5'];
const diffs=['Easy','Normal','Hard'];

async function loadQuestionsFromFirebase(){try{const doc=await db.collection('olympiad_questions').doc('all').get();if(doc.exists){const data=doc.data();olympiadQuestions={Easy:data.easy||[],Normal:data.normal||[],Hard:data.hard||[]};console.log('✅ Loaded questions from Firebase');}}catch(e){console.log('Load error:',e);}}

function initUser(){let id=localStorage.getItem('uid');if(!id){id='u_'+Math.random().toString(36).substr(2,9);localStorage.setItem('uid',id);}state.userId=id;loadStats();}
async function loadStats(){try{const d=await db.collection('users').doc(state.userId).get();state.stats=d.exists?d.data():{totalAttempts:0,averageScore:0,totalScore:0,byDiff:{Easy:[],Normal:[],Hard:[]}};}catch(e){console.log(e);}}

function render(){const app=document.getElementById('app');if(state.screen==='home')renderHome(app);else if(state.screen==='apiKey')renderApiKey(app);else if(state.screen==='sourceSelect')renderSourceSelect(app);else if(state.screen==='uploadPDF')renderUploadPDF(app);else if(state.screen==='grade')renderGrade(app);else if(state.screen==='diff')renderDiff(app);else if(state.screen==='quiz')renderQuiz(app);else if(state.screen==='results')renderResults(app);else if(state.screen==='analytics')renderAnalytics(app);}

function renderHome(app){app.innerHTML=`<div class="header"><h1>🏆 Quiz</h1><p>Persiapan Olimpiade Bahasa Inggris</p></div><div class="screen active" style="max-width:600px;margin:0 auto;"><button class="action-btn" onclick="goSourceSelect()"><div class="btn-icon">📚</div><div class="btn-text">Mulai Quiz</div></button><button class="action-btn" onclick="goAnalytics()"><div class="btn-icon">📊</div><div class="btn-text">Lihat Analisis</div></button></div>`;}

function renderApiKey(app){app.innerHTML=`<div class="header"><h1>🔑 API Key</h1></div><div class="screen active" style="max-width:600px;margin:0 auto;"><div class="analytics-card"><p>Masukkan Claude API Key untuk PDF upload.</p><input type="password" id="apiKeyInput" placeholder="sk-ant-..." style="width:100%;padding:12px;border:2px solid #ddd;border-radius:8px;margin-bottom:15px;"><button class="start-btn" onclick="saveApiKey()">Simpan</button></div><button class="back-btn" onclick="goHome()">← Kembali</button></div>`;}

function renderSourceSelect(app){app.innerHTML=`<div class="header"><h1>📚 Pilih Sumber</h1></div><div class="screen active" style="max-width:600px;margin:0 auto;"><button class="action-btn" onclick="goUploadPDF()"><div class="btn-icon">📤</div><div class="btn-text">Upload PDF</div></button><button class="action-btn" onclick="goOlimpiad()"><div class="btn-icon">🏆</div><div class="btn-text">Soal Olimpiade</div></button><button class="back-btn" onclick="goHome()">← Kembali</button></div>`;}

function renderUploadPDF(app){if(!state.claudeKey){app.innerHTML=`<div class="header"><h1>⚠️ API Key Diperlukan</h1></div><div class="screen active" style="max-width:600px;margin:0 auto;"><button class="start-btn" onclick="goApiKeySetup()">Setup API Key</button><button class="back-btn" onclick="goSourceSelect()">← Kembali</button></div>`;return;}app.innerHTML=`<div class="header"><h1>📤 Upload PDF</h1></div><div class="screen active" style="max-width:600px;margin:0 auto;"><div class="upload-box"><div style="font-size:3rem;">📄</div><button class="upload-btn" onclick="triggerUpload()">Pilih File PDF</button></div><div id="uploadStatus" style="display:none;"><div class="loading-spinner"></div><p>Memproses...</p></div><button class="back-btn" onclick="goSourceSelect()">← Kembali</button></div>`;document.getElementById('pdfInput').onchange=async(e)=>{const file=e.target.files[0];if(file)await processPDF(file);};}

function renderGrade(app){app.innerHTML=`<div class="header"><h1>📚 Pilih Kelas</h1></div><div class="screen active"><div class="grade-grid">${grades.map(g=>`<button class="grade-btn ${state.grade===g?'active':''}" onclick="selectGrade('${g}')">${g}</button>`).join('')}</div>${state.grade?`<button class="start-btn" onclick="goDiff()">Lanjutkan →</button>`:''}<button class="back-btn" onclick="goSourceSelect()">← Kembali</button></div>`;}

function renderDiff(app){app.innerHTML=`<div class="header"><h1>⚡ Pilih Level</h1><p>${state.grade}</p></div><div class="screen active"><div class="difficulty-grid">${diffs.map(d=>`<button class="difficulty-btn ${state.difficulty===d?'active':''}" onclick="selectDiff('${d}')"><div class="difficulty-emoji">${d==='Easy'?'🟢':d==='Normal'?'🟡':'🔴'}</div>${d}</button>`).join('')}</div>${state.difficulty?`<button class="start-btn" onclick="startOlympiadQuiz()">🚀 Mulai Quiz</button>`:''}<button class="back-btn" onclick="goGrade()">← Kembali</button></div>`;}

function renderQuiz(app){if(!state.questions||state.questions.length===0){app.innerHTML=`<div class="screen active">Error: No questions</div>`;return;}const q=state.questions[state.qIndex];if(!q){app.innerHTML=`<div class="screen active">Error: Question ${state.qIndex+1} not found</div>`;return;}const ans=state.answers[state.qIndex];app.innerHTML=`<div id="quizScreen"><div class="quiz-header"><div class="quiz-title">${state.grade||'Quiz'} - ${state.difficulty}</div><div class="quiz-progress">Soal ${state.qIndex+1}/${state.questions.length}</div></div><div class="question-box"><div class="question-text">${state.qIndex+1}. ${q.q}</div></div><div class="options">${q.o.map((o,i)=>`<button class="option ${ans===i?'selected':''}" onclick="selectAns(${i})">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}</div><div class="quiz-controls"><button class="btn-prev" onclick="prevQ()" ${state.qIndex===0?'disabled':''}>← Sebelumnya</button><button class="btn-next" onclick="nextQ()" ${ans===undefined?'disabled':''}>${state.qIndex===state.questions.length-1?'Selesai ✓':'Berikutnya →'}</button></div></div>`;}

function renderResults(app){const correct=state.answers.filter((a,i)=>state.questions[i]&&state.questions[i].a===a).length;const pct=Math.round((correct/state.questions.length)*100);const pass=pct>=80;app.innerHTML=`<div class="header"><h1>🏆 Hasil Quiz</h1></div><div id="resultsScreen"><div class="results-header"><div class="results-emoji">${pct===100?'🎉':pass?'😄':'💭'}</div><div class="results-status ${pass?'pass':'fail'}">${pass?'✅ LULUS':'❌ BELUM LULUS'}</div></div><div style="text-align:center;margin:30px 0;"><div class="score-display">${correct}<span>/${state.questions.length}</span></div><div style="font-size:1.3rem;color:#FF6B6B;font-weight:bold;">${pct}%</div></div><div class="results-actions"><button class="btn-review" onclick="goHome()">🏠 Beranda</button><button class="btn-restart" onclick="restartQuiz()">🔄 Ulangi</button></div></div>`;saveAttempt(correct,pct);}

function renderAnalytics(app){const s=state.stats;app.innerHTML=`<div class="header"><h1>📊 Analisis</h1></div><div id="analyticsScreen"><div style="max-width:600px;margin:0 auto;"><div class="analytics-card"><div class="analytics-title">📈 Total: ${s.totalAttempts}</div><div class="analytics-title">Rata-rata: ${s.averageScore.toFixed(1)}%</div></div></div><button class="back-btn" onclick="goHome()">← Kembali</button></div>`;}

function goHome(){state.screen='home';state.grade=null;state.difficulty=null;state.questions=[];state.answers=[];state.mode=null;render();}
function goSourceSelect(){state.screen='sourceSelect';render();}
function goApiKeySetup(){state.screen='apiKey';render();}
function goUploadPDF(){state.screen='uploadPDF';state.mode='upload';render();}
function goOlimpiad(){state.screen='grade';state.mode='olympiad';render();}
function goGrade(){state.screen='grade';render();}
function goDiff(){state.screen='diff';render();}
function goAnalytics(){state.screen='analytics';render();}
function selectGrade(g){state.grade=g;render();}
function selectDiff(d){state.difficulty=d;render();}
function selectAns(i){state.answers[state.qIndex]=i;render();}
function nextQ(){if(state.qIndex<state.questions.length-1){state.qIndex++;render();}else{state.screen='results';render();}}
function prevQ(){if(state.qIndex>0){state.qIndex--;render();}}
function restartQuiz(){state.questions=[];state.answers=[];state.qIndex=0;state.grade=null;state.difficulty=null;state.mode=null;goSourceSelect();}
function triggerUpload(){document.getElementById('pdfInput').click();}
function saveApiKey(){const key=document.getElementById('apiKeyInput').value.trim();if(!key)return;localStorage.setItem('claudeKey',key);state.claudeKey=key;goHome();}

function startOlympiadQuiz(){if(!state.grade||!state.difficulty)return;const bank=olympiadQuestions[state.difficulty];if(!bank||bank.length===0){alert('No questions available. Run setup first!');return;}const shuffled=[...bank].sort(()=>Math.random()-0.5);state.questions=shuffled;state.answers=new Array(shuffled.length).fill(undefined);state.qIndex=0;state.screen='quiz';render();}

async function processPDF(file){const status=document.getElementById('uploadStatus');status.style.display='block';try{const ab=await file.arrayBuffer();const pdf=await pdfjsLib.getDocument({data:ab}).promise;let text='';for(let i=1;i<=Math.min(pdf.numPages,5);i++){const p=await pdf.getPage(i);const tc=await p.getTextContent();text+=tc.items.map(it=>it.str).join(' ')+'\n';}await generateWithClaude(text);}catch(e){alert('Error');status.style.display='none';}}

async function generateWithClaude(text){try{const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:3000,messages:[{role:'user',content:`Generate 30 English quiz questions. JSON only: [{"q":"question","o":["A","B","C","D"],"a":0},...]TEXT:${text.substring(0,2000)}`}]})});const data=await response.json();let jsonText=data.content[0].text;jsonText=jsonText.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();const qs=JSON.parse(jsonText);if(Array.isArray(qs)&&qs.length>0){state.questions=qs.slice(0,30);state.answers=new Array(30).fill(undefined);state.qIndex=0;state.screen='quiz';render();}}catch(e){alert('Error: '+e.message);}}

async function saveAttempt(score,pct){try{const attempt={grade:state.grade||'Upload',difficulty:state.difficulty,score:score,percentage:pct,timestamp:new Date(),mode:state.mode};await db.collection('users').doc(state.userId).collection('attempts').add(attempt);const ns=state.stats;ns.totalAttempts=(ns.totalAttempts||0)+1;ns.totalScore=(ns.totalScore||0)+pct;ns.averageScore=ns.totalScore/ns.totalAttempts;if(!ns.byDiff[state.difficulty]){ns.byDiff[state.difficulty]=[];}ns.byDiff[state.difficulty].push(pct);await db.collection('users').doc(state.userId).set(ns);state.stats=ns;}catch(e){console.log(e);}}

document.addEventListener('DOMContentLoaded',async()=>{await loadQuestionsFromFirebase();initUser();render();});
