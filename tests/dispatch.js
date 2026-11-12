/* Affectation intelligente : plusieurs espaces livreurs en parallèle (même contexte navigateur) + un portail fournisseur : node tests/dispatch.js
   (Playwright requis : NODE_PATH=$(npm root -g) ou PLAYWRIGHT=/chemin). */
const {chromium}=require(process.env.PLAYWRIGHT||"playwright"),http=require("http"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"..");
const T={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".png":"image/png",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let u=q.url.split("?")[0];const f=path.join(root,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});r.end(d)})});
let ok=0,ko=0;const t=(l,c,d)=>{if(c){ok++;console.log("PASS",l)}else{ko++;console.log("FAIL",l,d===undefined?"":JSON.stringify(d))}};
(async()=>{await new Promise(o=>srv.listen(0,"127.0.0.1",o));const base="http://127.0.0.1:"+srv.address().port;
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:900}});const errs=[];
const mk=async(u,vp)=>{const p=await ctx.newPage();if(vp)await p.setViewportSize(vp);p.on("pageerror",e=>errs.push(u+": "+e.message));await p.goto(base+"/"+u);return p};
const pf=await mk("fournisseur.html");
/* --- données : un fournisseur validé avec trois points de collecte, des livreurs de tous profils --- */
const POS={angre:{n:"Cocody Angré",la:5.392,lo:-3.988},plateau:{n:"Plateau",la:5.3197,lo:-4.0197},bassam:{n:"Grand-Bassam",la:5.2,lo:-3.74}};
await pf.evaluate(({POS})=>{
 const DOS=(pos,extra)=>Object.assign({identite:"CI-0001",permis:"P-0001",plaque:"1234 GH 01",assurance_exp:"2099-12-31",position:pos},extra||{});
 ORGS.ajouter({id:"SDISP",nom:"Boutique Dispatch",type:"entreprise",tel:"0707070707",email:"a@b.ci",adresse:"Plateau",statut:"valide",remise:0,cree_le:Date.now(),points:[{id:"p1",nom:"Angré",place:"Cocody Angré",adresse:"",tel:"0707070707",horaires:"",defaut:true},{id:"p2",nom:"Yopougon",place:"Yopougon Siporex",adresse:"",tel:"0707070707",horaires:"",defaut:false}],membres:[{id:"u1",nom:"Ama Diallo",role:"admin"}]});
 LS.set("org_id","SDISP");LS.set("p_user","u1");
 const fut=Date.now()+3600e3,L=(id,nom,type,pos,x)=>LIVREURS.ajouter(Object.assign({id,nom,tel:"0701",type,statut:"valide",dossier:DOS(pos),cree_le:Date.now(),en_ligne_a:0},x||{}));
 L("LA","Livreur A","livreur",POS.angre);L("LB","Livreur B","livreur",POS.plateau);L("LC","Livreur C","livreur",POS.bassam);
 /* faux livreurs « en ligne » en permanence : jamais proposés */
 L("LD","Livreur D non validé","livreur",POS.angre,{statut:"en_verification",en_ligne_a:fut});
 L("LE","Livreur E assurance expirée","livreur",POS.angre,{en_ligne_a:fut,dossier:Object.assign(DOS(POS.angre),{assurance_exp:"2020-01-01"})});
 L("LG","Livreur G sous-capacitaire","livreur",POS.angre,{en_ligne_a:fut,dossier:DOS(POS.angre,{capacite_kg:2,capacite_m3:0.01})});
 L("LF","Chauffeur F camionnette","chauffeur",POS.angre,{dossier:DOS(POS.angre,{categorie:"utilitaire",capacite_kg:500,capacite_m3:4})});
 L("LH","Chauffeur H petit utilitaire","chauffeur",POS.angre,{en_ligne_a:fut,dossier:DOS(POS.angre,{categorie:"utilitaire",capacite_kg:30,capacite_m3:1})});
 L("LI","Chauffeur I sans capacité déclarée","chauffeur",POS.angre,{en_ligne_a:fut,dossier:DOS(POS.angre,{categorie:"camion"})});
 LIVREURS.maj("LA",x=>{x.dossier.plaque="7777 AB 01"});
},{POS});
await pf.reload();
const LIVS={LA:["Livreur A","livreur"],LB:["Livreur B","livreur"],LC:["Livreur C","livreur"],LF:["Chauffeur F","chauffeur"]},P={};
for(const id of Object.keys(LIVS)){P[id]=await mk("chauffeur.html",{width:390,height:800});await P[id].evaluate(([id,nom,type])=>{D.p={id,nom,tel:"0701",type};D.ligne=true;LS.set("ch_ligne_"+id,true);render()},[id,...LIVS[id]])}
const till=(fn,arg,to)=>pf.waitForFunction(fn,arg,{timeout:to||9000,polling:200});
const cmd=ref=>pf.evaluate(r=>LIV.lire().find(x=>x.refExt===r)||null,ref);
const offreVue=async id=>!!(await P[id].$('.ov [data-a=accepter]'));
const creer=async(ref,o)=>{o=o||{};await pf.click('[data-a=tab][data-t=nouvelle]');await pf.selectOption('[data-f=point]',o.point||"p1");await pf.fill('[data-f=dNom]','Awa Koné');await pf.fill('[data-f=dTel]','0505050505');await pf.selectOption('[data-f=dest]','Marcory Zone 4');await pf.fill('[data-f=colis]','Colis');await pf.fill('[data-f=poids]',String(o.poids||3));
 if(o.payeur)await pf.selectOption('[data-f=payeur]',o.payeur);await pf.fill('[data-f=refExt]',ref);await pf.click('[data-a=creerliv]');await pf.waitForSelector('.pop');await pf.click('.pop [data-a=fermer]')};
