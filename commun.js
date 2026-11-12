/* Barre de navigation Android : en application installée (plein écran), elle recouvre parfois le bas de la page sans que le navigateur
   déclare de marge de sécurité. On réserve alors une marge de 48 px en bas (variable CSS --nav-extra) pour que les boutons restent atteignables. */
(function(){try{const m=q=>matchMedia(q).matches,plein=m("(display-mode: standalone)")||m("(display-mode: fullscreen)")||m("(display-mode: minimal-ui)")||navigator.standalone===true;
 if(plein&&/Android/i.test(navigator.userAgent))document.documentElement.style.setProperty("--nav-extra","48px")}catch(e){}})();
/* Socle commun 11Barré (application client et espace chauffeur/livreur) : utilitaires, lieux de démonstration, carte schématique. */
const $=s=>document.querySelector(s),esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const F=n=>Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F";
const LS={get(k,d){try{const v=localStorage.getItem("onzebarre_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("onzebarre_"+k,JSON.stringify(v))}catch(e){}}};
const r50=n=>Math.round(n/50)*50,hh=m=>{const d=new Date(Date.now()+m*60000);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h};
const km=(a,b)=>{const R=6371,t=x=>x*Math.PI/180,dl=t(b.la-a.la),dn=t(b.lo-a.lo),q=Math.sin(dl/2)**2+Math.cos(t(a.la))*Math.cos(t(b.la))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(q))};
/* Lieux de démonstration (Grand Abidjan), coordonnées approximatives */
const LIEUX=[["Ma position (démo)","Cocody Angré",5.3920,-3.9880],["Plateau","Abidjan",5.3197,-4.0197],["Cocody Angré","Cocody",5.3920,-3.9880],["Cocody Riviera Palmeraie","Cocody",5.3780,-3.9500],["Cocody Deux-Plateaux","Cocody",5.3700,-4.0000],["Marcory Zone 4","Marcory",5.3030,-3.9800],["Treichville","Abidjan",5.2930,-4.0050],["Adjamé","Abidjan",5.3600,-4.0230],["Koumassi","Abidjan",5.2970,-3.9500],["Attécoubé","Abidjan",5.3380,-4.0480],["Abobo Gare","Abobo",5.4160,-4.0200],["Yopougon Siporex","Yopougon",5.3400,-4.0800],["Yopougon Niangon","Yopougon",5.3250,-4.1000],["Port-Bouët Aéroport","Port-Bouët",5.2610,-3.9260],["Bingerville","Bingerville",5.3550,-3.8900],["Anyama","Anyama",5.4950,-4.0520],["Songon Dagbé","Songon",5.3300,-4.2400],["Songon Kassemblé","Songon",5.3250,-4.2550],["Dabou","Dabou",5.3250,-4.3770],["Grand-Bassam","Grand-Bassam",5.2000,-3.7400]].map(a=>({n:a[0],z:a[1],la:a[2],lo:a[3]}));
/* Livraisons créées depuis le portail fournisseur : liste partagée avec l'espace chauffeur (stockage local). */
const LIV={lire(){return LS.get("livraisons",[])},ecrire(l){LS.set("livraisons",l)},maj(id,f){const l=LIV.lire(),o=l.find(x=>x.id===id);if(!o)return null;f(o);LIV.ecrire(l);return o}};
/* Collections partagées entre le portail fournisseur, l'espace livreur et l'administration (stockage local) */
const Coll=cle=>{const c={liste(){return LS.get(cle,[])},get(id){return c.liste().find(x=>x.id===id)||null},ajouter(o){const l=c.liste();l.push(o);LS.set(cle,l);return o},maj(id,f){const l=c.liste(),o=l.find(x=>x.id===id);if(!o)return null;f(o);LS.set(cle,l);return o}};return c};
const ORGS=Coll("orgs"),LIVREURS=Coll("livreurs"),VERS=Coll("versements"),INCID=Coll("incidents"),AUDIT=Coll("audit"),REVERS=Coll("reversements");
/** Journal d'audit : on n'ajoute jamais de modification ni de suppression ; auteur, date, motif, valeurs avant/après. */
const auditer=(acteur,action,entite,ref,avant,apres,motif)=>AUDIT.ajouter({id:"au"+Date.now().toString(36)+Math.floor(Math.random()*1e5).toString(36),at:Date.now(),acteur:acteur.nom,role:acteur.role,action,entite,ref,avant:avant==null?null:avant,apres:apres==null?null:apres,motif:motif||""});
const lieu=n=>LIEUX.find(l=>l.n===n);
/* Carte schématique (aucune tuile externe : fonctionne hors ligne) */
let W=360,H=470;
function proj(a,b){const cx=(a.lo+b.lo)/2,cy=(a.la+b.la)/2,sx=Math.max(Math.abs(a.lo-b.lo),.03),sy=Math.max(Math.abs(a.la-b.la),.03*H/W),k=Math.min((W-110)/sx,(H-140)/sy);return l=>[W/2+(l.lo-cx)*k,H/2-(l.la-cy)*k+14]}
const along=(pts,f)=>{const L=[];let t=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);L.push(d);t+=d}let x=Math.max(0,Math.min(1,f))*t;for(let i=0;i<L.length;i++){if(x<=L[i]||i===L.length-1){const u=L[i]?x/L[i]:1,a=pts[i],b=pts[i+1];return{x:a[0]+(b[0]-a[0])*u,y:a[1]+(b[1]-a[1])*u,ang:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI}}x-=L[i]}return{x:pts[0][0],y:pts[0][1],ang:0}};
const fond=()=>`<rect width="${W}" height="${H}" fill="var(--land)"/><g transform="scale(${W/360} ${H/470})"><path d="M-10 330C60 300 110 380 190 360S320 300 380 340V480H-10z" fill="var(--water)"/><g stroke="var(--road)" stroke-width="7" fill="none" stroke-linecap="round"><path d="M-10 90H380M-10 210H380M60 -10V300M190 -10V340M300 -10V330"/></g><g stroke="var(--road)" stroke-width="3" fill="none"><path d="M-10 150H380M-10 270H380M125 -10V320M245 -10V320"/></g></g>`;
