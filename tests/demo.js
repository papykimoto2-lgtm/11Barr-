/* Visite guidée (demo.html) : charge le jeu de données puis vérifie que chaque espace affiche des données cohérentes, puis réinitialise.
   node tests/demo.js (Playwright requis : PLAYWRIGHT=/chemin si besoin). */
const {chromium}=require(process.env.PLAYWRIGHT||"playwright"),http=require("http"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),SP=require("os").tmpdir()+"/";
const T={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".png":"image/png",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let u=q.url.split("?")[0];if(u==="/")u="/index.html";const f=path.join(root,u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});r.end(d)})});
let ok=0,ko=0;const t=(l,c,d)=>{if(c){ok++;console.log("PASS",l)}else{ko++;console.log("FAIL",l,d===undefined?"":JSON.stringify(d))}};
(async()=>{await new Promise(o=>srv.listen(0,"127.0.0.1",o));const base="http://127.0.0.1:"+srv.address().port;
const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:1100,height:900},locale:"fr-FR"});
const mk=async(u,vp)=>{const p=await ctx.newPage();if(vp)await p.setViewportSize(vp);p.on("pageerror",e=>errs.push(u+": "+e.message));p.on("console",m=>{if(m.type()==="error"&&!/favicon|manifest|sw\.js|serviceWorker/i.test(m.text()))errs.push(u+" console: "+m.text())});await p.goto(base+"/"+u);return p};
const txt=(p,s)=>p.$eval(s,e=>e.textContent).catch(()=>"");

/* ---------- Page de visite ---------- */
const d=await mk("demo.html");
t("titre et langue",(await d.title()).includes("Visite guidée")&&(await d.getAttribute("html","lang"))==="fr");
const hrefs=await d.$$eval("article.esp a.btn",a=>a.map(x=>x.getAttribute("href")));
t("quatre cartes vers les espaces",JSON.stringify(hrefs)===JSON.stringify(["index.html","chauffeur.html","fournisseur.html","admin.html"]),hrefs);
t("parcours conseillé en 6 étapes",(await d.$$("ol.steps li")).length===6);
t("état initial : aucune donnée, réinitialisation désactivée",(await txt(d,"#etat-note")).includes("Aucune donnée")&&await d.$eval("#raz",e=>e.disabled));
await d.screenshot({path:SP+"dm1-visite.png",fullPage:true});
await d.click("#charger");await d.waitForFunction(()=>document.querySelector("#msg").textContent.includes("chargé"));
t("jeu de données chargé, message de confirmation",(await txt(d,"#msg")).includes("3 entreprises")&&(await txt(d,"#msg")).includes("16 livraisons"));
const etat=await txt(d,"#etat");
t("indicateur : entreprises, livreurs, livraisons, journal équilibré",etat.includes("3entreprises")&&etat.includes("4livreurs")&&etat.includes("16livraisons")&&etat.includes("Équilibré"),etat);
await d.screenshot({path:SP+"dm2-charge.png",fullPage:true});

/* ---------- Cohérence du stockage (règles du moteur) ---------- */
const S=await d.evaluate(()=>{const J=M.chargerLivre(LS.get("ledger",null)),orgs=ORGS.liste(),liv=LIVREURS.liste(),cmd=LIV.lire(),statuts=[...new Set(cmd.map(o=>o.statut))];
  const chaine=cmd.every(o=>o.evenements.length>=2&&o.evenements.every((e,i)=>i===0?e.ancien==="draft":e.ancien===o.evenements[i-1].nouveau)&&o.evenements[o.evenements.length-1].nouveau===o.statut&&o.evenements.every((e,i)=>i===0||e.at>=o.evenements[i-1].at));
  const clot=cmd.filter(o=>o.statut==="delivered"),cl=clot.every(o=>o.cloture&&J.tx.some(x=>x.ref==="CL-"+o.ref)&&o.preuve&&o.chauffeur);
  const fac=LS.get("factures",[]),verif=fac.every(f=>f.total===f.lignes.reduce((s,l)=>s+l.montant,0));
  const eligibles=M.eligibles(liv,{mode:"moto"}).length+"/"+M.eligibles(liv,{mode:"cargo"}).length;
  return{eq:M.equilibre(J),n:J.tx.length,orgs:orgs.map(o=>[o.statut,o.remise]),liv:liv.map(l=>[l.statut,l.type,!!(l.dossier&&l.dossier.identite&&l.dossier.permis&&l.dossier.plaque&&l.dossier.assurance_exp),M.docsValides(l),!!l.dossier.capacite_kg,!!(l.dossier.position&&l.dossier.position.n)]),
   nb:cmd.length,statuts,chaine,cl:cl&&clot.length,cod:clot.filter(o=>o.cod>0).length,fac:fac.map(f=>f.statut),verif,vers:VERS.liste().map(v=>v.statut),rev:REVERS.liste().map(r=>r.statut),inc:INCID.liste().map(i=>i.statut+i.type),aud:AUDIT.liste().length,
   tiers:M.fondsTiers(J),propre:M.revenuPropre(J),caisse:M.solde(J,"caisse").debit-M.solde(J,"caisse").credit,creanceO1:M.creance(J,"Sdemo1"),creanceO2:M.creance(J,"Sdemo2"),factO1:fac.find(f=>f.client==="Sdemo1").total,
   refsUniques:new Set(cmd.map(o=>o.ref)).size===cmd.length,uniq:new Set(J.tx.map(x=>x.ref)).size===J.tx.length,eligibles,
   reel:Object.keys(localStorage).every(k=>k.startsWith("onzebarre_")),num:[].concat(orgs.map(o=>o.tel),orgs.flatMap(o=>o.points.map(p=>p.tel)),liv.map(l=>l.tel),cmd.map(o=>o.dest.tel),cmd.map(o=>o.de.tel))}});
