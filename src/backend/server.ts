import express from "express";
import companyRoutes from "./modules/companies/routes/companyRoutes";

const app = express();

app.use(express.json());
app.use("/api", companyRoutes);

// Outras rotas existentes...

export default app;
