/**
 * Self-Contained OTP Page
 *
 * Returns a complete HTML page that handles the full OTP flow:
 * 1. Generate/read device key cookie
 * 2. Send OTP code via tunnel-api.eclosion.me
 * 3. Verify code via tunnel-api.eclosion.me
 * 4. On success, POST to /.eclosion/set-session to set HttpOnly cookie
 * 5. Reload to pass through the gate
 *
 * Supports light/dark mode via prefers-color-scheme, matching Eclosion app theme.
 * All CSS/JS inline.
 */

/**
 * Generate the self-contained OTP HTML page.
 * The subdomain is embedded in the page for API calls.
 */
export function generateOtpPage(subdomain: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="color-scheme" content="light dark">
<title>Eclosion - Verify Identity</title>
<link rel="icon" type="image/svg+xml" href="https://eclosion.app/icons/icon-192.svg">
<style>
:root{--bg-page:#f5f5f4;--bg-card:#ffffff;--bg-input:#ffffff;--border:#e8e6e3;--text:#22201d;--text-muted:#5f5c59;--primary:#ff692d;--primary-hover:#eb5519;--success:#22a06b;--success-bg:rgba(34,160,107,.1);--error:#dc2626;--error-bg:rgba(220,38,38,.1);--shadow:0 8px 32px rgba(0,0,0,.08)}
@media(prefers-color-scheme:dark){:root{--bg-page:#1a1918;--bg-card:#262524;--bg-input:#1f1e1d;--border:#3d3b39;--text:#f5f5f4;--text-muted:#a8a5a0;--primary:#ff8050;--primary-hover:#ff6a30;--success:#34d399;--success-bg:rgba(34,211,153,.15);--error:#f87171;--error-bg:rgba(248,113,113,.15);--shadow:0 8px 32px rgba(0,0,0,.3)}}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg-page);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.card{background:var(--bg-card);border-radius:12px;padding:40px;max-width:400px;width:100%;box-shadow:var(--shadow);border:1px solid var(--border)}
.icon{width:64px;height:64px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
h1{color:var(--primary);font-size:24px;font-weight:700;text-align:center;margin-bottom:4px}
.sub{color:var(--text-muted);text-align:center;margin-bottom:8px;font-size:15px}
.desc{color:var(--text-muted);text-align:center;margin-bottom:24px;font-size:14px}
.btn{width:100%;padding:14px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}
.btn:hover{background:var(--primary-hover)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-link{background:none;border:none;color:var(--primary);font-size:13px;font-weight:500;cursor:pointer;padding:4px;transition:opacity .15s}
.btn-link:disabled{opacity:.5;cursor:not-allowed}
.email-input{width:100%;padding:14px;background:var(--bg-input);border:2px solid var(--border);border-radius:8px;font-size:15px;color:var(--text);outline:none;transition:border-color .15s;margin-bottom:12px;font-family:inherit}
.email-input:focus{border-color:var(--primary)}
.email-input::placeholder{color:var(--text-muted)}
.digits{position:relative;display:flex;gap:8px;justify-content:center;margin-bottom:24px;cursor:text}
.digits-input{position:absolute;inset:0;opacity:0;font-size:24px;font-family:'SF Mono','Fira Code',monospace;letter-spacing:1em;z-index:1}
.slot{width:48px;height:56px;background:var(--bg-input);border:2px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:var(--text);font-family:'SF Mono','Fira Code',monospace;transition:border-color .15s}
.slot.active{border-color:var(--primary)}
.slot.err{border-color:var(--error)}
.slot .caret{width:2px;height:28px;background:var(--text);animation:blink 1s step-end infinite}
@keyframes blink{50%{opacity:0}}
.msg{text-align:center;padding:10px;border-radius:8px;font-size:13px;margin-bottom:16px}
.msg-ok{background:var(--success-bg);color:var(--success)}
.msg-err{background:var(--error-bg);color:var(--error)}
.msg-info{color:var(--text-muted)}
.spin{display:inline-block;width:18px;height:18px;border:2px solid var(--primary);border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:8px}
@keyframes spin{to{transform:rotate(360deg)}}
.hidden{display:none}
.success-icon{width:48px;height:48px;margin:0 auto 12px}
@media(max-width:440px){.card{padding:24px 20px}.slot{width:40px;height:48px;font-size:20px}}
</style>
</head>
<body>
<div class="card">
<div class="icon">
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
</div>
<h1>Eclosion</h1>
<p class="sub">Remote Access</p>
<p class="desc" id="desc">Enter the email associated with your Monarch account to receive a verification code.</p>
<div id="msg" class="hidden"></div>

<!-- Initial: Email + Send Code -->
<div id="s-init">
<input type="email" class="email-input" id="emailInput" placeholder="Monarch account email" autocomplete="email" onkeydown="if(event.key==='Enter')sendCode()">
<button class="btn" id="sendBtn" onclick="sendCode()">Send Verification Code</button>
</div>

<!-- Sending spinner -->
<div id="s-sending" class="hidden" style="text-align:center;padding:14px">
<span class="spin"></span><span style="color:var(--text-muted)">Sending code...</span>
</div>

<!-- Code entry -->
<div id="s-code" class="hidden">
<p style="text-align:center;margin-bottom:4px;font-size:14px;color:var(--text-muted)">Code sent to</p>
<p style="text-align:center;margin-bottom:16px;font-size:15px;font-weight:600;color:var(--text)" id="emailDisplay"></p>
<div class="digits" id="digits"></div>
<div id="s-verify-spinner" class="hidden" style="text-align:center;padding:8px;margin-bottom:16px">
<span class="spin"></span><span style="color:var(--text-muted)">Verifying...</span>
</div>
<div style="display:flex;justify-content:center;gap:16px">
<button class="btn-link" id="changeEmailBtn" onclick="goBack()">Change email</button>
<button class="btn-link" id="resendBtn" onclick="sendCode()" disabled>Resend code</button>
</div>
</div>

<!-- Success -->
<div id="s-success" class="hidden" style="text-align:center;padding:16px">
<svg class="success-icon" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<p style="color:var(--text);font-weight:500">Verified</p>
</div>
</div>

<script>
(function(){
var API='https://tunnel-api.eclosion.me';
var SUB='${subdomain}';
var cooldown=0,timer=null,savedEmail='';

// Device key: stored in cookie (not HttpOnly, so JS can read it)
function getDeviceKey(){
  var m=document.cookie.match(/(?:^|;\\s*)eclosion-device=([^;]+)/);
  if(m)return m[1];
  var k=randomHex(32);
  document.cookie='eclosion-device='+k+';Secure;SameSite=Lax;Path=/;Max-Age=31536000';
  return k;
}

function randomHex(bytes){
  var a=new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a).map(function(b){return b.toString(16).padStart(2,'0')}).join('');
}

async function hashKey(key){
  var enc=new TextEncoder().encode(key);
  var buf=await crypto.subtle.digest('SHA-256',enc);
  return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0')}).join('');
}

function show(id){
  ['s-init','s-sending','s-code','s-success'].forEach(function(s){
    document.getElementById(s).classList.add('hidden');
  });
  var desc=document.getElementById('desc');
  if(id==='s-init')desc.classList.remove('hidden');
  else desc.classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
}

function showMsg(text,type){
  var el=document.getElementById('msg');
  el.className='msg msg-'+type;
  el.textContent=text;
  el.classList.remove('hidden');
}

function hideMsg(){
  document.getElementById('msg').classList.add('hidden');
}

function startButtonCooldown(btnId,seconds,label){
  cooldown=seconds;
  var btn=document.getElementById(btnId);
  btn.disabled=true;
  btn.textContent=label+' in '+cooldown+'s';
  if(timer)clearInterval(timer);
  timer=setInterval(function(){
    cooldown--;
    if(cooldown<=0){
      clearInterval(timer);
      btn.disabled=false;
      btn.textContent=label;
    }else{
      btn.textContent=label+' in '+cooldown+'s';
    }
  },1000);
}

function buildDigits(){
  var container=document.getElementById('digits');
  container.innerHTML='';
  // Single hidden input — handles all typing, paste, and autofill natively
  var inp=document.createElement('input');
  inp.type='text';inp.inputMode='numeric';inp.pattern='[0-9]*';inp.maxLength=6;
  inp.className='digits-input';inp.autocomplete='one-time-code';inp.id='otpInput';
  inp.setAttribute('aria-label','Verification code');
  inp.addEventListener('input',onInput);
  container.appendChild(inp);
  // Visual slot divs
  for(var i=0;i<6;i++){
    var slot=document.createElement('div');
    slot.className='slot';
    slot.dataset.idx=String(i);
    container.appendChild(slot);
  }
  // Clicking anywhere in the container focuses the input
  container.addEventListener('click',function(){inp.focus();});
  inp.addEventListener('focus',renderSlots);
  inp.addEventListener('blur',renderSlots);
}

function onInput(){
  var inp=document.getElementById('otpInput');
  // Strip non-digits, enforce max 6
  var val=inp.value.replace(/\\D/g,'').slice(0,6);
  inp.value=val;
  renderSlots();
  if(val.length===6)verifyCode(val);
}

function renderSlots(){
  var inp=document.getElementById('otpInput');
  if(!inp)return;
  var val=inp.value;
  var focused=document.activeElement===inp;
  var slots=document.querySelectorAll('.slot');
  slots.forEach(function(slot,i){
    var hasErr=slot.classList.contains('err');
    slot.className='slot'+(hasErr?' err':'');
    if(val[i]){
      slot.textContent=val[i];
    }else if(focused&&i===val.length){
      // Active slot with blinking caret
      slot.textContent='';
      slot.classList.add('active');
      var caret=document.createElement('div');
      caret.className='caret';
      slot.appendChild(caret);
    }else{
      slot.textContent='';
    }
  });
}

function getCode(){
  var inp=document.getElementById('otpInput');
  return inp?inp.value:'';
}

function setDigitsError(on){
  document.querySelectorAll('.slot').forEach(function(slot){
    if(on)slot.classList.add('err');
    else slot.classList.remove('err');
  });
}

function clearDigits(){
  var inp=document.getElementById('otpInput');
  if(inp){inp.value='';inp.disabled=false;inp.focus();}
  setDigitsError(false);
  renderSlots();
}

window.goBack=function(){
  savedEmail='';
  hideMsg();
  if(timer)clearInterval(timer);
  show('s-init');
  document.getElementById('emailInput').focus();
};

window.sendCode=async function(){
  var isResend=!!savedEmail;
  var email=savedEmail;
  if(!email){
    var emailEl=document.getElementById('emailInput');
    email=(emailEl.value||'').trim();
    if(!email){emailEl.focus();return;}
    savedEmail=email;
  }
  hideMsg();
  show('s-sending');
  try{
    var res=await fetch(API+'/api/otp/send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subdomain:SUB,email:email})
    });
    var data=await res.json();
    if(res.status===429&&data.retryAfter){
      if(isResend){
        show('s-code');
        startButtonCooldown('resendBtn',data.retryAfter,'Resend code');
      }else{
        show('s-init');
        startButtonCooldown('sendBtn',data.retryAfter,'Send Verification Code');
      }
      return;
    }
    if(!res.ok)throw new Error(data.error||'Failed to send code');
    document.getElementById('emailDisplay').textContent=email;
    buildDigits();
    show('s-code');
    startButtonCooldown('resendBtn',60,'Resend code');
    setTimeout(function(){var el=document.getElementById('otpInput');if(el)el.focus();},100);
  }catch(err){
    show('s-init');
    showMsg(err.message,'err');
  }
};

async function verifyCode(code){
  hideMsg();
  setDigitsError(false);
  document.getElementById('s-verify-spinner').classList.remove('hidden');
  var otpInp=document.getElementById('otpInput');
  if(otpInp)otpInp.disabled=true;
  try{
    var deviceKey=getDeviceKey();
    var deviceKeyHash=await hashKey(deviceKey);
    var res=await fetch(API+'/api/otp/verify',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subdomain:SUB,code:code,deviceKeyHash:deviceKeyHash})
    });
    var data=await res.json();
    if(res.status===410||res.status===429)throw new Error(data.error||'Code expired or too many attempts');
    if(data.valid&&data.sessionToken){
      // Set the HttpOnly cookie via the gate Worker
      var setRes=await fetch('/.eclosion/set-session',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sessionToken:data.sessionToken})
      });
      if(!setRes.ok){
        var setData=await setRes.json();
        throw new Error(setData.error||'Failed to establish session');
      }
      show('s-success');
      setTimeout(function(){location.reload();},800);
    }else{
      var rem=data.attemptsRemaining||0;
      showMsg('Incorrect code. '+rem+' attempt'+(rem===1?'':'s')+' remaining.','err');
      setDigitsError(true);
      clearDigits();
      var otpEl=document.getElementById('otpInput');if(otpEl)otpEl.disabled=false;
      document.getElementById('s-verify-spinner').classList.add('hidden');
    }
  }catch(err){
    showMsg(err.message,'err');
    setDigitsError(true);
    clearDigits();
    var otpEl=document.getElementById('otpInput');if(otpEl)otpEl.disabled=false;
    document.getElementById('s-verify-spinner').classList.add('hidden');
  }
}
})();
</script>
</body>
</html>`;
}
