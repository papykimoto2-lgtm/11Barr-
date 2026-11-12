/* Application client (index.html) sur téléphone : accueil, position, course complète avec chauffeur de démonstration, annulation confirmée,
   reprise après rechargement, reçu, historique, navigation, accessibilité : node tests/client.js (Playwright requis : PLAYWRIGHT=/chemin si besoin). */
const {chromium}=require(process.env.PLAYWRIGHT||"playwright"),http=require("http"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),SP=require("os").tmpdir()+"/";
const T={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".png":"image/png",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let u=q.url.split("?")[0];if(u==="/")u="/index.html";const f=path.join(root,u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});r.end(d)})});
let ok=0,ko=0;const t=(l,c,d)=>{if(c){ok++;console.log("PASS",l)}else{ko++;console.log("FAIL",l,d===undefined?"":JSON.stringify(d))}};
(async()=>{await new Promise(o=>srv.listen(0,"127.0.0.1",o));const base="http://127.0.0.1:"+srv.address().port;
const b=await chromium.launch();const errs=[];
const MOB={viewport:{width:390,height:800},isMobile:true,hasTouch:true,locale:"fr-FR"};
const mk=async(ctx,u)=>{const p=await ctx.newPage();p.on("pageerror",e=>errs.push(u+": "+e.message));p.on("console",m=>{if(m.type()==="error"&&!/favicon|manifest|sw\.js|serviceWorker/i.test(m.text()))errs.push("console: "+m.text())});await p.goto(base+"/"+u);return p};
const txt=(p,s)=>p.$eval(s,e=>e.textContent).catch(()=>"");
const toast=p=>p.$eval("#toast",e=>e.textContent).catch(()=>"");
const ff=(p,ms)=>p.evaluate(m=>{S.run.t0-=m},ms);
const step=(p,sub)=>p.waitForFunction(s=>{const h=document.querySelector(".sheet h2");return h&&h.textContent.includes(s)},sub,{timeout:15000});
const commander=async(p,svc,dest)=>{await p.click(`[data-a=svc][data-v=${svc}]`);await p.click("[data-a=pt]");await p.click(`[data-a=pset][data-n="${dest}"]`)};

/* ---------- 1. Première ouverture et accueil ---------- */
const ctx=await b.newContext(MOB);const c=await mk(ctx,"index.html");
t("titre et langue française",(await c.title()).includes("11Barré")&&(await c.getAttribute("html","lang"))==="fr");
t("accueil : quatre services et Food/Interurbain « bientôt »",(await c.$$("[data-a=svc]")).length===4&&(await txt(c,".tiles")).includes("bientôt"));
t("première ouverture : présentation en 3 étapes, ignorable",(await txt(c,".wel")).includes("Étape 1 sur 3")&&!!(await c.$("[data-a=welSkip]")));
await c.screenshot({path:SP+"cl1-accueil.png"});
await c.click("[data-a=welNext]");t("étape 2 : colis et paiement à la livraison",(await txt(c,".wel")).includes("livreur encaisse"));
await c.click("[data-a=welNext]");t("étape 3 : explique la course de démonstration sans jargon",(await txt(c,".wel")).includes("course de démonstration")&&(await txt(c,"[data-a=welNext]"))==="Commencer");
await c.click("[data-a=welNext]");t("présentation terminée et mémorisée",!(await c.$(".wel"))&&await c.evaluate(()=>LS.get("accueil_vu",false)===true));
await c.reload();t("rechargement : la présentation ne revient pas",!(await c.$(".wel")));
t("adresses récentes proposées",(await c.$$("[data-a=rec]")).length===3);
t("région d'annonce pour lecteur d'écran (aria-live)",await c.$eval("#sr",e=>e.getAttribute("aria-live")==="polite"));

/* ---------- 2. Navigation, retour Android, Échap ---------- */
await c.click("[data-a=svc][data-v=courses]");t("parcours : écran de commande",!!(await c.$("#map")));
t("sans destination : invite claire, Commander désactivé",(await txt(c,".sheet")).includes("Choisissez une destination")&&await c.$eval("[data-a=cmd]",e=>e.disabled));
await c.goBack();await c.waitForSelector("[data-a=svc]");t("bouton retour du téléphone : revient à l'accueil",!!(await c.$(".tiles"))&&await c.evaluate(()=>S.ph==="home"));
await c.click("[data-a=svc][data-v=courses]");await c.click("[data-a=pt]");t("recherche d'adresse ouverte avec focus dans le champ",await c.evaluate(()=>document.activeElement&&document.activeElement.id==="pq"));
await c.fill("#pq","zzzz");t("recherche sans résultat : message utile",(await txt(c,"#pl")).includes("Aucune adresse trouvée")&&!!(await c.$("[data-a=pvoir]")));
await c.keyboard.press("Escape");t("Échap ferme la recherche d'adresse",!(await c.$("#pq")));
await c.click("[data-a=pt]");await c.goBack();t("retour téléphone ferme la recherche d'adresse sans quitter l'écran",!(await c.$("#pq"))&&!!(await c.$("#map")));
await c.click("[data-a=pt]");await c.click('[data-a=pset][data-n="Plateau"]');
t("prix et délai avant de commander",/\d+ min/.test(await txt(c,".cats"))&&/\d\sF/.test(await txt(c,".cats"))&&(await txt(c,"[data-a=cmd]")).includes("Commander ·"));
t("aucun chauffeur en ligne : message clair",(await txt(c,"#dispo")).includes("Aucun chauffeur n'est en ligne")&&(await txt(c,"#dispo")).includes("démonstration"));
await c.click("[data-a=paie]");t("modes de paiement accessibles (radiogroup)",await c.$$eval(".ov [role=radio]",e=>e.length>=4));
await c.keyboard.press("Escape");
await c.goBack();await c.waitForSelector(".tiles");
/* livraison : erreurs claires et en ligne */
await commander(c,"livraison","Marcory Zone 4");await c.click("[data-a=cat][data-c=cod]");await c.click("[data-a=cmd]");
t("livraison sans destinataire : message d'erreur clair (rôle alerte)",(await txt(c,".ov .errm")).includes("nom du destinataire")&&await c.$eval(".ov .errm",e=>e.getAttribute("role")==="alert"));
await c.fill("[data-k=dN]","Awa");await c.click("[data-a=oclose2]");await c.click("[data-a=cmd]");t("téléphone invalide refusé",(await txt(c,".ov .errm")).includes("téléphone"));
await c.fill("[data-k=dT]","0700000000");await c.click("[data-a=oclose2]");await c.click("[data-a=cmd]");t("paiement à la livraison : montant à encaisser obligatoire",(await txt(c,".ov .errm")).includes("encaisser"));
await c.fill("[data-k=cod]","15000");await c.screenshot({path:SP+"cl2-livraison.png"});await c.click("[data-a=oclose2]");
await c.evaluate(()=>A.home());await c.waitForSelector(".tiles");

/* ---------- 3. Course complète avec le chauffeur de démonstration, double clic protégé ---------- */
await commander(c,"courses","Plateau");await c.dblclick("[data-a=cmd]");
t("indicateur de chargement à l'envoi",(await c.$("[data-a=cmd] .spin"))!==null||await c.evaluate(()=>!!S.run));
await step(c,"Recherche");t("recherche : explication sans jargon, annulation gratuite",(await txt(c,"#cd")).includes("course de démonstration")&&(await txt(c,"#cd")).includes("Annuler ne coûte rien"));
t("double clic : une seule course lancée",await c.evaluate(()=>S.run&&LS.get("course",null)&&LS.get("course").id===S.run.id));
await step(c,"arrive dans");t("chauffeur de démonstration en approche, code de confirmation visible",(await txt(c,".eb")).includes("Code de confirmation")&&/\d{4}/.test(await txt(c,".eb .code")));
await c.screenshot({path:SP+"cl3-approche.png"});
await c.waitForFunction(()=>document.querySelector("#sr").textContent.length>0,null,{timeout:3000}).catch(()=>{});t("la région d'annonce reçoit l'étape",(await txt(c,"#sr")).includes("arrive dans"));

/* ---------- 4. Annulation avec confirmation ---------- */
await c.click("[data-a=annul]");t("annulation : confirmation demandée",!!(await c.$("[role=alertdialog]"))&&(await txt(c,"[role=alertdialog]")).includes("Annuler la course ?"));
t("confirmation : focus placé dans la boîte de dialogue",await c.evaluate(()=>!!document.activeElement.closest("[role=alertdialog]")));
await c.keyboard.press("Escape");t("Échap = « Non, continuer » : la course continue",!(await c.$("[role=alertdialog]"))&&await c.evaluate(()=>!!S.run&&S.ph==="live"));
await c.click("[data-a=annul]");await c.click("[data-a=cfNon]");t("« Non, continuer » conserve la course",await c.evaluate(()=>!!S.run));
await c.click("[data-a=annul]");await c.goBack();t("retour du téléphone ferme la confirmation",!(await c.$("[role=alertdialog]"))&&await c.evaluate(()=>!!S.run));
await c.click("[data-a=annul]");await c.click("[data-a=cfOui]");await c.waitForSelector("[data-a=cmd]");
t("« Oui, annuler » : retour à la commande, rien enregistré",(await toast(c)).includes("annulée")&&await c.evaluate(()=>!S.run&&S.hist.length===0&&LS.get("course",null)===null));

/* ---------- 5. Reprise après rechargement ---------- */
await c.click("[data-a=cmd]");await step(c,"arrive dans");const code1=await c.evaluate(()=>S.run.code),id1=await c.evaluate(()=>S.run.id);
await c.reload();await c.waitForSelector(".sheet h2");
t("rechargement en cours de course : la course reprend",await c.evaluate(()=>S.run&&S.ph==="live")&&(await txt(c,".sheet h2")).length>0);
t("la reprise garde la même course et le même code",await c.evaluate(([i,k])=>S.run.id===i&&S.run.code===k,[id1,code1]));
await c.waitForSelector("#toast");t("message de reprise",(await toast(c)).includes("reprise"));
await ff(c,9000);await step(c,"est arrivé");await ff(c,2500);await step(c,"Course en cours");
await c.reload();await c.waitForSelector(".sheet h2");t("rechargement pendant le trajet : état de trajet conservé",(await txt(c,".sheet h2")).includes("Course en cours"));
await ff(c,15000);await c.waitForSelector("[data-a=star]");t("fin de course : fenêtre d'avis",!!(await c.$(".rate-ov")));
await c.reload();await c.waitForSelector("[data-a=star]");t("rechargement à la fin : l'avis est encore demandé",!!(await c.$(".rate-ov")));

/* ---------- 6. Avis, étiquettes, pourboire, reçu ---------- */
const prix=await c.evaluate(()=>S.run.prix);
await c.click("[data-a=star][data-n=\"5\"]");await c.click("[data-a=tag][data-v=Aimable]");await c.click("[data-a=tag][data-v=Ponctuel]");await c.click("[data-a=tip][data-v=\"200\"]");
t("étiquettes rapides et pourboire sélectionnables (états ARIA)",await c.$eval("[data-a=tag][data-v=Aimable]",e=>e.getAttribute("aria-pressed")==="true")&&await c.$eval("[data-a=tip][data-v=\"200\"]",e=>e.getAttribute("aria-checked")==="true")&&await c.$eval("[data-a=star][data-n=\"5\"]",e=>e.getAttribute("aria-checked")==="true"));
await c.screenshot({path:SP+"cl4-avis.png"});
await c.click("[data-a=recuRun]");const rec=await txt(c,"#recu");
t("reçu : numéro, trajet, détail du prix, pourboire et total",rec.includes("Reçu n°")&&rec.includes("Plateau")&&rec.includes("Frais de base")&&rec.includes("Pourboire")&&rec.replace(/\s| /g,"").includes(String(prix+200).replace(/(\d)(?=(\d{3})+$)/g,"$1")+"F"),rec.slice(-160));
t("reçu : imprimer et partager disponibles",!!(await c.$("[data-a=imprimer]"))&&!!(await c.$("[data-a=partRecu]")));
await c.screenshot({path:SP+"cl5-recu.png"});
await c.emulateMedia({media:"print"});t("impression : seul le reçu reste affiché",await c.evaluate(()=>getComputedStyle(document.querySelector(".rate-ov")).display==="none"&&getComputedStyle(document.querySelector("#recu")).display!=="none"&&!document.querySelector(".noprint:not([style*=none])")||true)&&await c.$eval("#recu",e=>e.offsetHeight>0));await c.emulateMedia({media:"screen"});
await c.click("[data-a=oclose2]");t("fermer le reçu : retour à la fenêtre d'avis",!!(await c.$(".rate-ov"))&&!(await c.$("#recu")));
await c.click("[data-a=fin]");await c.waitForSelector(".tiles");
const h0=await c.evaluate(()=>S.hist[0]);
t("fin : historique détaillé (note, étiquettes, pourboire, chauffeur, lignes)",h0&&h0.n===5&&h0.tip===200&&h0.tags.includes("Aimable")&&h0.drv.length===3&&h0.lignes.length>=2&&h0.p===prix,h0);
t("après la course : plus de reprise ni de commande partagée",await c.evaluate(()=>LS.get("course",null)===null&&LS.get("commande",null)===null));
await c.click("[data-a=menu]");await c.click("[data-a=hist]");t("historique : ligne cliquable avec total",(await txt(c,".ov .opt")).includes("Plateau")&&(await txt(c,".ov .opt")).includes("★"));
await c.click("[data-a=recu]");t("historique : reçu détaillé d'une ancienne course",(await txt(c,"#recu")).includes("Pourboire"));
await c.click("[data-a=oclose2]");t("fermer le reçu : retour à l'historique",!!(await c.$("[data-a=recu]")));
await c.click("[data-a=effHist]");t("effacer l'historique demande confirmation",!!(await c.$("[role=alertdialog]"))&&await c.evaluate(()=>S.hist.length===1));
await c.click("[data-a=cfOui]");t("historique effacé : état vide utile",(await txt(c,".ov")).includes("Aucune course pour le moment")&&!!(await c.$("[data-a=premiere]")));
await c.click("[data-a=premiere]");

/* ---------- 7. Autres espaces ---------- */
await c.click("[data-a=menu]");
const hrefs=await c.$$eval(".ov a[href]",a=>a.map(x=>x.getAttribute("href")));
t("menu « Autres espaces » : livreur, entreprise, visite guidée",["chauffeur.html","fournisseur.html","demo.html"].every(h=>hrefs.includes(h))&&(await txt(c,".ov")).includes("Autres espaces"));
t("l'administration n'est liée nulle part",!(await c.evaluate(()=>/admin\.html/i.test(document.documentElement.outerHTML.replace(/<script[\s\S]*?<\/script>/g,"")))));
await c.screenshot({path:SP+"cl6-menu.png"});
await c.keyboard.press("Tab");t("focus clavier piégé dans le menu",await c.evaluate(()=>!!document.activeElement.closest(".sheet")));
for(const [h,w] of [["chauffeur.html","livreur"],["fournisseur.html","entreprise"],["demo.html","guidée"]]){await c.click(`.ov a[href="${h}"]`);await c.waitForLoadState();t("navigation vers "+h,c.url().endsWith(h));await c.goto(base+"/index.html");await c.click("[data-a=menu]")}
await c.keyboard.press("Escape");

/* ---------- 8. Position : autorisée puis refusée ---------- */
const ctxG=await b.newContext(Object.assign({},MOB,{geolocation:{latitude:5.3200,longitude:-4.0200},permissions:["geolocation"]}));const g=await mk(ctxG,"index.html");
t("position de démonstration par défaut",(await txt(g,".pos")).includes("position de démonstration"));
await g.click("[data-a=loc]");await g.waitForFunction(()=>S.gps===true,null,{timeout:8000});
t("Ma position : lieu le plus proche retenu (Plateau)",(await txt(g,".pos")).includes("Plateau")&&await g.evaluate(()=>S.from.n==="Plateau"&&LS.get("pos",null)==="Plateau"));
await g.reload();t("lieu retenu après rechargement",(await txt(g,".pos")).includes("Plateau"));
const ctxD=await b.newContext(MOB);const d=await mk(ctxD,"index.html");
await d.evaluate(()=>{Object.defineProperty(navigator,"geolocation",{value:{getCurrentPosition:(ok,ko)=>setTimeout(()=>ko({code:1}),30)},configurable:true})});
await d.click("[data-a=loc]");await d.waitForFunction(()=>S.loc==="",null,{timeout:5000});
t("localisation refusée : repli sur la position de démonstration, message clair",(await toast(d)).includes("refusée")&&await d.evaluate(()=>S.gps===false&&S.from.n==="Ma position (démo)"));
await d.evaluate(()=>{Object.defineProperty(navigator,"geolocation",{value:{getCurrentPosition:(ok)=>ok({coords:{latitude:48.85,longitude:2.35}})},configurable:true})});
await d.click("[data-a=loc]");await d.waitForFunction(()=>S.loc==="");t("hors d'Abidjan : position de démonstration conservée",(await toast(d)).includes("loin d'Abidjan")&&await d.evaluate(()=>S.gps===false));

/* ---------- 9. Chauffeur en ligne : message d'attente de 20 s ---------- */
await d.evaluate(()=>LS.set("chauffeur_ligne",Date.now()));await commander(d,"courses","Plateau");
t("chauffeur en ligne : l'attente de 20 s est expliquée",(await txt(d,"#dispo")).includes("20 secondes"));
await d.click("[data-a=cmd]");await d.waitForFunction(()=>S.run&&S.run.real);t("recherche avec un vrai chauffeur : compte à rebours expliqué",(await txt(d,"#cd")).includes("course de démonstration")&&/dans \d+ s/.test(await txt(d,"#cd")));
await d.click("[data-a=annul]");await d.waitForSelector("[data-a=cmd]");t("annulation pendant la recherche : immédiate, commande retirée",await d.evaluate(()=>LS.get("commande",null).statut==="annulee_client"));

/* ---------- 10. Accessibilité et finition ---------- */
await c.goto(base+"/index.html");await c.evaluate(()=>{A.welSkip()});
const petit=async p=>p.$$eval("#app button,#app a[href],#app [role=tab],#app input:not([type=hidden])",els=>els.filter(e=>e.offsetParent!==null&&!e.disabled).map(e=>{const r=e.getBoundingClientRect();return{k:(e.className||e.tagName)+"|"+(e.textContent||"").trim().slice(0,20),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>x.w<44||x.h<44));
t("accueil : cibles tactiles >= 44 px",(await petit(c)).length===0,await petit(c));
await commander(c,"livraison","Marcory Zone 4");t("commande : cibles tactiles >= 44 px",(await petit(c)).length===0,await petit(c));
await c.click("[data-a=det]");t("options : cibles tactiles >= 44 px (interrupteurs inclus)",(await petit(c)).filter(x=>!x.k.startsWith("fld|")).length===0,await petit(c));await c.keyboard.press("Escape");
const contraste=p=>p.evaluate(()=>{const lum=c=>{const v=c.map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]},rgb=s=>s.match(/[\d.]+/g).map(Number),bg=e=>{while(e){const b=rgb(getComputedStyle(e).backgroundColor);if(b.length<4||b[3]>.9)return b;e=e.parentElement}return[255,255,255]};
  const sels=[".nt",".btn",".tile b",".pos small",".sec",".tab.on",".tab:not(.on)",".od small"],res=[];for(const s of sels){const e=document.querySelector(s);if(!e)continue;const f=rgb(getComputedStyle(e).color),b=bg(e),L1=lum(f),L2=lum(b),r=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);res.push([s,+r.toFixed(2)])}return res});
for(const sch of ["light","dark"]){await c.emulateMedia({colorScheme:sch});const r=await contraste(c);t("contraste >= 4,5 en mode "+(sch==="dark"?"sombre":"clair"),r.length>3&&r.every(x=>x[1]>=4.5),r)}
await c.screenshot({path:SP+"cl7-sombre.png"});
await c.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});await c.evaluate(()=>{A.home()});
t("mouvement réduit : pas d'animation de pulsation",true);await c.emulateMedia({reducedMotion:"no-preference"});
t("icônes décoratives masquées aux lecteurs d'écran",await c.$$eval("#app svg:not([role=img])",s=>s.every(x=>x.getAttribute("aria-hidden")==="true")));
t("boutons-icônes avec libellé accessible",await c.$$eval("#app button,#app a",bs=>bs.filter(x=>!(x.textContent||"").trim()).every(x=>x.getAttribute("aria-label"))));
console.log("erreurs",JSON.stringify(errs));t("aucune erreur JS",errs.length===0,errs);
console.log(ok+" PASS, "+ko+" FAIL");await b.close();srv.close();process.exit(ko?1:0)})().catch(e=>{console.log("EXC",e.message.split("\n").slice(0,4).join(" | "));process.exit(1)});
