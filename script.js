const PRICES={single:650,double:950,suite:1500};
let lang='fr';
const $=id=>document.getElementById(id);
const STR={
  fr:{invalid:'Dates invalides',valid:'Choisir des dates valides',avail:(n,t)=>`Disponible ! ${n} nuit(s) = ${t} MAD — Réservez ci-dessous`,thanks:(n,id,t)=>`Merci ${n} ! Réservation #${id} reçue (${t} MAD). Confirmation sous 2h.`,sent:'Message envoyé ! On vous répond vite.',night:(n,p)=>`${n} nuit(s) × ${p} MAD`},
  en:{invalid:'Invalid dates',valid:'Choose valid dates',avail:(n,t)=>`Available! ${n} night(s) = ${t} MAD — Book below`,thanks:(n,id,t)=>`Thank you ${n}! Booking #${id} received (${t} MAD). Confirmation within 2h.`,sent:'Message sent! We reply soon.',night:(n,p)=>`${n} night(s) × ${p} MAD`},
  ar:{invalid:'تواريخ غير صحيحة',valid:'اختار تواريخ صحيحة',avail:(n,t)=>`متوفر! ${n} ليلة = ${t} درهم — حجز لتحت`,thanks:(n,id,t)=>`شكراً ${n}! الحجز #${id} توصلنا به (${t} درهم). التأكيد في أقل من ساعتين.`,sent:'توصلنا بالرسالة! نجاوبوك قريب.',night:(n,p)=>`${n} ليلة × ${p} درهم`}
};

function setLang(l){
  lang=l;
  document.querySelectorAll('[data-fr]').forEach(el=>{
    const v = l==='fr'? el.dataset.fr : l==='en'? el.dataset.en : (el.dataset.ar||el.dataset.fr);
    if(v) el.textContent=v;
  });
  document.querySelectorAll('.lang-btn').forEach(b=>b.classList.toggle('active',b.dataset.lang===l));
  document.documentElement.lang=l;
  document.documentElement.dir = l==='ar' ? 'rtl' : 'ltr';
  document.body.style.fontFamily = l==='ar' ? "'Cairo','Inter',sans-serif" : "'Inter',sans-serif";
  localStorage.setItem('exc_lang',l);
  updatePrice();
}
document.querySelectorAll('.lang-btn').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));
setLang(localStorage.getItem('exc_lang')||'fr');

// Burger
$('burger')?.addEventListener('click',()=>$('nav').classList.toggle('open'));

// Dates min = aujourd'hui
const today=new Date().toISOString().split('T')[0];
['qIn','qOut','fIn','fOut'].forEach(id=>{const e=$(id); if(e) e.min=today;});

function nights(a,b){return Math.max(0,Math.round((new Date(b)-new Date(a))/86400000));}
function updatePrice(){
  const box=$('priceSim'); if(!box) return;
  const r=$('fRoom').value, a=$('fIn').value, b=$('fOut').value;
  if(!a||!b){box.textContent='— MAD';return;}
  const n=nights(a,b);
  if(n<=0){box.textContent=STR[lang].invalid;return;}
  let total=n*PRICES[r];
  const code=$('fCode').value.trim().toUpperCase();
  if(code==='EXCEL10') total=Math.round(total*0.9);
  box.textContent=`${STR[lang].night(n,PRICES[r])} = ${total} MAD`+(code==='EXCEL10'?' (-10%)':'');
}
['fRoom','fIn','fOut','fCode'].forEach(id=>$(id)?.addEventListener('input',updatePrice));

// Quick search
$('quickSearch')?.addEventListener('submit',e=>{
  e.preventDefault();
  const a=$('qIn').value,b=$('qOut').value,r=$('qRoom').value;
  const n=nights(a,b);
  const msg=$('quickResult');
  if(!a||!b||n<=0){msg.textContent=STR[lang].valid;return;}
  const total=n*PRICES[r];
  msg.textContent=STR[lang].avail(n,total);
  $('fIn').value=a;$('fOut').value=b;$('fRoom').value=r;updatePrice();
  document.querySelector('#reservation').scrollIntoView({behavior:'smooth'});
});

document.querySelectorAll('.pick-room').forEach(btn=>{
  btn.addEventListener('click',()=>{
    $('fRoom').value=btn.dataset.room; updatePrice();
    document.querySelector('#reservation').scrollIntoView({behavior:'smooth'});
  });
});

$('bookForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const a=$('fIn').value,b=$('fOut').value;
  const n=nights(a,b);
  if(n<=0){alert(STR[lang].invalid);return;}
  const total=n*PRICES[$('fRoom').value];
  const r={name:$('fName').value,phone:$('fPhone').value,email:$('fEmail').value,room:$('fRoom').value,in:a,out:b,guests:$('fGuests').value,msg:$('fMsg').value,total};
  // 1) Serveur (online/local) — reservation twsel l admin
  try{
    const res=await fetch('/api/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r)});
    const j=await res.json();
    if(j.ok){
      $('bookOk').textContent=STR[lang].thanks(r.name,String(j.reservation.id).slice(-5),total);
      e.target.reset(); updatePrice(); return;
    }
    throw 0;
  }catch(err){
    // 2) Fallback local (serveur tafya) — ttssjjel f navigateur
    const all=JSON.parse(localStorage.getItem('excelsior_reservations')||'[]');
    const loc={...r,id:Date.now(),status:'En attente',created:new Date().toLocaleString()};
    all.push(loc);
    localStorage.setItem('excelsior_reservations',JSON.stringify(all));
    $('bookOk').textContent=STR[lang].thanks(r.name,String(loc.id).slice(-5),total);
    e.target.reset(); updatePrice();
  }
});

$('contactForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  $('contactOk').textContent=STR[lang].sent;
  e.target.reset();
});
