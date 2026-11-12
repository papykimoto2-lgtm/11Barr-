/* Portail fournisseur + espace livreur dans deux pages : node tests/portail.js (Playwright requis : PLAYWRIGHT=/chemin si besoin). */
const {chromium}=require(process.env.PLAYWRIGHT||"playwright"),http=require("http"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),SP=require("os").tmpdir()+"/";
const T={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".png":"image/png",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let u=q.url.split("?")[0];const f=path.join(root,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});r.end(d)})});
let ok=0,ko=0;const t=(l,c,d)=>{if(c){ok++;console.log("PASS",l)}else{ko++;console.log("FAIL",l,d===undefined?"":JSON.stringify(d))}};
(async()=>{await new Promise(o=>srv.listen(0,"127.0.0.1",o));const base="http://127.0.0.1:"+srv.address().port;
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:900}});const errs=[];
const mk=async(u,vp)=>{const p=await ctx.newPage();if(vp)await p.setViewportSize(vp);p.on("pageerror",e=>errs.push(u+": "+e.message));await p.goto(base+"/"+u);return p};
const pf=await mk("fournisseur.html"),pd=await mk("chauffeur.html",{width:390,height:800}),pa=await mk("admin.html");
const toast=async p=>(await p.$$eval("#toast",e=>e.map(n=>n.textContent).join(" | ")).catch(()=>""))||"";
/* --- inscription et validation --- */
t("inscription : formulaire affiché",!!(await pf.$('[data-a=creerorg]')));
await pf.click('[data-a=creerorg]');t("inscription : champs obligatoires contrôlés",(await toast(pf)).includes("À compléter"));
await pf.selectOption('[data-r=type]','entreprise');await pf.fill('[data-r=nom]','Boutique Test SARL');await pf.fill('[data-r=tel]','0707070707');await pf.fill('[data-r=email]','contact@test.ci');await pf.fill('[data-r=adresse]','Marcory Zone 4, rue 12');await pf.fill('[data-r=contact]','Ama Diallo');
await pf.click('[data-a=creerorg]');t("compte non validé : accès bloqué",(await pf.textContent("main")).includes("vérification")&&!(await pf.$('[data-a=tab]')));
await pa.click('[data-a=tab][data-t=comptes]');await pa.click('tr.k');await pa.fill('[data-rem]','10');await pa.click('[data-a=orgstatut][data-v=valide]');
await pf.waitForFunction(()=>document.querySelector("#app").textContent.includes("Tableau de bord"),null,{timeout:6000});{const mt=await pf.textContent("main");t("compte validé par l'administration : tableau de bord",mt.includes("Tableau de bord"),mt.slice(0,80))}
await pf.screenshot({path:SP+"p1-tableau.png"});
/* --- nouvelle livraison : devis, mode selon le poids, remise de contrat --- */
await pf.click('[data-a=tab][data-t=nouvelle]');
await pf.fill('[data-f=dNom]','Awa Koné');await pf.fill('[data-f=dTel]','0505050505');await pf.selectOption('[data-f=dest]','Marcory Zone 4');await pf.fill('[data-f=colis]','Robe');await pf.fill('[data-f=poids]','3');
let dv=await pf.textContent('#devis');t("devis : 3 kg → moto, remise de contrat visible",dv.includes("Moto")&&dv.includes("Remise contrat 10 %"),dv.slice(0,120));
await pf.fill('[data-f=poids]','40');dv=await pf.textContent('#devis');t("devis : 40 kg → Cargo",dv.includes("Cargo"));
await pf.fill('[data-f=poids]','3');await pf.fill('[data-f=cod]','12000');await pf.screenshot({path:SP+"p2-nouvelle.png"});
await pf.fill('[data-f=dTel]','12');await pf.click('[data-a=creerliv]');t("création refusée : téléphone invalide",(await toast(pf)).includes("Téléphone"));
await pf.fill('[data-f=dTel]','0505050505');await pf.fill('[data-f=refExt]','CMD-A1');await pf.click('[data-a=creerliv]');
await pf.waitForSelector('.pop');const o1=(await pf.evaluate(()=>LIV.lire()))[0];
t("livraison créée : statut « recherche d'un livreur », deux codes, historique",o1.statut==="ready_for_assignment"&&/^\d{4}$/.test(o1.codeCollecte)&&/^\d{4}$/.test(o1.codeLivraison)&&o1.evenements.length===2&&o1.ref.startsWith("11B-"),o1);
t("détail : codes affichés au fournisseur",(await pf.textContent('.pop')).includes(o1.codeCollecte)&&(await pf.textContent('.pop')).includes(o1.codeLivraison));
await pf.screenshot({path:SP+"p3-detail.png"});await pf.click('.pop [data-a=fermer]');
await pf.click('[data-a=tab][data-t=nouvelle]');await pf.fill('[data-f=dNom]','Doublon');await pf.fill('[data-f=dTel]','0505050505');await pf.fill('[data-f=refExt]','CMD-A1');await pf.click('[data-a=creerliv]');
t("doublon de référence refusé",(await toast(pf)).includes("déjà utilisée")&&(await pf.evaluate(()=>LIV.lire().length))===1);
/* --- livreur : profil moto, offre venant du portail --- */
await pd.fill('[data-k=nom]','Koffi Test');await pd.click('[data-a=type][data-t=livreur]');await pd.click('[data-a=entrer]');
await pd.click('[data-a=dossier]');await pd.fill('[data-k=dident]','CI-778899');await pd.fill('[data-k=dperm]','P-12345');await pd.fill('[data-k=dplaq]','1234 AB 01');await pd.fill('[data-k=dassu]','2099-12-31');await pd.click('[data-a=envoyerdossier]');
await pa.click('[data-a=tab][data-t=livreurs]');await pa.click('tr.k');await pa.click('[data-a=livstatut][data-v=valide]');await pd.click('[data-a=ligne]');
await pd.waitForSelector('[data-a=accepter]',{timeout:6000});const offre=await pd.textContent('.ov .sheet');
t("livreur : l'offre du portail arrive (produit à encaisser, numéro masqué)",offre.includes("à encaisser")&&offre.includes("Montant du colis")&&offre.includes("12\u00a0000")&&offre.includes("••"),offre.slice(0,200));
await pd.screenshot({path:SP+"p4-offre.png"});await pd.click('[data-a=accepter]');
await pf.waitForFunction(()=>document.querySelector("#app").textContent.includes("Livreur"),null,{timeout:6000}).catch(()=>{});
await pf.click('[data-a=tab][data-t=livraisons]');await pf.waitForFunction(()=>document.querySelector("table")&&document.querySelector("table").textContent.includes("En route vers la collecte"),null,{timeout:6000});t("portail : statut « en route vers la collecte » en direct",true);
/* collecte : mauvais code puis bon code */
await pd.click('[data-a=arrive]');await pd.fill('[data-k=code]','0000');await pd.click('#dem');t("collecte : mauvais code refusé",(await toast(pd)).includes("incorrect"));
await pd.fill('[data-k=code]',o1.codeCollecte);await pd.click('#dem');
await pf.waitForFunction(()=>document.querySelector("table").textContent.includes("En transit"),null,{timeout:6000});t("portail : « en transit » après collecte",true);
t("livraison : bouton désactivé sans code destinataire",await pd.$eval('#rem',e=>e.disabled));
await pd.fill('[data-k=code2]','0000');t("livraison : mauvais code destinataire → toujours désactivé",await pd.$eval('#rem',e=>e.disabled));
await pd.fill('[data-k=code2]',o1.codeLivraison);t("livraison : bon code → activé",!(await pd.$eval('#rem',e=>e.disabled)));
await pd.click('#rem');await pf.waitForFunction(()=>document.querySelector("table").textContent.includes("Livré"),null,{timeout:6000});t("portail : « livré » avec preuve",true);
await pf.click('tr.k');const det=await pf.textContent('.pop');t("portail : preuve et historique complets",det.includes("code destinataire vérifié")&&det.includes("Colis récupéré")&&det.includes("En transit"));await pf.click('.pop [data-a=fermer]');
await pd.click('[data-k=ok]');await pd.click('#enr');
const o2=(await pf.evaluate(()=>LIV.lire()))[0];t("livraison clôturée dans le journal",o2.cloture===true&&o2.statut==="delivered");
/* --- argent : COD, reversement, facture --- */
await pf.click('[data-a=tab][data-t=paiements]');
await pf.waitForFunction(()=>document.querySelector("main").textContent.includes("12 000"),null,{timeout:6000});t("paiements : 12 000 F encaissés pour le fournisseur",true);
await pf.screenshot({path:SP+"p5-paiements.png"});
await pf.fill('[data-v=m]','999999');await pf.fill('[data-v=c]','0707070707');await pf.click('[data-a=demandervers]');t("reversement au-delà du dû refusé",(await toast(pf)).includes("dépasse"));
await pf.fill('[data-v=m]','5000');await pf.click('[data-a=demandervers]');
await pa.click('[data-a=tab][data-t=finance]');await pa.click('[data-a=approuver][data-k=rev]');await pa.click('[data-a=executer][data-k=rev]');
t("reversement impossible tant que les livreurs n'ont pas remis les fonds",(await toast(pa)).includes("pas encore remis"));
await pd.click('[data-a=tab][data-t=gains]');await pd.click('[data-a=vers]');await pd.click('[data-a=envoyerv]');
await pa.waitForSelector('[data-a=validervers]',{timeout:4000});await pa.click('[data-a=validervers]');t("versement du livreur validé par l'administration",(await toast(pa)).includes("validé"));
await pa.click('[data-a=executer][data-k=rev]');
await pf.click('[data-a=tab][data-t=livraisons]');await pf.click('[data-a=tab][data-t=paiements]');await pf.waitForFunction(()=>document.querySelector("main").textContent.includes("Versé"),null,{timeout:6000});
t("reversement exécuté après remise des fonds par le livreur",(await pf.evaluate(()=>M.fondsTiers(ledger())))===7000);
t("journal équilibré, fonds de tiers hors revenu",await pf.evaluate(()=>M.equilibre(ledger())&&M.revenuPropre(ledger())<2000));
await pf.click('[data-a=tab][data-t=factures]');await pf.click('[data-a=facturer]');
const fac=(await pf.evaluate(()=>LS.get("factures",[])))[0];t("facture périodique générée et numérotée",!!fac&&/^FAC-\d{4}-0001$/.test(fac.numero)&&fac.total===o2.devis.total,fac);
await pf.click('[data-a=voirfac]');await pf.screenshot({path:SP+"p6-facture.png"});await pf.click('.pop [data-a=fermer]');
t("la livraison facturée n'est plus proposée",(await pf.evaluate(()=>LIV.lire()[0].facture))===fac.numero);
t("portail : plus de bouton de paiement de facture (réservé à l'administration)",!(await pf.$('[data-a=payerfac]')));
await pa.click('[data-a=tab][data-t=finance]');await pa.fill('[data-ref]','VIR-2026-1');await pa.click('[data-a=payerfac]');
await pf.waitForFunction(()=>document.querySelector("main").textContent.includes("Payée"),null,{timeout:6000});t("facture payée par l'administration : créance soldée",(await pf.evaluate(()=>M.creance(ledger(),P.org.id)))===0);
/* --- import CSV --- */
await pf.click('[data-a=tab][data-t=import]');await pf.click('[data-a=exemple]');await pf.click('[data-a=analyser]');
const ap=await pf.textContent('main');t("import : aperçu — 2 lignes valides, 3 en erreur",ap.includes("2 valide(s), 3 en erreur")&&ap.includes("destination inconnue")&&ap.includes("téléphone invalide")&&ap.includes("doublon"),ap.slice(ap.indexOf("Aperçu"),ap.indexOf("Aperçu")+60));
await pf.screenshot({path:SP+"p7-import.png"});await pf.click('[data-a=importer]');
t("import : 2 livraisons créées, rapport d'erreurs téléchargeable",(await pf.evaluate(()=>LIV.lire().length))===3&&(await pf.textContent('main')).includes("2 livraison(s) créée(s)")&&!!(await pf.$('a[download]')));
await pf.click('[data-a=exemple]');await pf.click('[data-a=analyser]');t("import rejoué : plus aucune ligne valide (pas de doublon)",(await pf.textContent('main')).includes("0 valide(s)"));
/* --- rôles --- */
await pf.click('[data-a=tab][data-t=parametres]');await pf.fill('[data-mb=nom]','Marc Opérateur');await pf.click('[data-a=mbadd]');
const mid=await pf.evaluate(()=>P.org.membres[1].id);await pf.selectOption('[data-user]',mid);
t("opérateur : pas d'accès à la finance ni aux paramètres",!(await pf.$('[data-a=tab][data-t=paiements]'))&&!(await pf.$('[data-a=tab][data-t=parametres]'))&&!!(await pf.$('[data-a=tab][data-t=nouvelle]')));
await pf.evaluate(()=>{P.org.membres.push({id:"u9",nom:"Lecteur",role:"lecture"});saveOrg();render()});await pf.selectOption('[data-user]','u9');
t("lecture seule : ne peut ni créer ni importer",!(await pf.$('[data-a=tab][data-t=nouvelle]'))&&!(await pf.$('[data-a=tab][data-t=import]'))&&!!(await pf.$('[data-a=tab][data-t=paiements]')));
await pf.selectOption('[data-user]','u1');
/* --- isolation entre fournisseurs et annulation --- */
await pf.evaluate(()=>{const l=LIV.lire();l.push(Object.assign({},l[0],{id:"autre",org:"AUTRE",ref:"11B-X",statut:"ready_for_assignment"}));LIV.ecrire(l)});await pf.click('[data-a=tab][data-t=livraisons]');
t("isolation : un autre fournisseur ne voit pas les livraisons d'autrui",!(await pf.textContent('main')).includes("11B-X"));
await pf.click('tr.k >> nth=0');const ann=await pf.$('[data-a=annulerliv]');t("annulation proposée sur une livraison en recherche",!!ann);
if(ann){await ann.click();await pf.waitForTimeout(300);const s=(await pf.evaluate(()=>LIV.lire().filter(o=>o.org===P.org.id).sort((a,b)=>b.cree_le-a.cree_le)[0].statut));t("annulation : statut annulé",s==="cancelled",s)}
t("aucune erreur JavaScript",errs.length===0,errs);
console.log(ok+" PASS, "+ko+" FAIL");await b.close();srv.close();process.exit(ko?1:0)})().catch(e=>{console.log("EXC",e.message.split("\n").slice(0,3).join(" | "));process.exit(1)});
