/* Ergonomie, accessibilité et robustesse du portail fournisseur et de l'administration : node tests/pro-ux.js
   (Playwright requis : NODE_PATH=$(npm root -g) ou PLAYWRIGHT=/chemin). SHOTS=1 enregistre des captures dans le dossier temporaire. */
const {chromium}=require(process.env.PLAYWRIGHT||"playwright"),http=require("http"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),SP=require("os").tmpdir()+"/";
const T={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".png":"image/png",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let u=q.url.split("?")[0];const f=path.join(root,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});r.end(d)})});
let ok=0,ko=0;const t=(l,c,d)=>{if(c){ok++;console.log("PASS",l)}else{ko++;console.log("FAIL",l,d===undefined?"":JSON.stringify(d))}};
const WIDTHS=[360,414,768,1280];
(async()=>{await new Promise(o=>srv.listen(0,"127.0.0.1",o));const base="http://127.0.0.1:"+srv.address().port;
const b=await chromium.launch();const errs=[];
const nouveau=async(o)=>{const ctx=await b.newContext(Object.assign({viewport:{width:1100,height:900}},o||{}));return ctx};
const mk=async(ctx,u,vp)=>{const p=await ctx.newPage();if(vp)await p.setViewportSize(vp);p.on("pageerror",e=>errs.push(u+": "+e.message));p.on("console",m=>{if(m.type()==="error")errs.push(u+" console: "+m.text())});await p.goto(base+"/"+u);return p};
const toast=async p=>(await p.$$eval("#toast",e=>e.map(n=>n.textContent).join(" | ")).catch(()=>""))||"";
const conf=p=>p.click('[data-a=confirmok]');
const shot=async(p,n)=>{if(process.env.SHOTS)await p.screenshot({path:SP+"pro-"+n+".png",fullPage:false})};
const deborde=p=>p.evaluate(()=>{const W=innerWidth,o=[];if(document.documentElement.scrollWidth>W+1)o.push("page "+document.documentElement.scrollWidth+">"+W);document.querySelectorAll("#app *").forEach(e=>{if(e.closest(".scr,nav.tabs,.sr"))return;const r=e.getBoundingClientRect();if(r.width&&r.right>W+1)o.push(e.tagName+"."+e.className+" "+Math.round(r.right))});return o.slice(0,4)});
const dansPop=p=>p.evaluate(()=>{const pop=[...document.querySelectorAll(".pop")].pop();return !!pop&&pop.contains(document.activeElement)});
/* ---------- jeu de données : 60 livraisons, dont une avec photos, offres et « sans livreur disponible » ---------- */
const semer=(p,n)=>p.evaluate(n=>{
 const c=document.createElement("canvas");c.width=60;c.height=40;const g=c.getContext("2d");g.fillStyle="#2a7";g.fillRect(0,0,60,40);g.fillStyle="#fff";g.fillRect(10,10,20,20);const jpg=c.toDataURL("image/jpeg",.7);
 ORGS.ajouter({id:"SPRO",nom:"Maison Koné & Fils",type:"fournisseur",rccm:"CI-ABJ-2020-B-1234",tel:"0707070707",email:"contact@kone.ci",adresse:"Marcory Zone 4",statut:"valide",remise:0.05,cree_le:Date.now()-864e5*30,points:[{id:"p1",nom:"Boutique Plateau",place:"Plateau",adresse:"Rue du Commerce",tel:"0707070707",horaires:"8h-18h",defaut:true}],membres:[{id:"u1",nom:"Ama Koné",role:"admin"}]});LS.set("org_id","SPRO");
 LIVREURS.ajouter({id:"L1",nom:"Koffi Test",tel:"0101010101",type:"livreur",statut:"valide",cree_le:Date.now()-864e6,dossier:{identite:"CI-1",permis:"P-1",plaque:"1234 AB 01",assurance_exp:"2099-12-31"}});
 const dests=["Attécoubé","Marcory Zone 4","Cocody Angré","Yopougon Siporex","Treichville","Koumassi"],noms=["Awa Koné","Yao Marc","Aya Traoré","Koffi Paul","Fatou Diallo","Élodie N'Guessan"],st=["ready_for_assignment","delivered","in_transit","cancelled","delivered","assigned"],L=[];
 for(let i=0;i<n;i++){const d=lieu(dests[i%6]),devis=M.devis(M.PLAN_DEFAUT,{cat:"lm",km:2+i%9}),o={id:"o"+i,ref:"11B-2026-"+String(i+1).padStart(5,"0"),refExt:"CMD-"+(100+i),org:"SPRO",orgNom:"Maison Koné & Fils",cree_par:"Ama Koné",cree_le:Date.now()-i*36e5,mode:"moto",cat:"lm",catNom:"Livraison à moto",de:{n:"Boutique Plateau",z:"Abidjan",la:5.31,lo:-4.02,adresse:"Rue du Commerce",tel:"0707070707"},a:{n:dests[i%6],z:d.z,la:d.la,lo:d.lo,adresse:""},dest:{nom:noms[i%6],tel:"0505050505"},colis:{c:"Colis "+i,poids:2,volume:0},vitesse:"std",vitesseNom:"Standard",porte:false,cod:i%3===0?15000:0,payeurTransport:"compte",devis,km:5,du:20,codeCollecte:"1234",codeLivraison:"5678",statut:"draft",evenements:[],chauffeur:null};
  M.changerStatut(o,"quoted","Ama Koné","Devis");M.changerStatut(o,"ready_for_assignment","Ama Koné","Confirmée");
  const s=st[i%6];if(s==="assigned"||s==="in_transit"||s==="delivered"){M.changerStatut(o,"assigned","Opérations","Affectation");o.chauffeur={id:"L1",nom:"Koffi Test",veh:"Moto",plaque:"1234 AB 01",note:4.9}}
  if(s==="in_transit"){M.changerStatut(o,"courier_to_pickup","Koffi","");M.changerStatut(o,"picked_up","Koffi","");M.changerStatut(o,"in_transit","Koffi","")}
  if(s==="delivered"){M.changerStatut(o,"courier_to_pickup","Koffi","");M.changerStatut(o,"picked_up","Koffi","");M.changerStatut(o,"in_transit","Koffi","");M.changerStatut(o,"arrived","Koffi","");M.changerStatut(o,"delivered","Koffi","");o.cloture=true}
  if(s==="cancelled")M.changerStatut(o,"cancelled","Ama Koné","Annulée");L.push(o)}
 const x=L[0];x.id="oextra";x.ref="11B-2026-00099";x.sans_candidat=true;x.statut="ready_for_assignment";
 x.preuves=[{type:"collecte",photo:jpg,at:Date.now()-36e5,par:"Koffi Test"},{type:"livraison",photo:jpg,at:Date.now()-18e5,par:"Koffi Test"},{type:"collecte",photo:"javascript:alert(1)",at:Date.now()}];
 x.offres=[{livreur:"L1",nom:"Koffi Test",at:Date.now()-5e6,statut:"refusee",motif:"Trop loin"},{livreur:"L1",nom:"Koffi Test",at:Date.now()-4e6,statut:"expiree"},{livreur:"L1",at:Date.now()-3e6,statut:"proposee"}];
 LIV.ecrire(L);return L.length},n);
(async()=>{
/* ===================== 1. Compte neuf : états vides, parcours guidé, validation en ligne ===================== */
{const ctx=await nouveau(),pf=await mk(ctx,"fournisseur.html");
 await pf.evaluate(()=>{ORGS.ajouter({id:"SNEUF",nom:"Boutique Neuve",type:"entreprise",rccm:"",tel:"0707070707",email:"a@b.ci",adresse:"Plateau",statut:"valide",remise:0,cree_le:Date.now(),points:[{id:"p1",nom:"Point principal",place:"Plateau",adresse:"Plateau",tel:"0707070707",horaires:"",defaut:true}],membres:[{id:"u1",nom:"Awa",role:"admin"}]});LS.set("org_id","SNEUF")});await pf.reload();
 t("état vide du tableau de bord : explication et bouton d'action",(await pf.textContent("main")).includes("Aucune livraison pour le moment")&&!!(await pf.$('main .vide [data-a=tab][data-t=nouvelle]')));
 t("« Pour bien démarrer » : 4 étapes, aucune cochée",(await pf.$$(".etapes li")).length===4&&(await pf.$$(".etapes li.f")).length===0);
 await pf.click('.etapes [data-a=tab][data-t=parametres]');await pf.fill('[data-pt=nom]','Entrepôt Yopougon');await pf.selectOption('[data-pt=place]','Yopougon Siporex');await pf.click('[data-a=ptadd]');
 await pf.click('[data-a=tab][data-t=tableau]');t("étape « point de collecte » cochée toute seule",(await pf.$$(".etapes li.f")).length===1);
 await pf.click('[data-a=tab][data-t=livraisons]');t("état vide de la liste : explication et boutons",(await pf.textContent("main")).includes("Créez votre première livraison")&&!!(await pf.$('main .vide [data-a=tab][data-t=import]')));
 /* validation en ligne : messages sous les champs, focus sur le premier champ fautif */
 await pf.click('[data-a=tab][data-t=nouvelle]');await pf.fill('[data-f=poids]','');await pf.click('[data-a=creerliv]');
 const inv=await pf.evaluate(()=>({foc:document.activeElement.id,msg:(document.getElementById("e-f-dNom")||{}).textContent,tel:(document.getElementById("e-f-dTel")||{}).textContent,ai:document.getElementById("f-dNom").getAttribute("aria-invalid"),desc:document.getElementById("f-dNom").getAttribute("aria-describedby")}));
 t("validation en ligne : focus sur le champ fautif",inv.foc==="f-dNom",inv);
 t("validation en ligne : message sous le champ, lié par aria-describedby",inv.msg.length>5&&inv.tel.length>5&&inv.ai==="true"&&inv.desc.includes("e-f-dNom"),inv);
 t("l'erreur est aussi annoncée (zone aria-live)",(await toast(pf)).length>5&&(await pf.getAttribute("#tz","aria-live"))==="polite"&&(await pf.$("#tz #toast"))!==null);
 await pf.fill('[data-f=dNom]','Awa Koné');t("saisie corrigée : le message du champ disparaît",(await pf.textContent("#e-f-dNom"))===""&&(await pf.getAttribute("#f-dNom","aria-invalid"))===null);
 await pf.fill('[data-f=dTel]','12');await pf.press('[data-f=dTel]','Tab');t("contrôle à la sortie du champ (téléphone invalide)",(await pf.textContent("#e-f-dTel")).includes("8 chiffres"));
 await pf.fill('[data-f=dTel]','0505050505');await pf.fill('[data-f=poids]','3');await pf.click('[data-a=creerliv]');await pf.waitForSelector('.pop');await pf.click('.pop [data-a=fermer]');
 await pf.click('[data-a=tab][data-t=import]');await pf.click('[data-a=analyser]');
 t("import vide : erreur sous le champ et focus",(await pf.textContent("#e-imp-texte")).length>5&&(await pf.evaluate(()=>document.activeElement.id))==="imp-texte");
 await pf.click('[data-a=exemple]');await pf.click('[data-a=analyser]');
 await pf.click('[data-a=tab][data-t=paiements]');t("état vide du relevé : explication",(await pf.textContent("main")).includes("Aucun mouvement pour le moment"));
 await pf.click('[data-a=tab][data-t=tableau]');t("les 4 étapes se cochent toutes seules, le guide félicite",(await pf.$$(".etapes li.f")).length===4&&(await pf.textContent("main")).includes("Bravo"));
 await pf.click('[data-a=masquerdemar]');t("le guide peut être masqué",!(await pf.$(".etapes")));
 /* formulaire d'inscription : erreurs sous les champs */
 await pf.evaluate(()=>{LS.set("org_id",null);P.org=null;render()});await pf.click('[data-a=creerorg]');
 t("inscription : champs obligatoires signalés sous chaque champ",(await pf.textContent("#e-r-nom")).length>3&&(await pf.textContent("#e-r-email")).length>3&&(await pf.evaluate(()=>document.activeElement.id))==="r-nom");
 await ctx.close()}
/* ===================== 2. Compte avec 60 livraisons ===================== */
const ctx=await nouveau(),pf=await mk(ctx,"fournisseur.html"),pa=await mk(ctx,"admin.html");
await semer(pf,60);await pf.reload();await pa.reload();
/* --- responsive --- */
for(const w of WIDTHS){const h=w<600?800:900;await pf.setViewportSize({width:w,height:h});await pa.setViewportSize({width:w,height:h});
 const bad=[];
 for(const tb of ["tableau","livraisons","nouvelle","import","paiements","factures","parametres"]){await pf.click('[data-a=tab][data-t='+tb+']');const d=await deborde(pf);if(d.length)bad.push("portail/"+tb+" "+d.join(";"));if(tb==="livraisons"||tb==="tableau")await shot(pf,"portail-"+w+"-"+tb)}
 for(const tb of ["tableau","comptes","livreurs","commandes","finance","tarifs","incidents","audit","equipe"]){await pa.click('[data-a=tab][data-t='+tb+']');const d=await deborde(pa);if(d.length)bad.push("admin/"+tb+" "+d.join(";"));if(["tableau","commandes","tarifs","finance"].includes(tb))await shot(pa,"admin-"+w+"-"+tb)}
 await pf.click('[data-a=tab][data-t=livraisons]');await pf.click('button.lk >> nth=0');const dm=await deborde(pf);if(dm.length)bad.push("portail/modale "+dm.join(";"));await shot(pf,"portail-"+w+"-modale");await pf.keyboard.press("Escape");
 await pa.click('[data-a=tab][data-t=commandes]');await pa.click('button.lk >> nth=0');const da=await deborde(pa);if(da.length)bad.push("admin/modale "+da.join(";"));await shot(pa,"admin-"+w+"-modale");await pa.keyboard.press("Escape");
 t("responsive "+w+" px : aucun débordement horizontal (portail, administration, fenêtres)",bad.length===0,bad)}
await pf.setViewportSize({width:1100,height:900});await pa.setViewportSize({width:1100,height:900});
/* --- fenêtre modale : piège de focus, Échap, retour du focus, arrière-plan inerte --- */
await pf.click('[data-a=tab][data-t=livraisons]');await pf.focus('button.lk >> nth=2');const idOuv=await pf.evaluate(()=>document.activeElement.dataset.id);await pf.keyboard.press("Enter");await pf.waitForSelector('.pop');
t("modale : rôle dialog, aria-modal, titre associé",await pf.evaluate(()=>{const p=document.querySelector(".pop");return p.getAttribute("role")==="dialog"&&p.getAttribute("aria-modal")==="true"&&!!document.getElementById(p.getAttribute("aria-labelledby"))}));
t("modale : le focus entre dans la fenêtre",await dansPop(pf));
t("modale : l'arrière-plan est inerte",await pf.evaluate(()=>document.querySelector("main").closest("[inert]")!==null||document.querySelector("main").inert===true));
let reste=true;for(let i=0;i<14;i++){await pf.keyboard.press("Tab");if(!(await dansPop(pf)))reste=false}for(let i=0;i<6;i++){await pf.keyboard.press("Shift+Tab");if(!(await dansPop(pf)))reste=false}
t("modale : le focus reste piégé (Tab et Maj+Tab)",reste);
await pf.keyboard.press("Escape");t("modale : Échap ferme la fenêtre",!(await pf.$(".pop")));
t("modale : le focus revient sur l'élément qui l'a ouverte",await pf.evaluate(i=>document.activeElement.dataset.id===i&&document.activeElement.dataset.a==="detail",idOuv),await pf.evaluate(()=>document.activeElement.outerHTML.slice(0,80)));
await pf.click('button.lk >> nth=0');await pf.click('.pop [data-a=fermer]');t("modale : le bouton Fermer fonctionne",!(await pf.$(".pop")));
await pf.mouse.click(5,5);
/* confirmation : Échap annule sans rien faire, le focus revient sur le bouton */
await pf.click('tr.k >> nth=0');const ann=await pf.$('[data-a=annulerliv]');
if(ann){await pf.focus('[data-a=annulerliv]');await pf.keyboard.press("Enter");t("confirmation : boîte alertdialog avec bouton « non » focalisé par défaut",await pf.evaluate(()=>!!document.querySelector("[role=alertdialog]")&&document.activeElement.dataset.a==="confirmno"));
 await pf.keyboard.press("Escape");t("confirmation : Échap annule, la fenêtre de détail reste ouverte, focus rendu",!!(await pf.$(".pop"))&&!(await pf.$("[role=alertdialog]"))&&await pf.evaluate(()=>document.activeElement.dataset.a==="annulerliv"));
 await pf.keyboard.press("Escape")}else t("livraison annulable pour le test de confirmation",false);
/* --- pagination, tri, recherche tolérante, filtres mémorisés, export --- */
await pf.click('[data-a=tab][data-t=livraisons]');
t("liste : 25 lignes au maximum puis « Voir plus »",(await pf.$$("tbody tr")).length===25&&(await pf.textContent("main")).includes("Voir 25 de plus (35 restantes)"));
await pf.click('[data-a=plus]');t("« Voir plus » ajoute 25 lignes",(await pf.$$("tbody tr")).length===50);
await pf.click('[data-a=plus]');t("« Voir plus » affiche tout puis disparaît",(await pf.$$("tbody tr")).length===60&&!(await pf.$('[data-a=plus]')));
await pf.fill('[data-q]','kone');const n1=(await pf.$$("tbody tr")).length;await pf.fill('[data-q]','Élodie');const n2=(await pf.$$("tbody tr")).length;await pf.fill('[data-q]','elodie');const n3=(await pf.$$("tbody tr")).length;
t("recherche tolérante aux accents et à la casse (kone → Koné, Élodie → elodie)",n1>0&&n2>0&&n2===n3,[n1,n2,n3]);
t("la recherche garde le focus dans le champ",await pf.evaluate(()=>document.activeElement.id==="q-1"));
await pf.fill('[data-q]','zzzz');t("aucun résultat : message et bouton pour effacer",(await pf.textContent("main")).includes("Aucun résultat")&&!!(await pf.$('[data-a=effacer]')));await pf.click('[data-a=effacer]');
await pf.click('th button[data-s=total]');const tot=await pf.$$eval("tbody tr td:nth-child(5)",e=>e.slice(0,25).map(x=>+x.textContent.replace(/\D/g,"")));
t("tri par colonne (total croissant) et aria-sort",tot.every((v,i)=>i===0||tot[i-1]<=v)&&(await pf.getAttribute('th:has(button[data-s=total])',"aria-sort"))==="ascending",tot.slice(0,6));
await pf.click('th button[data-s=total]');t("second clic : tri décroissant",(await pf.getAttribute('th:has(button[data-s=total])',"aria-sort"))==="descending");
await pf.selectOption('[data-filtre]','livree');const nl=(await pf.$$("tbody tr")).length;
t("filtre par statut",nl>0&&nl<60&&(await pf.$$eval("tbody tr",e=>e.every(r=>r.textContent.includes("Livré")))));
await pf.reload();await pf.click('[data-a=tab][data-t=livraisons]');t("filtre et tri mémorisés après rechargement",(await pf.$eval('[data-filtre]',e=>e.value))==="livree"&&(await pf.getAttribute('th:has(button[data-s=total])',"aria-sort"))==="descending"&&(await pf.$$("tbody tr")).length===nl);
const [dl]=await Promise.all([pf.waitForEvent("download"),pf.click('[data-a=exportliv]')]);const csv=fs.readFileSync(await dl.path(),"utf8"),lig=csv.trim().split(/\r?\n/);
t("export CSV du portail : BOM, en-tête, une ligne par livraison filtrée, nom de fichier daté",csv.charCodeAt(0)===0xFEFF&&lig[0].includes("reference")&&lig.length===nl+1&&/^livraisons-11barre-\d{4}-\d\d-\d\d\.csv$/.test(dl.suggestedFilename()),[lig.length,nl,dl.suggestedFilename()]);
t("export CSV : cellules neutralisées contre l'injection de formules",await pf.evaluate(()=>csvCell("=1+1")==='"\'=1+1"'&&csvCell("-500")==='"-500"'));
await pf.selectOption('[data-filtre]','');
/* --- admin : commandes (tri, pagination, filtres, export), badge sans livreur --- */
await pa.click('[data-a=tab][data-t=commandes]');
t("admin : commandes paginées par 25",(await pa.$$("tbody tr")).length===25&&(await pa.textContent("main")).includes("Voir 25 de plus"));
await pa.fill('[data-q]','attecoube');t("admin : recherche sans accents (attecoube → Attécoubé)",(await pa.$$("tbody tr")).length===10);await pa.fill('[data-q]','');
await pa.selectOption('[data-filtre]','sanscand');t("admin : filtre « sans livreur disponible »",(await pa.$$("tbody tr")).length===1&&(await pa.textContent("tbody")).includes("sans livreur disponible"));
await pa.reload();await pa.click('[data-a=tab][data-t=commandes]');t("admin : filtre mémorisé après rechargement",(await pa.$eval('[data-filtre]',e=>e.value))==="sanscand");await pa.selectOption('[data-filtre]','');
const [dl2]=await Promise.all([pa.waitForEvent("download"),pa.click('[data-a=exportcmd]')]);const c2=fs.readFileSync(await dl2.path(),"utf8").trim().split(/\r?\n/);
t("admin : export CSV des commandes (60 + en-tête)",c2.length===61&&c2[0].includes("sans_livreur_disponible")&&c2.some(l=>l.includes('"oui"')),c2.length);
/* --- produit : photos de preuve, offres, sans livreur disponible --- */
await pa.click('[data-a=tab][data-t=tableau]');t("admin : alerte « sans livreur disponible » sur le tableau de bord",(await pa.textContent("main")).includes("sans livreur disponible")&&!!(await pa.$('.alert.er')));
t("admin : le compteur de l'onglet Commandes tient compte de l'alerte",(await pa.textContent('nav.tabs [data-t=commandes]')).includes("1"));
await pa.click('.alert.er [data-a=tab]');t("l'alerte ouvre la liste déjà filtrée",(await pa.$eval('[data-filtre]',e=>e.value))==="sanscand"&&(await pa.$$("tbody tr")).length===1);
await pa.click('button.lk >> nth=0');await pa.waitForSelector(".pop");
const thA=await pa.$$(".pop .vig img");t("admin : photos de preuve en miniatures (les sources non sûres sont ignorées)",thA.length===2,thA.length);
const hist=await pa.textContent(".pop");t("admin : historique des offres (statut, motif, nom de repli)",hist.includes("Offres aux livreurs")&&hist.includes("Refusée")&&hist.includes("Trop loin")&&hist.includes("Expirée")&&hist.includes("Proposée"));
t("admin : badge « sans livreur disponible » sur la commande",hist.includes("sans livreur disponible")&&hist.includes("Aucun livreur disponible"));
await pa.click('.pop .vig >> nth=1');t("miniature cliquable : la photo s'ouvre dans une fenêtre, le focus y entre",(await pa.$$(".pop")).length===2&&await pa.evaluate(()=>[...document.querySelectorAll(".pop")].pop().contains(document.activeElement)&&!!document.querySelector(".photo")&&document.querySelector(".photo").alt.includes("livraison")));
await shot(pa,"admin-photo");await pa.keyboard.press("Escape");t("Échap ferme la photo, le détail reste ouvert et le focus revient sur la miniature",(await pa.$$(".pop")).length===1&&await pa.evaluate(()=>document.activeElement.classList.contains("vig")));
await pa.keyboard.press("Escape");
await pf.click('[data-a=tab][data-t=livraisons]');await pf.fill('[data-q]','00099');await pf.click('button.lk >> nth=0');await pf.waitForSelector(".pop");
const dp=await pf.textContent(".pop");t("portail : photos visibles, offres non affichées, information « sans livreur » compréhensible",(await pf.$$(".pop .vig img")).length===2&&!dp.includes("Offres")&&!dp.includes("Trop loin")&&dp.includes("Aucun livreur n'est disponible"));
await pf.keyboard.press("Escape");await pf.fill('[data-q]','');
/* --- relance d'affectation, capacité, onglet Livreurs --- */
await pa.click('[data-a=tab][data-t=livreurs]');const lv=await pa.textContent("main");
t("admin : onglet Livreurs avec présence, capacité et fiabilité",lv.includes("Présence")&&lv.includes("Capacité")&&lv.includes("Fiabilité")&&lv.includes("Hors ligne")&&lv.includes("kg"));
await pa.click('[data-a=tab][data-t=commandes]');await pa.selectOption('[data-filtre]','sanscand');await pa.click('button.lk >> nth=0');
await pa.click('[data-a=relancer]');t("relance sans motif refusée",(await toast(pa)).includes("motif"));
await pa.fill('textarea[data-m]','Nouveaux livreurs disponibles');await pa.click('[data-a=relancer]');
const rl=await pa.evaluate(()=>({o:LIV.lire().find(o=>o.id==="oextra"),a:AUDIT.liste().some(x=>x.action==="relance_affectation"&&x.motif.includes("Nouveaux"))}));
t("relance : relance_at renseigné, sans_candidat remis à false, audit tracé",rl.o.sans_candidat===false&&rl.o.relance_at>0&&rl.a,rl.o.relance_at);
await pa.keyboard.press("Escape");await pa.selectOption('[data-filtre]','');
await pa.evaluate(()=>LIV.maj("o2",o=>{o.colis.poids=50;o.statut="ready_for_assignment"}));await pa.click('[data-a=tab][data-t=tableau]');await pa.click('[data-a=tab][data-t=commandes]');await pa.fill('[data-q]','00003');await pa.click('button.lk >> nth=0');
t("affectation manuelle : un livreur de capacité insuffisante est signalé et non sélectionnable",await pa.evaluate(()=>{const o=[...document.querySelectorAll("[data-aff] option")].find(x=>x.value==="L1");return !o||(o.disabled&&o.textContent.includes("⚠"))}),await pa.$$eval("[data-aff] option",e=>e.map(x=>x.textContent)));
await pa.keyboard.press("Escape");await pa.fill('[data-q]','');
/* --- tarifs : section « Seuils et délais » générée à partir du plan --- */
await pa.click('[data-a=tab][data-t=tarifs]');const lab0=await pa.$$eval('h2',e=>e.map(x=>x.textContent));
const cles=await pa.$$eval('[data-pl^="seuils."]',e=>e.map(x=>x.dataset.pl));
t("tarifs : un champ par clé de plan.seuils, libellés français",cles.length===await pa.evaluate(()=>Object.keys(M.PLAN_DEFAUT.seuils).length)&&(await pa.textContent("main")).includes("Alerte sans affectation après (min)")&&(await pa.textContent("main")).includes("Délai de réponse à une offre")&&(await pa.$$('[data-pl^="options."]')).length===1&&!!(await pa.$('[data-plb="options.preuve_photo_livraison"]')),cles);
await pa.evaluate(()=>{const p=JSON.parse(JSON.stringify(M.PLAN_DEFAUT));p.seuils.nouveau_delai_relance_min=7;p.options.assurance_colis=250;p.nouvelle_regle_min=3;p.seuils.reglage_actif=true;LS.set("plan",p)});await pa.reload();await pa.click('[data-a=tab][data-t=tarifs]');
const cl2=await pa.$$eval('[data-pl^="seuils."]',e=>e.map(x=>x.dataset.pl)),tx=await pa.textContent("main");
t("tarifs : une clé ajoutée au moteur apparaît sans modifier la page (repli sur le nom de la clé)",cl2.includes("seuils.nouveau_delai_relance_min")&&tx.includes("nouveau_delai_relance_min")&&!!(await pa.$('[data-pl="options.assurance_colis"]'))&&!!(await pa.$('[data-pl="nouvelle_regle_min"]'))&&!!(await pa.$('[data-plb="seuils.reglage_actif"]')),cl2);
await pa.fill('[data-pl="seuils.nouveau_delai_relance_min"]','abc');await pa.press('[data-pl="seuils.nouveau_delai_relance_min"]','Tab');
t("tarifs : contrôle générique en ligne d'une clé inconnue",(await pa.textContent("#e-pl-seuils\\.nouveau_delai_relance_min")).includes("nouveau_delai_relance_min"));
await pa.fill('[data-pm]','Test clés dynamiques');await pa.click('[data-a=enregistrerplan]');t("enregistrement refusé : focus sur le champ invalide",await pa.evaluate(()=>document.activeElement.dataset.pl==="seuils.nouveau_delai_relance_min"));
await pa.fill('[data-pl="seuils.nouveau_delai_relance_min"]','9,5');await pa.click('[data-a=enregistrerplan]');t("enregistrement : confirmation demandée",!!(await pa.$("[role=alertdialog]")));await conf(pa);
const pl=await pa.evaluate(()=>LS.get("plan",null));t("nouvelle version : clés dynamiques converties en nombres (virgule acceptée), booléen conservé",pl.version===2&&pl.seuils.nouveau_delai_relance_min===9.5&&pl.options.assurance_colis===250&&pl.nouvelle_regle_min===3&&pl.seuils.reglage_actif===true,pl.seuils);
await pa.evaluate(()=>LS.set("plan",null));
/* --- accessibilité : clavier, contrastes, cibles tactiles, titres --- */
await pf.reload();await pf.keyboard.press("Tab");t("clavier : premier arrêt = lien d'évitement vers le contenu",await pf.evaluate(()=>document.activeElement.classList.contains("skip")));
await pf.keyboard.press("Enter");t("clavier : le lien d'évitement place le focus sur le contenu",await pf.evaluate(()=>document.activeElement.id==="main"));
await pf.focus('nav.tabs [data-t=paiements]');await pf.keyboard.press("Enter");t("clavier : onglet activé au clavier, aria-current mis à jour",(await pf.getAttribute('nav.tabs [data-t=paiements]',"aria-current"))==="page"&&(await pf.title()).startsWith("Paiements"));
t("repères : header, nav nommée, main",await pf.evaluate(()=>!!document.querySelector("header")&&!!document.querySelector("nav[aria-label]")&&!!document.querySelector("main#main")));
t("formulaires : chaque champ a une étiquette",await (async()=>{await pf.click('[data-a=tab][data-t=nouvelle]');return pf.evaluate(()=>[...document.querySelectorAll("main input:not([type=checkbox]):not(.sr),main select,main textarea")].every(e=>e.labels&&e.labels.length||e.getAttribute("aria-label")))})());
const CONTR=async(p,nom)=>{const r=await p.evaluate(()=>{const parse=c=>{const m=c.match(/[\d.]+/g).map(Number);return{r:m[0],g:m[1],b:m[2],a:m[3]==null?1:m[3]}},lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const fond=e=>{const L=[];for(let n=e;n;n=n.parentElement){const c=parse(getComputedStyle(n).backgroundColor);if(c.a>0)L.push(c);if(c.a>=1)break}let res=L.pop()||{r:255,g:255,b:255,a:1};while(L.length){const x=L.pop();res={r:x.r*x.a+res.r*(1-x.a),g:x.g*x.a+res.g*(1-x.a),b:x.b*x.a+res.b*(1-x.a),a:1}}return res};
  const sels=[".btn:not(.s):not(.er):not(.ok)",".btn.s",".btn.er",".btn.ok",".chip",".chip.g",".chip.w",".chip.r",".chip.b",".nt",".ko",".fe",".kpi span","nav.tabs button","nav.tabs button.on","th","label.l",".lk",".eb","h1","body"],o=[];
  sels.forEach(s=>{[...document.querySelectorAll(s)].filter(e=>e.getClientRects().length&&!e.disabled&&e.textContent.trim()).slice(0,3).forEach(e=>{const c=parse(getComputedStyle(e).color),bg=fond(e),a=lum(c),b=lum(bg),r=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(r<4.5)o.push(s+" "+r.toFixed(2))})});return o});
 t("contraste ≥ 4,5:1 : "+nom,r.length===0,r)};
for(const sch of ["light","dark"]){await pf.emulateMedia({colorScheme:sch});await pa.emulateMedia({colorScheme:sch});
 await pf.click('[data-a=tab][data-t=livraisons]');await pf.click('[data-a=creerliv]').catch(()=>{});await CONTR(pf,"portail, mode "+(sch==="dark"?"sombre":"clair"));await shot(pf,"portail-"+sch);
 await pa.click('[data-a=tab][data-t=tableau]');await CONTR(pa,"administration, mode "+(sch==="dark"?"sombre":"clair"));await pa.click('[data-a=tab][data-t=commandes]');await CONTR(pa,"administration (liste), mode "+(sch==="dark"?"sombre":"clair"));await shot(pa,"admin-"+sch);}
await pf.emulateMedia({colorScheme:"light"});await pa.emulateMedia({colorScheme:"light"});
/* cibles tactiles ≥ 44 px sur téléphone */
await pf.setViewportSize({width:390,height:800});await pa.setViewportSize({width:390,height:800});
const petites=async(p,tab)=>{await p.click('[data-a=tab][data-t='+tab+']');return p.evaluate(()=>[...document.querySelectorAll("#app button,#app select,#app a.btn,#app input:not([type=checkbox]):not([type=file]):not(.sr),#app textarea,#app .lk")].filter(e=>e.getClientRects().length&&!e.disabled).map(e=>({e:e.tagName+"."+e.className+":"+(e.textContent||e.id).trim().slice(0,18),h:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.h<44).slice(0,5))};
const pt=[];for(const tb of ["tableau","livraisons","nouvelle","import","paiements","factures","parametres"])pt.push(...(await petites(pf,tb)));for(const tb of ["tableau","comptes","commandes","finance","tarifs","incidents","audit","equipe"])pt.push(...(await petites(pa,tb)));
t("tactile : tous les boutons et champs font au moins 44 px sur téléphone",pt.length===0,pt.slice(0,6));
t("téléphone : onglets en barre fixe en bas de l'écran, utilisable au pouce",await pf.evaluate(()=>{const n=document.querySelector("nav.tabs").getBoundingClientRect();return getComputedStyle(document.querySelector("nav.tabs")).position==="fixed"&&Math.abs(n.bottom-innerHeight)<2&&n.height>=48}));
t("téléphone : fenêtres en plein écran",await (async()=>{await pf.click('[data-a=tab][data-t=livraisons]');await pf.click('button.lk >> nth=1');const r=await pf.evaluate(()=>{const p=document.querySelector(".pop").getBoundingClientRect();return p.width>=innerWidth-1&&p.height>=innerHeight-1});await pf.keyboard.press("Escape");return r})());
t("téléphone : tableaux en cartes empilées (en-têtes masqués, libellés par ligne)",await pf.evaluate(()=>getComputedStyle(document.querySelector("table.rs thead")).display==="none"&&!!document.querySelector("td[data-l]")&&getComputedStyle(document.querySelector("table.rs tr")).display==="block"));
await pf.setViewportSize({width:1100,height:900});await pa.setViewportSize({width:1100,height:900});
/* --- impression : relevé et facture --- */
await pf.evaluate(()=>{const L=ledger();LS.set("factures",[{numero:"FAC-2026-0001",client:"SPRO",clientNom:"Maison Koné & Fils",periode:"2026-11",emise_le:Date.now(),statut:"emise",lignes:[{libelle:"11B-2026-00002 · Marcory",montant:2500}],sous_total:2500,taxes:0,total:2500}])});await pf.reload();
await pf.click('[data-a=tab][data-t=paiements]');await pf.evaluate(()=>{document.body.dataset.print="releve"});await pf.emulateMedia({media:"print"});
t("impression du relevé : en-tête, onglets et formulaire masqués, relevé et titre d'impression visibles",await pf.evaluate(()=>{const v=s=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=="none"};return !v("header.top")&&!v("nav.tabs")&&v("#releve")&&v("#releve .only-print")&&!document.querySelector(".two > section:not(#releve)")||(!v(".two > section:not(#releve)"))}));
await pf.emulateMedia({media:"screen"});await pf.evaluate(()=>{delete document.body.dataset.print});
await pf.click('[data-a=tab][data-t=factures]');await pf.click('[data-a=voirfac]');await pf.evaluate(()=>{document.body.dataset.print="facture"});await pf.emulateMedia({media:"print"});
t("impression de la facture : seule la facture est imprimée, sans boutons, fond blanc",await pf.evaluate(()=>{const v=s=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=="none"};return !v("header.top")&&!v("main")&&v(".pop.fact")&&!v(".pop .btn")&&getComputedStyle(document.body).backgroundColor==="rgb(255, 255, 255)"&&getComputedStyle(document.querySelector(".ov")).position==="static"}));
await pf.emulateMedia({media:"screen"});await pf.evaluate(()=>{delete document.body.dataset.print});await pf.keyboard.press("Escape");
/* --- actions irréversibles : confirmation (administration) --- */
await pa.click('[data-a=tab][data-t=commandes]');await pa.fill('[data-q]','00006');await pa.click('button.lk >> nth=0');await pa.fill('textarea[data-m]','Test');
const annB=await pa.$('[data-a=annulercmd]');if(annB){await pa.click('[data-a=annulercmd]');t("admin : annulation de commande demande confirmation avant d'agir",!!(await pa.$("[role=alertdialog]"))&&(await pa.evaluate(()=>LIV.lire().filter(o=>o.statut==="cancelled").length))===10);await pa.click('[data-a=confirmno]');t("admin : « non » ne change rien",(await pa.evaluate(()=>LIV.lire().filter(o=>o.statut==="cancelled").length))===10)}
else t("admin : bouton d'annulation disponible",false);
await pa.keyboard.press("Escape");
/* --- hors ligne : le service worker sert les pages --- */
{const c3=await nouveau(),p=await mk(c3,"fournisseur.html");await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:8000}).catch(()=>{});
 await p.evaluate(()=>caches.keys().then(k=>k.length));await c3.setOffline(true);let hors=false;try{await p.reload();hors=(await p.title()).includes("Entreprises")}catch(e){}
 t("hors réseau : le portail se recharge depuis le cache",hors);
 const pa2=await c3.newPage();pa2.on("pageerror",e=>errs.push("admin hors ligne: "+e.message));let h2=false;try{await pa2.goto(base+"/admin.html");h2=(await pa2.title()).includes("Administration")}catch(e){}t("hors réseau : l'administration aussi",h2);await c3.close()}
t("aucune erreur JavaScript ni erreur de console (toutes pages, toutes largeurs)",errs.length===0,errs.slice(0,5));
console.log(ok+" PASS, "+ko+" FAIL");await b.close();srv.close();process.exit(ko?1:0)})().catch(e=>{console.log("EXC",e.message.split("\n").slice(0,5).join(" | "));process.exit(1)})})();
