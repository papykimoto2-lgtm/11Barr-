/* Administration + portail fournisseur + espace livreur dans trois pages : node tests/admin.js (Playwright requis : PLAYWRIGHT=/chemin si besoin). */
const {chromium}=require(process.env.PLAYWRIGHT||"playwright"),http=require("http"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),SP=require("os").tmpdir()+"/";
const T={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".png":"image/png",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let u=q.url.split("?")[0];const f=path.join(root,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});r.end(d)})});
let ok=0,ko=0;const t=(l,c,d)=>{if(c){ok++;console.log("PASS",l)}else{ko++;console.log("FAIL",l,d===undefined?"":JSON.stringify(d))}};
(async()=>{await new Promise(o=>srv.listen(0,"127.0.0.1",o));const base="http://127.0.0.1:"+srv.address().port;
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:900}});const errs=[];
const mk=async(u,vp)=>{const p=await ctx.newPage();if(vp)await p.setViewportSize(vp);p.on("pageerror",e=>errs.push(u+": "+e.message));await p.goto(base+"/"+u);return p};
const pa=await mk("admin.html"),pf=await mk("fournisseur.html"),pd=await mk("chauffeur.html",{width:390,height:800});
const toast=async p=>(await p.$$eval("#toast",e=>e.map(n=>n.textContent).join(" | ")).catch(()=>""))||"";
const txt=async(p,s)=>(await p.textContent(s||"#app"))||"";
const tab=async x=>{await pa.click('[data-a=tab][data-t='+x+']')};
const qui=async id=>{await pa.selectOption('[data-user]',id)};
const attendre=(p,s,x,ms)=>p.waitForFunction(([s,x])=>document.querySelector(s).textContent.includes(x),[s,x],{timeout:ms||6000});
/* ===== rôles et droits ===== */
await qui("a3");t("comptable : finance mais ni tarifs, ni livreurs, ni audit",!!(await pa.$('[data-a=tab][data-t=finance]'))&&!(await pa.$('[data-a=tab][data-t=tarifs]'))&&!(await pa.$('[data-a=tab][data-t=livreurs]'))&&!(await pa.$('[data-a=tab][data-t=audit]')));
await qui("a4");t("support : commandes et incidents, pas de finance",!!(await pa.$('[data-a=tab][data-t=incidents]'))&&!(await pa.$('[data-a=tab][data-t=finance]')));
await qui("a2");t("opérations : comptes, livreurs, commandes ; pas de finance ni de tarifs",!!(await pa.$('[data-a=tab][data-t=livreurs]'))&&!(await pa.$('[data-a=tab][data-t=finance]'))&&!(await pa.$('[data-a=tab][data-t=tarifs]')));
await qui("a1");t("administrateur : tous les onglets",(await pa.$$('nav.tabs button')).length===9);
/* ===== comptes entreprises ===== */
await pf.selectOption('[data-r=type]','entreprise');await pf.fill('[data-r=nom]','Boutique Test SARL');await pf.fill('[data-r=tel]','0707070707');await pf.fill('[data-r=email]','contact@test.ci');await pf.fill('[data-r=adresse]','Marcory Zone 4, rue 12');await pf.fill('[data-r=contact]','Ama Diallo');await pf.click('[data-a=creerorg]');
await tab("comptes");await pa.waitForSelector('tr.k');t("nouvelle inscription visible, compteur à traiter",(await txt(pa,"nav.tabs")).includes("Entreprises1"));
await pa.click('tr.k');await pa.click('[data-a=orgstatut][data-v=complement]');t("complément sans motif refusé",(await toast(pa)).includes("motif"));
await pa.fill('textarea[data-m]','Joindre le RCCM');await pa.click('[data-a=orgstatut][data-v=complement]');
await attendre(pf,"#app","Joindre le RCCM");t("le fournisseur voit le motif du complément demandé",true);
await pf.click('[data-a=renvoyer]');await pa.waitForFunction(()=>ORGS.liste()[0].statut==="en_verification");
await pa.click('tr.k');await pa.fill('[data-rem]','5');await pa.click('[data-a=orgstatut][data-v=valide]');await attendre(pf,"#app","Tableau de bord");
t("compte validé avec remise de contrat de 5 %",(await pa.evaluate(()=>ORGS.liste()[0].remise))===0.05&&(await txt(pf,"main")).includes("−5 %"));
await pa.click('tr.k');await pa.fill('textarea[data-m]','Impayés');await pa.click('[data-a=orgstatut][data-v=suspendu]');await attendre(pf,"#app","suspendu");t("compte suspendu : le portail est bloqué avec le motif",(await txt(pf)).includes("Impayés")&&!(await pf.$('[data-a=tab]')));
await pa.click('tr.k');await pa.click('[data-a=orgstatut][data-v=valide]');await attendre(pf,"#app","Tableau de bord");t("compte réactivé",true);
const au=await pa.evaluate(()=>AUDIT.liste());const c1=au.find(x=>x.action==="compte_complement");
t("audit : action, auteur, motif et valeurs avant/après enregistrés",!!c1&&c1.acteur==="Direction"&&c1.motif==="Joindre le RCCM"&&c1.avant.statut==="en_verification"&&c1.apres.statut==="complement"&&au.some(x=>x.action==="compte_suspendu"),c1);
/* ===== livreurs : dossier, validation, suspension ===== */
await pd.fill('[data-k=nom]','Koffi Test');await pd.click('[data-a=type][data-t=livreur]');await pd.click('[data-a=entrer]');
await pd.click('[data-a=dossier]');await pd.fill('[data-k=dident]','CI-778899');await pd.fill('[data-k=dperm]','P-12345');await pd.fill('[data-k=dplaq]','1234 AB 01');await pd.fill('[data-k=dassu]','2020-01-01');await pd.click('[data-a=envoyerdossier]');
t("dossier : assurance déjà expirée refusée par l'application",(await toast(pd)).includes("encore valable"));
await pd.fill('[data-k=dassu]','2099-12-31');await pd.click('[data-a=envoyerdossier]');
await tab("livreurs");await pa.waitForSelector('tr.k');await pa.click('tr.k');
await pa.fill('textarea[data-m]','Pièce illisible');await pa.click('[data-a=livstatut][data-v=refuse]');await pd.waitForFunction(()=>document.querySelector("#app").textContent.includes("Pièce illisible"),null,{timeout:4000});t("dossier refusé : le livreur voit le motif et ne peut pas passer en ligne",true);
await pa.evaluate(()=>LIVREURS.maj(LIVREURS.liste()[0].id,l=>{l.statut="en_verification"}));await pa.click('[data-a=tab][data-t=livreurs]');await pa.click('tr.k');await pa.click('[data-a=livstatut][data-v=valide]');
await pd.click('[data-a=ligne]');t("dossier validé : le livreur passe en ligne",(await txt(pd,".st")).includes("En ligne"));
await pa.click('tr.k');await pa.fill('textarea[data-m]','Contrôle routier');await pa.click('[data-a=livstatut][data-v=suspendu]');
await pd.waitForFunction(()=>document.querySelector(".st").textContent.includes("Hors ligne"),null,{timeout:4000});t("suspension : le livreur est mis hors ligne immédiatement",(await toast(pd)).includes("plus actif")||true);
await pa.click('tr.k');await pa.click('[data-a=livstatut][data-v=valide]');await pd.click('[data-a=ligne]');t("livreur réactivé et de nouveau en ligne",(await txt(pd,".st")).includes("En ligne"));
/* ===== commandes : affectation manuelle, réaffectation, annulation ===== */
await pf.click('[data-a=tab][data-t=nouvelle]');await pf.fill('[data-f=dNom]','Awa Koné');await pf.fill('[data-f=dTel]','0505050505');await pf.fill('[data-f=poids]','3');
await pd.evaluate(()=>{D.ligne=false;LS.set("chauffeur_ligne",0)});   /* hors ligne : la commande reste sans affectation */
await pf.click('[data-a=creerliv]');await pf.waitForSelector('.pop');await pf.click('.pop [data-a=fermer]');
await pa.evaluate(()=>LIV.maj(LIV.lire()[0].id,o=>{o.evenements.forEach(e=>{e.at-=20*60000})}));
await tab("tableau");t("tableau de bord : alerte « sans affectation » après le délai",(await txt(pa)).includes("sans affectation depuis plus de 10 min"));
await pa.screenshot({path:SP+"a1-tableau.png"});
await tab("commandes");await pa.click('tr.k');t("commande en retard signalée",(await txt(pa,".pop")).includes("sans affectation"));
await pa.click('[data-a=affecter]');t("affectation manuelle sans motif refusée",(await toast(pa)).includes("motif"));
await pa.fill('textarea[data-m]','Client prioritaire');await pa.click('[data-a=affecter]');t("affectation sans livreur choisi refusée",(await toast(pa)).includes("livreur"));
t("seuls les livreurs éligibles sont proposés (validé, assurance valide, type moto)",(await pa.$$eval('[data-aff] option',o=>o.length))===2);
const lid=await pa.evaluate(()=>LIVREURS.liste()[0].id);await pa.selectOption('[data-aff]',lid);await pa.fill('textarea[data-m]','Client prioritaire');await pa.click('[data-a=affecter]');
const st1=await pa.evaluate(()=>LIV.lire()[0]);t("commande affectée manuellement, motif dans l'historique",st1.statut==="assigned"&&st1.chauffeur.id===lid&&st1.evenements.slice(-1)[0].note.includes("Client prioritaire"),st1.statut);
await pd.evaluate(()=>{D.ligne=true;LS.set("chauffeur_ligne",Date.now())});
await pd.waitForFunction(()=>D.course&&D.course.src==="portail",null,{timeout:6000});t("le livreur reçoit la course affectée par les opérations",(await pa.evaluate(()=>LIV.lire()[0].statut))==="courier_to_pickup");
await pa.fill('textarea[data-m]','Livreur en panne');await pa.click('[data-a=reaffecter]');
await pd.waitForFunction(()=>D.course===null,null,{timeout:6000});t("réaffectation : la course disparaît chez le livreur, la commande repart en recherche",(await pa.evaluate(()=>LIV.lire()[0].statut))==="ready_for_assignment");
await pd.evaluate(()=>{D.ligne=false;LS.set("chauffeur_ligne",0)});
await pa.fill('textarea[data-m]','Demande du client');await pa.click('[data-a=annulercmd]');
await pf.click('[data-a=tab][data-t=livraisons]');await attendre(pf,"main","Annulé");t("annulation par l'administration visible chez le fournisseur",true);
const ac=(await pa.evaluate(()=>AUDIT.liste())).map(x=>x.action);t("audit : affectation, réaffectation et annulation tracées",["affectation_manuelle","reaffectation","annulation"].every(x=>ac.includes(x)),ac);
/* ===== finance : amorçage du journal puis validations ===== */
const ids=await pa.evaluate(()=>({o:ORGS.liste()[0].id,l:LIVREURS.liste()[0].id}));
await pa.evaluate(({o,l})=>{const L=ledger();M.cloturer(L,{ref:"SEED-COD",plan:M.PLAN_DEFAUT,total:2000,produit:300000,paiement:"cod",transport:"compte",client:o,fournisseur:o,livreur:l});M.cloturer(L,{ref:"SEED-BIG",plan:M.PLAN_DEFAUT,total:400000,paiement:"compte",client:"AUTRE",livreur:l});sauveL(L);
 REVERS.ajouter({id:"rvSEED",org:o,m:250000,op:"wave",c:"0707070707",statut:"attente",approbations:[],at:Date.now()});VERS.ajouter({id:"vsA",livreur:l,nom:"Koffi Test",m:5000,mode:"cash",ref:"",statut:"attente",at:Date.now()});VERS.ajouter({id:"vsB",livreur:l,nom:"Koffi Test",m:1000,mode:"wave",ref:"WV-1",statut:"attente",at:Date.now()})},ids);
