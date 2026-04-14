/**
 * AUTOMATISATION GOODDAY → GOOGLE DRIVE (Structure PRINCE2)
 * ----------------------------------------------------------
 * Ce serveur reçoit le webhook GoodDay "project.create"
 * et crée automatiquement l'arborescence PRINCE2 sur Google Drive
 * en COPIANT les templates (chaque projet a ses propres fichiers indépendants)
 *
 * Stack : Node.js + Express + Google Drive API v3
 * Déploiement : Render.com (gratuit), Railway, ou Google Cloud Functions
 */

const express = require("express");
const { google } = require("googleapis");
const app = express();
app.use(express.json());

// ─────────────────────────────────────────────
// CONFIGURATION — à remplir avec tes vraies valeurs
// ─────────────────────────────────────────────
const CONFIG = {
  // Secret optionnel configuré dans GoodDay (Settings > API > Webhooks)
  GOODDAY_WEBHOOK_SECRET: process.env.GOODDAY_WEBHOOK_SECRET || "",

  // ID du dossier racine Google Drive où créer les projets
  // Ex: https://drive.google.com/drive/folders/1ABC... → "1ABC..."
  DRIVE_ROOT_FOLDER_ID: process.env.DRIVE_ROOT_FOLDER_ID || "TON_ID_DOSSIER_RACINE",

  // Credentials Google Service Account (JSON stringifié dans la variable d'env)
  GOOGLE_SERVICE_ACCOUNT: process.env.GOOGLE_SERVICE_ACCOUNT || null,
};

// ─────────────────────────────────────────────
// IDs DE TES TEMPLATES SUR GOOGLE DRIVE
// Pour chaque fichier template, mets son ID Google Drive
// (clic droit sur le fichier > Partager > Copier le lien → l'ID est dans l'URL)
// ─────────────────────────────────────────────
const TEMPLATE_IDS = {
 // 01 - Starting Up
  projectBrief:               "1a0QnJTwRDxtReAiugTAZdvBHJM7V3O29",
  projectProductDescription:  "1QIvePZafiqxLIJim0Z7Qg77lzTMzArqE",
  lessonsLog:                 "1H-3-wl19gZG4y4Y31TN0B7OaE6Xd_S8T",

  // 02 - Initiating
  pid:                        "1JlgraJCia6_qWemOPqdpSywnT833NJV2",
  projectPlan:                "1F1lp8iVAoYS0P31trvrHzPZxMclREsLU",
  businessCase:               "1LxMVkGa7xTQRanx0zuVSJQGwwTPXquBY",
  benefitsManagement:         "1Z-P4hEWOJAV3w8w1HsS2Yt4RqSf3RhfH",
  changeManagement:           "1OPpLAZqaGLoaXyqPKM_Cww-M_C-A-Cqz",
  commercialManagement:       "1cjRl82zk6zi4Q6kfC1U8w9RtTW1BbEWh",
  communicationManagement:    "1pjygkmXDx88HXx0gpXeuTGjnSCPQjwmX",
  digitalDataManagement:      "1r9egUJ_ZOKAxF8vTV7p8-Ys0c5ULvmml",
  qualityManagement:          "1F6FcqIElYN-EC5ZcJDEWldmamOklu3G2",
  riskManagement:             "17R8dg9PwegksedD1NY8PhPUoddz7Mmt2c",
  sustainabilityManagement:   "1J3SAgZYPAdJHX0m2TbxqL8-Ck3qBYerB",

  // 03 - Directing
  highlightReport:            "1akhSVYU6TnmDhogsUaYBV5M2ULGd8C2s",
  exceptionReport:            "1dwilU0Kpm8M9OiDQR2k6XINGAtvd3i8xLA2",
  lessonsReport:              "1NJU-n1wLNpQ8Dt2e3NmPkdLdGgy78BrDb",

  // 04 - Controlling
  checkpointReport:           "1gKRmQHeILG7XQZ04qltgmOCv1PUnOF6M",
  dailyLog:                   "1ktZlZP63gg9T0RAoXTQpxTfPF1Yh29uO",
  issueRegister:              "14yGegc6PBSveZXz5i87Jql8eAk61X7WK",
  riskRegister:               "1AoJJvGrWruUYhgQVCHzr19Z33SFHYywF",
  qualityRegister:            "16UmBJrEFG6MyVup-zCokqJ2Aw-FOHMVr",
  lessonsLogCS:               "1H-3-wl19gZG4y4Y31TN0B7OaE6Xd_S8T",

  // 05+06 - Managing + Stage Boundary
  stagePlan:                  "1Us3OX0vGYFR8J0ngYctKRNSC1NqS9Qrf",
  teamPlan:                   "ID_DE_TON_FICHIER_teamPlanTemplate", // Non présent sur les captures
  workPackages:               "ID_DE_TON_FICHIER_workPackages",     // Non présent sur les captures
  productDeliverable:         "ID_DE_TON_FICHIER_productDeliverable", // Non présent sur les captures
  endStageReport:             "ID_DE_TON_FICHIER_endStageReportTemplate", // Non présent sur les captures
  nextStagePlan:              "1EDsrRlFmZadn3YyvmT8_3-NElShvDqX", // Utilise initiationStagePlan par défaut

  // 07 - Closing
  endProjectReport:           "ID_DE_TON_FICHIER_endProjectReportTemplate", // Non présent sur les captures
  lessonsReportCP:            "1NJU-n1wLNpQ8Dt2e3NmPkdLdGgy78BrDb",
  benefitsReview:             "ID_DE_TON_FICHIER_benefitsReviewTemplate", // Non présent sur les captures
};

