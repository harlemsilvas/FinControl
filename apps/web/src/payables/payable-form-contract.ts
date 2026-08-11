export const payableTabs=['Dados da Conta','Parcelas','Anexos','Observações'] as const;
export const payableWireframe={primary:['companyId','supplierId','issueDate','baseDueDate','originalAmount','documentNumber','categoryId','description','documentTypeId'],observations:['costCenterId','notes']} as const;
export function calculateTitleTotal(original:number,discount:number,additional:number):number{return original-discount+additional;}