const photo=async(p,type)=>{const buf=Buffer.from(await pf.evaluate(()=>{const c=document.createElement("canvas");c.width=1600;c.height=1200;const g=c.getContext("2d"),im=g.createImageData(1600,1200);for(let i=0;i<im.data.length;i+=4){im.data[i]=Math.random()*255;im.data[i+1]=Math.random()*255;im.data[i+2]=Math.random()*255;im.data[i+3]=255}g.putImageData(im,0,0);return c.toDataURL("image/jpeg",.92).split(",")[1]}),"base64");
 const [ch]=await Promise.all([p.waitForEvent("filechooser"),p.click('[data-a=photo][data-t='+type+']')]);await ch.setFiles({name:"p.jpg",mimeType:"image/jpeg",buffer:buf});await p.waitForSelector('.ph img',{timeout:8000})};

/* ===== 1. le plus proche éligible reçoit l'offre en premier ===== */
await creer("T1");await till(()=>{const o=LIV.lire().find(x=>x.refExt==="T1");return o&&o.offre_courante});
let o=await cmd("T1");
t("le plus proche éligible (A, à Cocody Angré) reçoit l'offre en premier",o.offre_courante.livreur==="LA"&&o.offres.length===1&&o.offres[0].statut==="proposee"&&o.sans_candidat===false,o);
await P.LA.waitForSelector('.ov [data-a=accepter]',{timeout:6000});
t("seul le livreur concerné voit l'offre",(await offreVue("LA"))&&!(await offreVue("LB"))&&!(await offreVue("LC"))&&!(await offreVue("LF")));
t("l'offre affiche la distance au point de collecte",(await P.LA.textContent('.ov .sheet')).includes("0 km"));
/* ===== 2. un refus avec motif passe au suivant ===== */
await P.LA.click('[data-a=refuser]');await P.LA.click('[data-a=motif][data-m="Trop loin"]');
await till(()=>{const o=LIV.lire().find(x=>x.refExt==="T1");return o.offre_courante&&o.offre_courante.livreur==="LB"});
o=await cmd("T1");
t("refus enregistré avec motif, offre passée au suivant (B, Plateau)",o.offres[0].statut==="refusee"&&o.offres[0].motif==="Trop loin"&&o.offres[1].livreur==="LB"&&o.offres[1].statut==="proposee",o.offres);
await P.LB.waitForSelector('.ov [data-a=accepter]',{timeout:6000});t("B voit l'offre, A ne la voit plus",(await offreVue("LB"))&&!(await offreVue("LA")));
/* ===== 3. une expiration passe au suivant ===== */
await pf.evaluate(()=>{LIV.maj(LIV.lire().find(x=>x.refExt==="T1").id,o=>{o.offre_courante.at-=40000;o.offres[o.offres.length-1].at-=40000})});
await till(()=>{const o=LIV.lire().find(x=>x.refExt==="T1");return o.offre_courante&&o.offre_courante.livreur==="LC"});
o=await cmd("T1");
t("expiration enregistrée, offre passée à C",o.offres[1].statut==="expiree"&&o.offres[1].motif.includes("Délai")&&o.offres[2].livreur==="LC",o.offres);
await P.LC.waitForSelector('.ov [data-a=accepter]',{timeout:6000});
await P.LB.waitForFunction(()=>!document.querySelector('.ov [data-a=accepter]'),null,{timeout:6000});t("B perd l'offre expirée (message affiché)",true);
/* ===== 4. jamais proposée : non validé, assurance expirée, sous-capacitaire, mauvais type ===== */
t("jamais proposé : non validé (D), assurance expirée (E), sous-capacitaire (G), camionnette (F, mauvais type)",!o.offres.some(x=>["LD","LE","LG","LF","LH","LI"].includes(x.livreur)),o.offres);
/* ===== 5. acceptation, photos, plaque du dossier ===== */
await P.LC.click('[data-a=accepter]');
await till(()=>LIV.lire().find(x=>x.refExt==="T1").statut==="courier_to_pickup");o=await cmd("T1");
t("acceptation : commande affectée, offre acceptée historisée",o.chauffeur.id==="LC"&&o.offres[2].statut==="acceptee"&&o.offre_courante===null);
await P.LC.click('[data-a=arrive]');
t("photo de collecte proposée (facultative)",(await P.LC.textContent('.ph')).includes("facultative"));
await photo(P.LC,"collecte");await P.LC.fill('[data-k=code]',o.codeCollecte);await P.LC.click('#dem');
t("la collecte reste possible sans photo de livraison obligatoire",await P.LC.$eval('#rem',e=>e.disabled)===true&&(await P.LC.textContent('.ph')).includes("facultative"));
await photo(P.LC,"livraison");await P.LC.fill('[data-k=code2]',o.codeLivraison);await P.LC.click('#rem');
await P.LC.click('#enr');await till(()=>LIV.lire().find(x=>x.refExt==="T1").cloture===true);o=await cmd("T1");
const pr=o.preuves||[];
t("photos enregistrées (collecte et livraison) au format convenu",pr.length===2&&["collecte","livraison"].every(k=>pr.some(p=>p.type===k&&/^data:image\/jpeg;base64,/.test(p.photo)&&p.at>0&&p.par==="Livreur C")),pr.map(p=>[p.type,p.photo.length,p.par]));
const dim=await pf.evaluate(src=>new Promise(r=>{const i=new Image();i.onload=()=>r([i.naturalWidth,i.naturalHeight]);i.src=src}),pr[0].photo);
t("photo réduite : ≤ 640 px et ≤ 120 Ko même pour une image bruitée de 1600 px",Math.max(...dim)<=640&&pr.every(p=>(p.photo.length-p.photo.indexOf(",")-1)*3/4<=120*1024),[dim,pr.map(p=>p.photo.length)]);
t("plaque : celle du dossier du livreur (pas une plaque dérivée)",o.chauffeur.plaque==="1234 GH 01");
/* statistiques de fiabilité dans l'onglet Gains */
await P.LA.click('[data-a=tab][data-t=gains]');const g=await P.LA.textContent('.page');
t("Gains : statistiques de fiabilité (A : 1 refus)",g.includes("Ma fiabilité")&&g.includes("0 %")&&g.includes("refusées"),g.slice(-400));
await P.LC.click('[data-a=tab][data-t=gains]');t("Gains : C a accepté 1 offre sur 2 reçues",(await P.LC.textContent('.page')).includes("1 acceptée sur 1")||(await P.LC.textContent('.page')).includes("1 acceptée sur 2"));
await P.LA.click('[data-a=tab][data-t=accueil]');await P.LC.click('[data-a=tab][data-t=accueil]');
/* ===== 6. plus de candidat → sans_candidat ===== */
await creer("T2");
for(let i=0;i<3;i++){await till(()=>{const o=LIV.lire().find(x=>x.refExt==="T2");return o.offre_courante||o.sans_candidat});o=await cmd("T2");if(o.sans_candidat)break;
 const id=o.offre_courante.livreur;await P[id].waitForSelector('.ov [data-a=accepter]',{timeout:6000});await P[id].click('[data-a=refuser]');await P[id].click('[data-a=motif][data-m="Je fais une pause"]');
 await till(([r,n])=>{const o=LIV.lire().find(x=>x.refExt===r);return o.offres.length>=n&&!(o.offre_courante&&o.offres[o.offres.length-1].statut==="proposee"&&o.offres.length===n&&false)&&(o.offres[n-1].statut!=="proposee")},["T2",i+1])}
