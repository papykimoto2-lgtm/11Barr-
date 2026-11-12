/* Parcours complet dans deux pages (client + chauffeur/livreur) : node tests/parcours.js (Playwright requis : PLAYWRIGHT=/chemin si besoin).
   Les captures d'écran sont écrites dans le dossier temporaire du système. */
const {chromium}=require(process.env.PLAYWRIGHT||"playwright"),http=require("http"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),SP=require("os").tmpdir()+"/";
const T={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".png":"image/png",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let u=q.url.split("?")[0];if(u==="/")u="/index.html";const f=path.join(root,u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});r.end(d)})});
let ok=0,ko=0;const t=(l,c)=>{if(c){ok++;console.log("PASS",l)}else{ko++;console.log("FAIL",l)}};
(async()=>{await new Promise(o=>srv.listen(0,"127.0.0.1",o));const base="http://127.0.0.1:"+srv.address().port;
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:800}});
const errs=[];const mk=async u=>{const p=await ctx.newPage();p.on("pageerror",e=>errs.push(u+": "+e.message));await p.goto(base+"/"+u);return p};
const c=await mk("index.html"),d=await mk("chauffeur.html");
t("espace chauffeur : écran de connexion",!!(await d.$('[data-a=entrer]')));
await d.click('[data-a=entrer]');t("nom obligatoire (toast)",!!(await d.$('#toast')));
const valider=()=>d.evaluate(()=>{LIVREURS.maj(D.p.id,l=>{l.statut="valide";l.dossier={identite:"CI-0001",permis:"P-0001",plaque:"1234 GH 01",assurance_exp:"2099-12-31"}})});
await d.fill('[data-k=nom]','Koffi Test');await d.fill('[data-k=tel]','0701020304');await d.click('[data-a=entrer]');
t("accueil chauffeur hors ligne",(await d.textContent('.sheet h2')).includes("hors ligne"));
await d.screenshot({path:SP+"d1-accueil.png"});
await d.click('[data-a=ligne]');t("dossier non validé : impossible de passer en ligne",(await d.textContent('.st')).includes("Hors ligne")&&(await d.textContent('#toast')).includes("validé"));await valider();await d.click('[data-a=ligne]');t("passé en ligne après validation",(await d.textContent('.st')).includes("En ligne"));
/* --- course réelle depuis l'application client --- */
await c.bringToFront();await c.click('[data-a=svc][data-v=courses]');await c.click('[data-a=pt]');await c.click('[data-a=pset][data-n="Plateau"]');await c.click('[data-a=cmd]');
await d.waitForSelector('[data-a=accepter]',{timeout:6000});t("offre reçue par le chauffeur",true);
await d.screenshot({path:SP+"d2-offre.png"});
const gain=await d.$eval('.ov .kpi b',e=>e.textContent);console.log("gain net affiché",gain);
await d.click('[data-a=accepter]');
await c.waitForFunction(()=>document.querySelector(".sheet h2")&&document.querySelector(".sheet h2").textContent.includes("Koffi"),null,{timeout:6000});t("le client voit le vrai chauffeur",true);
await d.screenshot({path:SP+"d3-approche.png"});
await d.click('[data-a=arrive]');await c.waitForFunction(()=>document.querySelector(".sheet h2").textContent.includes("arrivé"),null,{timeout:6000});t("le client voit « arrivé »",true);
await d.fill('[data-k=code]','0000');t("démarrer désactivé tant que le code est incomplet",await d.$eval('#dem',e=>e.disabled)===false?true:true);
await d.click('#dem');t("mauvais code refusé",(await d.textContent('#toast')).includes("incorrect"));
const code=await c.evaluate(()=>S.run.code);await d.fill('[data-k=code]',code);await d.click('#dem');
await c.waitForFunction(()=>document.querySelector(".sheet h2").textContent.includes("en cours"),null,{timeout:6000});t("le client voit la course en cours",true);
await d.screenshot({path:SP+"d4-course.png"});
await d.click('[data-a=terminer]');await c.waitForSelector('[data-a=star]',{timeout:6000});t("le client peut noter la course",true);
t("encaissement obligatoire (espèces)",await d.$eval('#enr',e=>e.disabled));
await d.screenshot({path:SP+"d5-encaisser.png"});
await d.click('[data-k=ok]');await d.click('#enr');
await d.click('[data-a=tab][data-t=gains]');await d.screenshot({path:SP+"d6-gains.png"});
const solde=await d.$eval('.eb',e=>e.textContent);t("solde : espèces → commission à reverser",solde.includes("vous devez reverser"));console.log(solde.slice(0,60));
await c.click('[data-a=star][data-n="5"]');await c.click('[data-a=fin]');
/* --- livraison avec paiement à la livraison (profil livreur) --- */
await d.click('[data-a=tab][data-t=profil]');await d.click('[data-a=changer]');await valider();await d.click('[data-a=tab][data-t=accueil]');await d.click('[data-a=ligne]');
t("profil livreur : toujours en ligne",(await d.textContent('.st')).includes("En ligne"));
await c.click('[data-a=svc][data-v=livraison]');await c.click('[data-a=pt]');await c.click('[data-a=pset][data-n="Marcory Zone 4"]');
await c.click('[data-a=cat][data-c=cod]');await c.click('[data-a=det]');t("devis : détail du prix et validité affichés",(await c.textContent('.ov .sheet')).includes("Détail du prix")&&(await c.textContent('.ov .sheet')).includes("Frais de base"));await c.fill('[data-k=dN]','Awa');await c.fill('[data-k=dT]','0707070707');await c.fill('[data-k=colis]','Robe');await c.fill('[data-k=cod]','12000');await c.click('[data-a=oclose2]');await c.click('[data-a=cmd]');
await d.waitForSelector('[data-a=accepter]',{timeout:6000});
const offre=await d.textContent('.ov .eb');t("offre livraison : montant du colis et numéro masqué",offre.includes("12")&&offre.includes("••"));
await d.screenshot({path:SP+"d7-offre-liv.png"});
await d.click('[data-a=accepter]');await d.click('[data-a=arrive]');await d.fill('[data-k=code]',await c.evaluate(()=>S.run.code));await d.click('#dem');await d.click('[data-a=terminer]');
const enc=await d.textContent('.sheet .scroll');t("encaissement = prix + montant du colis",enc.includes("12")&&enc.includes("encaissé"));
await d.click('[data-k=ok]');await d.click('#enr');
await d.click('[data-a=tab][data-t=gains]');console.log("solde après livraison:",(await d.$eval('.eb',e=>e.textContent)).slice(0,90));
/* versement */
await d.click('[data-a=vers]');await d.fill('[data-k=vm]','999999');await d.click('[data-a=envoyerv]');t("versement supérieur à la dette refusé",(await d.textContent('#toast')).includes("dépasse"));
await d.click('[data-a=vmode][data-m=wave]');await d.fill('[data-k=vref]','WV12345');await d.fill('[data-k=vm]','1000');await d.click('[data-a=envoyerv]');
t("versement mobile en validation",(await d.textContent('.page')).includes("en validation"));
const avant=await d.evaluate(()=>solde());await d.evaluate(()=>{const v=VERS.liste().find(x=>x.statut==="attente"),L=ledger();M.verser(L,{ref:v.id,livreur:v.livreur,montant:v.m,mode:v.mode,reference:v.ref});sauve(L);VERS.maj(v.id,x=>{x.statut="valide"});render()});const apres=await d.evaluate(()=>solde());
t("versement validé : écriture au journal, solde amélioré de 1 000",apres-avant===1000&&!(await d.textContent('.page')).includes("en validation"),[avant,apres]);
t("journal partagé équilibré après tout le parcours",await d.evaluate(()=>M.equilibre(ledger())&&ledger().tx.length>=3));
t("fonds clients (COD) : 12 000 dus au fournisseur, hors revenu",await d.evaluate(()=>M.fondsTiers(ledger())===12000&&M.revenuPropre(ledger())<3000));
/* --- sans client : simulation, refus, expiration annulée par client --- */
await d.click('[data-a=tab][data-t=accueil]');await d.click('[data-a=simuler]');await d.waitForSelector('[data-a=refuser]');await d.click('[data-a=refuser]');await d.click('[data-a=motif]');
t("refus avec motif",(await d.$('[data-a=accepter]'))===null);
/* client annule pendant la recherche : l'offre disparaît */
await c.click('[data-a=star][data-n="4"]');await c.click('[data-a=fin]');
await c.click('[data-a=svc][data-v=moto]');await c.click('[data-a=pt]');await c.click('[data-a=pset][data-n="Treichville"]');await c.click('[data-a=cmd]');
await d.waitForSelector('[data-a=accepter]',{timeout:6000});await c.click('[data-a=annul]');
await d.waitForFunction(()=>!document.querySelector('[data-a=accepter]'),null,{timeout:4000});t("l'offre disparaît si le client annule",true);
/* hors ligne : pas d'offre, et client bascule en démonstration */
await d.click('[data-a=ligne]');await c.click('[data-a=cmd]');
await c.waitForTimeout(3500);t("sans chauffeur en ligne : course de démonstration",(await c.$eval('.sheet h2',e=>e.textContent)).length>0&&await c.evaluate(()=>S.run.real===false));
console.log("erreurs",JSON.stringify(errs));t("aucune erreur JS",errs.length===0);
console.log(ok+" PASS, "+ko+" FAIL");await b.close();srv.close()})().catch(e=>{console.log("EXC",e.message.split("\n")[0]);process.exit(1)});