t("journal financier équilibré (M.equilibre), références uniques",S.eq&&S.uniq&&S.n>=10,S.n);
t("entreprises : 2 validées (une avec remise de contrat) et 1 en attente",S.orgs.filter(o=>o[0]==="valide").length===2&&S.orgs.some(o=>o[0]==="valide"&&o[1]===.1)&&S.orgs.filter(o=>o[0]==="en_verification").length===1,S.orgs);
t("livreurs : 3 validés avec dossier complet et assurance valide, 1 en attente",S.liv.filter(l=>l[0]==="valide"&&l[2]&&l[3]).length===3&&S.liv.filter(l=>l[0]==="en_verification").length===1&&S.liv.filter(l=>l[0]==="valide").every(l=>l[4]&&l[5]),S.liv);
t("éligibilité : 2 motos et 1 camion éligibles",S.eligibles==="2/1",S.eligibles);
t("une quinzaine de livraisons dans au moins 6 statuts différents",S.nb>=15&&S.statuts.length>=6&&["delivered","in_transit","ready_for_assignment","cancelled","failed_delivery"].every(s=>S.statuts.includes(s)),S.statuts);
t("historique d'événements cohérent (chaîne de statuts, horodatage croissant)",S.chaine);
t("livraisons livrées : preuve, livreur, clôture au journal, dont paiements à la livraison",S.cl>=8&&S.cod>=3,[S.cl,S.cod]);
t("versements (validé et en attente), reversements (fait et en attente)",S.vers.includes("valide")&&S.vers.includes("attente")&&S.rev.includes("verse")&&S.rev.includes("attente"),[S.vers,S.rev]);
t("factures : une émise, une payée, totaux exacts",S.fac.includes("emise")&&S.fac.includes("payee")&&S.verif&&S.creanceO1===S.factO1&&S.creanceO2===0,[S.fac,S.creanceO1,S.factO1,S.creanceO2]);
t("incident SOS ouvert et journal d'audit alimenté",S.inc.includes("ouvertsos")&&S.aud>=5,S.inc);
t("fonds de tiers à part du revenu propre, caisse positive",S.tiers>0&&S.propre>0&&S.caisse>0,[S.tiers,S.propre,S.caisse]);
t("références de livraison uniques, aucun numéro réel (0X 00 00 00 NN) ni clé hors préfixe",S.refsUniques&&S.reel&&S.num.every(n=>/^0[0-9]0{6}\d\d$|^050000\d{4}$/.test(n)),S.num.slice(0,6));

/* ---------- Administration ---------- */
const a=await mk("admin.html");
const dash=await txt(a,"#app");
const al=["compte(s) entreprise à valider","dossier(s) de livreur à contrôler","versement(s) de livreur à valider","reversement(s) / règlement(s) en attente d'approbation","facture(s) émise(s) non payée(s)","commande(s) sans affectation","incident(s) ouvert(s)"];
t("admin : alertes à traiter (compte, dossier, versement, reversement, facture, commande, SOS)",al.every(x=>dash.includes(x)),al.filter(x=>!dash.includes(x)));
t("admin : aucune alerte d'intégrité du journal",!dash.includes("déséquilibré"));
t("admin : fonds de tiers et revenu propre affichés séparément",dash.includes("revenu propre")&&dash.includes("fonds dus aux fournisseurs"));
await a.screenshot({path:SP+"dm3-admin.png",fullPage:true});
await a.click("[data-a=tab][data-t=comptes]");t("admin : trois entreprises, une remise de 10 %",(await a.$$("tr.k")).length===3&&(await txt(a,"main")).includes("10 %"));
await a.click("[data-a=tab][data-t=livreurs]");t("admin : quatre livreurs, un en vérification",(await a.$$("tr.k")).length===4&&(await txt(a,"main")).includes("En vérification"));
await a.click("[data-a=tab][data-t=commandes]");t("admin : seize commandes",(await a.$$("tr.k")).length===16);
await a.click("[data-a=tab][data-t=finance]");const fin=await txt(a,"main");t("admin : finance (versement en attente, reversement, facture)",fin.includes("WAVE-")||fin.includes("OM-DEMO")||fin.includes("Awa Traoré"));
await a.click("[data-a=tab][data-t=incidents]");t("admin : incident SOS ouvert",(await txt(a,"main")).includes("SOS"));
await a.click("[data-a=tab][data-t=audit]");t("admin : journal d'audit alimenté",(await a.$$("table tr")).length>=5);

