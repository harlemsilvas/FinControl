import express from "express";
import { CompanyController } from "../controllers/CompanyController";

const router = express.Router();
const controller = new CompanyController();

router.get("/companies", controller.getAll);
router.get("/companies/:id", controller.getById);
router.post("/companies", controller.create);
router.put("/companies/:id", controller.update);
router.delete("/companies/:id", controller.delete);

router.get("/companies/:companyId/xml-files", controller.getXmlFilesByCompany);
router.get("/xml-files", controller.getAllXmlFiles);
router.get("/xml-files/:id", controller.getXmlFileById);
router.post("/xml-files", controller.createXmlFile);
router.put("/xml-files/:id", controller.updateXmlFile);
router.delete("/xml-files/:id", controller.deleteXmlFile);

router.get("/companies/:companyId/config", controller.getConfigByCompany);
router.post("/companies/:companyId/config", controller.createConfig);
router.put("/config/:id", controller.updateConfig);

export default router;