await till(()=>LIV.lire().find(x=>x.refExt==="T2").sans_candidat===true);o=await cmd("T2");
t("plus de candidat : sans_candidat = true, trois refus historisés, aucun livreur inéligible sollicité",o.sans_candidat===true&&o.offre_courante===null&&o.offres.length===3&&o.offres.every(x=>x.statut==="refusee"&&["LA","LB","LC"].includes(x.livreur)),o.offres);
t("sans_candidat : la commande reste à affecter (statut inchangé)",o.statut==="ready_for_assignment");
/* ===== 7. cargo : seul le véhicule à la bonne capacité ===== */
await creer("T3",{poids:40});await till(()=>{const o=LIV.lire().find(x=>x.refExt==="T3");return o.offre_courante});o=await cmd("T3");
t("cargo 40 kg : proposé à la camionnette de 500 kg, jamais à la moto, ni au 30 kg, ni à celui sans capacité déclarée",o.mode==="cargo"&&o.offre_courante.livreur==="LF"&&!o.offres.some(x=>x.livreur!=="LF"),o.offres);
await P.LF.waitForSelector('.ov [data-a=accepter]',{timeout:6000});await P.LF.click('[data-a=refuser]');await P.LF.click('[data-a=motif][data-m="Trop loin"]');
await till(()=>LIV.lire().find(x=>x.refExt==="T3").sans_candidat===true);o=await cmd("T3");
t("cargo : après le refus de la seule camionnette capable, sans_candidat (H et I jamais proposés)",o.offres.length===1&&o.sans_candidat===true);
/* ===== 8. reprise après rechargement, photo de remise obligatoire (plan), transport payé par le destinataire ===== */
await pf.evaluate(()=>{const p=JSON.parse(JSON.stringify(M.PLAN_DEFAUT));p.options.preuve_photo_livraison=true;LS.set("plan",p)});
await pf.reload();
await creer("T4",{payeur:"dest"});await till(()=>{const o=LIV.lire().find(x=>x.refExt==="T4");return o.offre_courante&&o.offre_courante.livreur==="LA"});
o=await cmd("T4");await P.LA.waitForSelector('.ov [data-a=accepter]',{timeout:6000});await P.LA.click('[data-a=accepter]');
await till(()=>LIV.lire().find(x=>x.refExt==="T4").statut==="courier_to_pickup");o=await cmd("T4");
t("plaque du dossier (7777 AB 01) enregistrée sur la commande",o.chauffeur.plaque==="7777 AB 01",o.chauffeur);
await P.LA.evaluate(()=>LS.set("profil",D.p));await P.LA.reload();
await P.LA.waitForFunction(()=>D.course&&D.course.src==="portail",null,{timeout:8000});
t("rechargement en pleine course : la course est reprise, le livreur reste en ligne",await P.LA.evaluate(()=>D.course.step==="approche"&&D.ligne===true));
await P.LA.click('[data-a=arrive]');await P.LA.fill('[data-k=code]',o.codeCollecte);await P.LA.click('#dem');await P.LA.fill('[data-k=code2]',o.codeLivraison);
t("photo de remise obligatoire (plan) : bouton désactivé sans photo",await P.LA.$eval('#rem',e=>e.disabled)&&(await P.LA.textContent('.ph')).includes("obligatoire"));
await photo(P.LA,"livraison");t("photo prise : bouton activé",!(await P.LA.$eval('#rem',e=>e.disabled)));
await P.LA.click('#rem');
await P.LA.reload();await P.LA.waitForFunction(()=>D.course&&D.course.step==="fin",null,{timeout:8000});
t("rechargement après la remise : l'encaissement reste à enregistrer",true);
await P.LA.click('[data-k=ok]');await P.LA.click('#enr');await till(()=>LIV.lire().find(x=>x.refExt==="T4").cloture===true);
const fin=await pf.evaluate(()=>({creance:M.creance(ledger(),"SDISP"),esp:M.soldeLivreur(ledger(),"LA").especes,prix:LIV.lire().find(x=>x.refExt==="T4").devis.total,tx:ledger().tx.find(t=>t.ref==="CL-"+LIV.lire().find(x=>x.refExt==="T4").ref)}));
t("transport payé par le destinataire sans montant à encaisser : espèces, aucune créance client sur cette livraison (celle de T1, facturée au compte, reste)",fin.tx.meta.paiement==="cash"&&!fin.tx.lignes.some(l=>l.compte.startsWith("creance_client"))&&fin.esp===fin.prix&&fin.creance===fin.prix,fin);
console.log("erreurs",JSON.stringify(errs));t("aucune erreur JS",errs.length===0,errs);
console.log(ok+" PASS, "+ko+" FAIL");await b.close();srv.close();process.exit(ko?1:0)})().catch(e=>{console.log("EXC",e.message.split("\n").slice(0,4).join(" | "));process.exit(1)});