// ─────────────────────────────────────────────
// AUTH GOOGLE DRIVE
// ─────────────────────────────────────────────
function getDriveClient() {
  const credentials = JSON.parse(CONFIG.GOOGLE_SERVICE_ACCOUNT);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Crée un dossier dans Drive et retourne son ID */
async function createFolder(drive, name, parentId) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  console.log(`  ✅ Dossier créé: "${name}" (${res.data.id})`);
  return res.data.id;
}

/** Copie un template Drive dans un dossier cible avec un nouveau nom */
async function copyTemplate(drive, templateId, newName, targetFolderId) {
  if (!templateId || templateId.startsWith("ID_DE_TON_FICHIER")) {
    console.warn(`  ⚠️  Template non configuré pour: "${newName}" — ignoré`);
    return null;
  }
  try {
    const res = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: newName,
        parents: [targetFolderId],
      },
      fields: "id, name",
    });
    console.log(`  📄 Fichier copié: "${newName}" (${res.data.id})`);
    return res.data.id;
  } catch (err) {
    console.error(`  ❌ Erreur copie "${newName}":`, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// CONSTRUCTION DE L'ARBORESCENCE PRINCE2
// ─────────────────────────────────────────────
async function buildPrince2Structure(drive, projectName, rootFolderId) {
  console.log(`\n🚀 Création structure PRINCE2 pour: "${projectName}"`);

  // Dossier racine du projet
  const projectRoot = await createFolder(drive, projectName, rootFolderId);

  // ── 01 Starting Up ──────────────────────────────────────
  const su = await createFolder(drive, "01_Starting_Up_a_Project_SU", projectRoot);
  const mandate = await createFolder(drive, "Project_Mandate", su);
  const brief = await createFolder(drive, "Project_Brief", su);
  await copyTemplate(drive, TEMPLATE_IDS.projectBrief, `${projectName}_ProjectBrief.docx`, brief);
  const ppd = await createFolder(drive, "Project_Product_Description", su);
  await copyTemplate(drive, TEMPLATE_IDS.projectProductDescription, `${projectName}_ProductDescription.docx`, ppd);
  const lessons0 = await createFolder(drive, "Lessons_from_previous_projects", su);
  await copyTemplate(drive, TEMPLATE_IDS.lessonsLog, `${projectName}_LessonsLog.xlsx`, lessons0);

  // ── 02 Initiating ───────────────────────────────────────
  const ip = await createFolder(drive, "02_Initiating_a_Project_IP", projectRoot);
  const plan = await createFolder(drive, "1_Project_Plan", ip);
  await copyTemplate(drive, TEMPLATE_IDS.projectPlan, `${projectName}_ProjectPlan.xlsx`, plan);
  const bc = await createFolder(drive, "2_Business_Case", ip);
  await copyTemplate(drive, TEMPLATE_IDS.businessCase, `${projectName}_BusinessCase.docx`, bc);
  const mgmt = await createFolder(drive, "3_Management_Approaches", ip);
  await copyTemplate(drive, TEMPLATE_IDS.benefitsManagement,      `${projectName}_BenefitsManagementApproach.docx`, mgmt);
  await copyTemplate(drive, TEMPLATE_IDS.changeManagement,        `${projectName}_ChangeManagementApproach.docx`, mgmt);
  await copyTemplate(drive, TEMPLATE_IDS.commercialManagement,    `${projectName}_CommercialManagementApproach.docx`, mgmt);
  await copyTemplate(drive, TEMPLATE_IDS.communicationManagement, `${projectName}_CommunicationManagementApproach.docx`, mgmt);
  await copyTemplate(drive, TEMPLATE_IDS.digitalDataManagement,   `${projectName}_DigitalDataManagementApproach.docx`, mgmt);
  await copyTemplate(drive, TEMPLATE_IDS.qualityManagement,       `${projectName}_QualityManagementApproach.docx`, mgmt);
  await copyTemplate(drive, TEMPLATE_IDS.riskManagement,          `${projectName}_RiskManagementApproach.docx`, mgmt);
  await copyTemplate(drive, TEMPLATE_IDS.sustainabilityManagement,`${projectName}_SustainabilityManagementApproach.docx`, mgmt);
  const pid = await createFolder(drive, "4_PID", ip);
  await copyTemplate(drive, TEMPLATE_IDS.pid, `${projectName}_PID.docx`, pid);

  // ── 03 Directing ────────────────────────────────────────
  const dp = await createFolder(drive, "03_Directing_a_Project_DP", projectRoot);
  const hr = await createFolder(drive, "Highlight_Report", dp);
  await copyTemplate(drive, TEMPLATE_IDS.highlightReport, `${projectName}_HighlightReport.docx`, hr);
  const er = await createFolder(drive, "Exception_Report", dp);
  await copyTemplate(drive, TEMPLATE_IDS.exceptionReport, `${projectName}_ExceptionReport.docx`, er);
  const bm = await createFolder(drive, "Board_Meetings", dp);
  await copyTemplate(drive, TEMPLATE_IDS.lessonsReport, `${projectName}_LessonsReport.docx`, bm);
  const sa = await createFolder(drive, "Stage_authorizations", dp);

  // ── 04 Controlling ──────────────────────────────────────
  const cs = await createFolder(drive, "04_Controlling_a_Stage_CS", projectRoot);
  const cr = await createFolder(drive, "Checkpoint_Report", cs);
  await copyTemplate(drive, TEMPLATE_IDS.checkpointReport, `${projectName}_CheckpointReport.docx`, cr);
  const dl = await createFolder(drive, "Daily_Log", cs);
  await copyTemplate(drive, TEMPLATE_IDS.dailyLog, `${projectName}_DailyLog.xlsx`, dl);
  const reg = await createFolder(drive, "Registers", cs);
  const issueReg = await createFolder(drive, "Issue_Register", reg);
  await copyTemplate(drive, TEMPLATE_IDS.issueRegister, `${projectName}_IssueRegister.xlsx`, issueReg);
  const riskReg = await createFolder(drive, "Risk_Register", reg);
  await copyTemplate(drive, TEMPLATE_IDS.riskRegister, `${projectName}_RiskRegister.xlsx`, riskReg);
  const qualReg = await createFolder(drive, "Quality_Register", reg);
  await copyTemplate(drive, TEMPLATE_IDS.qualityRegister, `${projectName}_QualityRegister.xlsx`, qualReg);
  const ll = await createFolder(drive, "Lessons_Log", cs);
  await copyTemplate(drive, TEMPLATE_IDS.lessonsLogCS, `${projectName}_LessonsLog_CS.xlsx`, ll);

  // ── 05+06 Managing + Stage Boundary ─────────────────────
  const mp = await createFolder(drive, "05_Managing_Product_Delivery_MP_and_06_Stage_Boundary_SB", projectRoot);
  const stage01 = await createFolder(drive, "Stage_01_[Stage_Name]", mp);
  await copyTemplate(drive, TEMPLATE_IDS.stagePlan,         `${projectName}_StagePlan.xlsx`, stage01);
  await copyTemplate(drive, TEMPLATE_IDS.teamPlan,          `${projectName}_TeamPlan.xlsx`, stage01);
  await copyTemplate(drive, TEMPLATE_IDS.workPackages,      `${projectName}_WorkPackages.xlsx`, stage01);
  await copyTemplate(drive, TEMPLATE_IDS.productDeliverable,`${projectName}_ProductDeliverable.xlsx`, stage01);
  const esr = await createFolder(drive, "End_Stage_Report", stage01);
  await copyTemplate(drive, TEMPLATE_IDS.endStageReport, `${projectName}_EndStageReport.docx`, esr);
  const nsp = await createFolder(drive, "Next_Stage_Plan", stage01);
  await copyTemplate(drive, TEMPLATE_IDS.nextStagePlan, `${projectName}_NextStagePlan.docx`, nsp);

  // ── 07 Closing ──────────────────────────────────────────
  const cp = await createFolder(drive, "07_Closing_a_Project_CP", projectRoot);
  const epr = await createFolder(drive, "End_Project_Report", cp);
  await copyTemplate(drive, TEMPLATE_IDS.endProjectReport, `${projectName}_EndProjectReport.docx`, epr);
  const lrCP = await createFolder(drive, "Lessons_Report", cp);
  await copyTemplate(drive, TEMPLATE_IDS.lessonsReportCP, `${projectName}_LessonsReport_CP.docx`, lrCP);
  const brev = await createFolder(drive, "Benefits_Review", cp);
  await copyTemplate(drive, TEMPLATE_IDS.benefitsReview, `${projectName}_BenefitsReview.docx`, brev);
  const hd = await createFolder(drive, "Handover_Documents", cp);

  console.log(`\n✅ Structure PRINCE2 créée avec succès pour "${projectName}"!`);
  console.log(`   Lien: https://drive.google.com/drive/folders/${projectRoot}`);
  return projectRoot;
}

// ─────────────────────────────────────────────
// ENDPOINT WEBHOOK GOODDAY
// ─────────────────────────────────────────────
app.post("/webhook/goodday", async (req, res) => {
  // Vérification du secret optionnel
  if (CONFIG.GOODDAY_WEBHOOK_SECRET) {
    const secret = req.headers["x-goodday-secret"] || req.body.secret;
    if (secret !== CONFIG.GOODDAY_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Secret invalide" });
    }
  }

  const { event, project } = req.body;
  console.log("\n📩 Webhook reçu:", JSON.stringify(req.body, null, 2));

  // On ne réagit qu'à la création d'un projet (pas sous-tâches, etc.)
  if (event !== "project.create" || !project) {
    return res.json({ message: "Événement ignoré" });
  }

  // Répondre immédiatement à GoodDay (évite le timeout webhook)
  res.json({ message: "Traitement en cours..." });

  // Création asynchrone de la structure Drive
  try {
    const drive = getDriveClient();
    const projectName = project.name || `Projet_${project.id}`;
    await buildPrince2Structure(drive, projectName, CONFIG.DRIVE_ROOT_FOLDER_ID);
  } catch (err) {
    console.error("❌ Erreur création Drive:", err.message);
  }
});

// Health check
app.get("/", (req, res) => res.json({ status: "ok", message: "GoodDay→Drive automation running" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 Serveur démarré sur le port ${PORT}`));