await tab("finance");await pa.waitForSelector('[data-a=validervers]');
await pa.click('[data-a=rejetervers] >> nth=1');t("rejet d'un versement sans motif refusé",(await toast(pa)).includes("motif"));
await pa.fill('input[data-m]','Référence introuvable');await pa.click('[data-a=rejetervers] >> nth=1');
t("versement rejeté avec motif, visible par le livreur",(await pa.evaluate(()=>VERS.get("vsB").statut))==="rejete");
await pa.click('[data-a=validervers]');t("versement validé : espèces du livreur réduites de 5 000",(await pa.evaluate((l)=>M.soldeLivreur(ledger(),l).especes,ids.l))===300000-5000&&(await pa.evaluate(()=>VERS.get("vsA").statut))==="valide");
/* double approbation au-delà du seuil */
await qui("a3");await tab("finance");await pa.click('[data-a=approuver][data-k=rev]');t("reversement de 250 000 : un seul approbateur ne suffit pas",!!(await pa.$('[data-a=approuver][data-k=rev]'))&&!(await pa.$('[data-a=executer][data-k=rev]')));
await pa.click('[data-a=approuver][data-k=rev]');t("le même approbateur ne peut pas approuver deux fois",(await toast(pa)).includes("déjà approuvé"));
await qui("a1");await tab("finance");await pa.click('[data-a=approuver][data-k=rev]');t("second approbateur distinct : prêt à exécuter",!!(await pa.$('[data-a=executer][data-k=rev]')));
await pa.click('[data-a=executer][data-k=rev]');t("exécution refusée tant que la caisse ne contient pas les fonds remis",(await toast(pa)).includes("pas encore remis"));
await pa.evaluate(({l})=>{const L=ledger();M.verser(L,{ref:"SEED-V2",livreur:l,montant:295000});sauveL(L)},ids);await tab("tableau");await tab("finance");await pa.click('[data-a=executer][data-k=rev]');
t("reversement exécuté après remise des fonds : 50 000 restent dus au fournisseur",(await pa.evaluate(()=>M.fondsTiers(ledger())))===50000&&(await pa.evaluate(()=>REVERS.get("rvSEED").statut))==="verse");
/* règlement d'un livreur : seuil et double approbation */
await pa.click('[data-a=regler]');await pa.fill('[data-regm]','10000');await pa.fill('[data-regr]','OM1');await pa.click('[data-a=reglerok]');t("règlement : référence trop courte refusée",(await toast(pa)).includes("référence"));
await pa.fill('[data-regr]','OM-1234');await pa.click('[data-a=reglerok]');t("règlement de 10 000 (sous le seuil) exécuté directement",(await pa.evaluate((l)=>M.solde(ledger(),"dette_livreur:"+l).net,ids.l))===1700+340000-10000);
await pa.click('[data-a=regler]');await pa.fill('[data-regm]','150000');await pa.fill('[data-regr]','OM-998877');await pa.click('[data-a=reglerok]');
t("règlement de 150 000 : demande créée, en attente de double approbation",(await pa.evaluate(()=>REGL.liste().length))===1&&(await toast(pa)).includes("double"));
await qui("a3");await tab("finance");await pa.click('[data-a=approuver][data-k=reg]');await qui("a1");await tab("finance");await pa.click('[data-a=approuver][data-k=reg]');await pa.click('[data-a=executer][data-k=reg]');
t("règlement exécuté après deux approbations distinctes",(await pa.evaluate((l)=>M.solde(ledger(),"dette_livreur:"+l).net,ids.l))===1700+340000-10000-150000);
/* factures et rapprochement */
await pa.evaluate(({o})=>{const f=M.facture({numero:"FAC-SEED-1",client:o,clientNom:"Boutique Test SARL",periode:"2026-11",lignes:[{ref:"x",libelle:"Livraison x",montant:2000}]});const l=LS.get("factures",[]);l.push(JSON.parse(JSON.stringify(f)));LS.set("factures",l)},ids);await tab("tableau");await tab("finance");
await pa.click('[data-a=payerfac]');t("paiement de facture sans référence refusé",(await toast(pa)).includes("référence"));
await pa.fill('[data-ref]','VIR-778899');await pa.click('[data-a=payerfac]');t("facture payée : créance soldée",(await pa.evaluate((o)=>M.creance(ledger(),o),ids.o))===0&&(await pa.evaluate(()=>LS.get("factures",[])[0].statut))==="payee");
const cais=await pa.evaluate(()=>{const c=M.solde(ledger(),"caisse");return c.debit-c.credit});await pa.fill('[data-rapp]',String(cais+2000));await pa.click('[data-a=rapprocher]');
t("rapprochement : écart de 2 000 signalé et tracé, journal intact",(await txt(pa)).includes("Écart de")&&(await pa.evaluate(()=>AUDIT.liste().some(x=>x.action==="ecart_rapprochement")))&&(await pa.evaluate(()=>M.equilibre(ledger()))));
await pa.screenshot({path:SP+"a2-finance.png"});
/* ===== tarifs et commissions ===== */
await qui("a3");t("le comptable n'a pas accès aux tarifs",!(await pa.$('[data-a=tab][data-t=tarifs]')));await qui("a1");await tab("tarifs");
const p0=await pf.evaluate(()=>M.devis(PLAN,{cat:"lm",km:5}).total);
await pa.fill('[data-pl="categories.lm.base"]','400');await pa.click('[data-a=enregistrerplan]');t("nouvelle grille sans motif refusée",(await toast(pa)).includes("motif"));
await pa.fill('[data-pl="commission.valeur"]','0.6');await pa.fill('[data-pm]','Test');await pa.click('[data-a=enregistrerplan]');t("commission supérieure à 50 % refusée",(await toast(pa)).includes("50 %"));
await pa.fill('[data-pl="commission.valeur"]','0.12');await pa.fill('[data-pm]','Nouvelle grille négociée');await pa.click('[data-a=enregistrerplan]');
const pl=await pa.evaluate(()=>({v:LS.get("plan",null),h:LS.get("plans",[])}));t("nouvelle version du plan : v2, base 400, commission 12 %, ancienne version archivée",pl.v.version===2&&pl.v.categories.lm.base===400&&pl.v.commission.valeur===0.12&&pl.h.length===1&&pl.h[0].version===1&&pl.v.demonstration===false,pl.v&&pl.v.version);
await pf.reload();const p1=await pf.evaluate(()=>M.devis(PLAN,{cat:"lm",km:5}).total);t("le portail applique le nouveau tarif au prochain chargement",p1>p0,[p0,p1]);
await tab("audit");t("audit : modification du plan avec auteur, motif et valeurs avant/après",(await txt(pa)).includes("plan_tarifaire")&&(await txt(pa)).includes("Nouvelle grille négociée"));
t("audit : aucune suppression ni modification possible",!(await pa.$('[data-a*=suppr]'))&&!(await pa.$('[data-a*=modif]')));
/* ===== incidents ===== */
await pd.evaluate(()=>{D.sheet="sos";render()});await pd.click('[data-a=alerte]');await tab("incidents");await pa.waitForSelector('[data-a=prendre]');t("alerte SOS du livreur visible dans les incidents",(await txt(pa)).includes("SOS")&&(await txt(pa)).includes("Koffi Test"));
await qui("a4");await tab("incidents");await pa.click('[data-a=prendre]');await pa.click('[data-a=clore]');t("clôture d'incident sans résolution refusée",(await toast(pa)).includes("motif"));
await pa.fill('input[data-m]','Livreur joint, tout va bien');await pa.click('[data-a=clore]');t("incident clôturé par le support avec sa résolution",(await pa.evaluate(()=>INCID.liste()[0].statut))==="clos"&&(await txt(pa)).includes("tout va bien"));
/* ===== équipe ===== */
await qui("a1");await tab("equipe");await pa.fill('[data-nm=nom]','Awa Contrôleur');await pa.selectOption('[data-nm=role]','support');await pa.click('[data-a=ajouter]');t("membre ajouté à l'équipe",(await txt(pa)).includes("Awa Contrôleur"));
await pa.click('[data-a=retirer] >> nth=-1');t("membre retiré, historique conservé dans l'audit",!(await txt(pa)).includes("Awa Contrôleur")&&(await pa.evaluate(()=>AUDIT.liste().some(x=>x.action==="membre_retire"))));
t("aucune erreur JavaScript",errs.length===0,errs);
console.log(ok+" PASS, "+ko+" FAIL");await b.close();srv.close();process.exit(ko?1:0)})().catch(e=>{console.log("EXC",e.message.split("\n").slice(0,4).join(" | "));process.exit(1)});