/* ---------- Portail entreprise ---------- */
const p=await mk("fournisseur.html");
t("portail : compte validé ouvert directement (tableau de bord)",(await txt(p,"main")).includes("Tableau de bord"));
const pm=await txt(p,"main");t("portail : remise de contrat affichée",pm.includes("10 %"));
await p.click("[data-a=tab][data-t=livraisons]");t("portail : livraisons de Boutique Awalé (9 : tous statuts)",(await p.$$("main tr.k, main tr[data-a]")).length>=8||(await txt(p,"main")).includes("11B-"),(await txt(p,"main")).slice(0,100));
const lt=await txt(p,"main");t("portail : statuts lisibles (recherche, livré, annulé)",lt.includes("Livré")&&lt.includes("Recherche d'un livreur")&&lt.includes("Annulé"));
await p.click("[data-a=tab][data-t=paiements]");const pay=await txt(p,"main");t("portail : paiements à la livraison (collecté, reversé, dû)",/collect|encaiss/i.test(pay)&&/vers/i.test(pay));
await p.click("[data-a=tab][data-t=factures]");t("portail : facture émise visible",(await txt(p,"main")).includes("FAC-"));
await p.screenshot({path:SP+"dm4-portail.png"});

/* ---------- Espace livreur ---------- */
const l=await mk("chauffeur.html",{width:390,height:800});
t("livreur : profil Koffi Yao déjà connecté, dossier validé",!(await l.$("[data-a=entrer]"))&&(await txt(l,"#app")).includes("Koffi Yao")||(await l.evaluate(()=>D.p&&D.p.nom==="Koffi Yao")));
t("livreur : aucun message de dossier à compléter",!(await txt(l,"#app")).includes("Complétez votre dossier")&&!(await txt(l,"#app")).includes("en cours de vérification"));
await l.click("[data-a=ligne]");t("livreur : passe en ligne (dossier validé)",(await txt(l,".st")).includes("En ligne"));
await l.click("[data-a=tab][data-t=gains]");const g=await txt(l,"#app");t("livreur : gains issus du journal partagé",/F/.test(g)&&g.includes("Solde"));
await l.screenshot({path:SP+"dm5-livreur.png"});
/* le client voit un chauffeur en ligne */
const c=await mk("index.html",{width:390,height:800});await c.evaluate(()=>A.welSkip());
t("client : historique de démonstration avec reçu",await c.evaluate(()=>S.hist.length===2&&S.hist[0].lignes.length>=2));
/* ---------- Réinitialisation ---------- */
await d.bringToFront();await d.reload();t("après rechargement l'état est conservé",(await txt(d,"#etat")).includes("16livraisons"));
await d.evaluate(()=>localStorage.setItem("autre_cle","garder"));
await d.click("#raz");t("réinitialiser : confirmation demandée",await d.$eval("#cf",e=>!e.hidden)&&(await txt(d,"#cf-t")).includes("Tout réinitialiser"));
await d.click("#cf-non");t("« Non, garder » ne supprime rien",await d.$eval("#cf",e=>e.hidden)&&(await txt(d,"#etat")).includes("16livraisons"));
await d.click("#raz");await d.keyboard.press("Escape");t("Échap annule la confirmation",await d.$eval("#cf",e=>e.hidden));
await d.click("#raz");await d.click("#cf-oui");
const apres=await d.evaluate(()=>({n:Object.keys(localStorage).filter(k=>k.startsWith("onzebarre_")).length,autre:localStorage.getItem("autre_cle")}));
t("réinitialisé : plus aucune clé « onzebarre_ », les autres clés sont intactes",apres.n===0&&apres.autre==="garder",apres);
t("indicateur remis à zéro",(await txt(d,"#etat-note")).includes("Aucune donnée")&&(await txt(d,"#etat")).includes("0livraison"));
/* recharger par-dessus des données existantes demande confirmation */
await d.click("#charger");await d.waitForFunction(()=>document.querySelector("#msg").textContent.includes("chargé"));
await d.click("#charger");t("recharger par-dessus : confirmation de remplacement",(await txt(d,"#cf-t")).includes("Remplacer"));await d.click("#cf-oui");await d.waitForFunction(()=>document.querySelector("#cf").hidden);
t("rechargement du jeu : toujours équilibré",await d.evaluate(()=>M.equilibre(M.chargerLivre(LS.get("ledger",null)))&&LIV.lire().length===16));
/* mobile et mode sombre : pas de débordement horizontal */
await d.setViewportSize({width:360,height:740});await d.emulateMedia({colorScheme:"dark"});
t("mobile 360 px, mode sombre : pas de défilement horizontal",await d.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
await d.screenshot({path:SP+"dm6-mobile-sombre.png",fullPage:true});
console.log("erreurs",JSON.stringify(errs));t("aucune erreur JS",errs.length===0,errs);
console.log(ok+" PASS, "+ko+" FAIL");await b.close();srv.close();process.exit(ko?1:0)})().catch(e=>{console.log("EXC",e.message.split("\n").slice(0,4).join(" | "));process.exit(1)});
