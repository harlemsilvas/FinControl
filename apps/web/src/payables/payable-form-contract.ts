export const payableTabs=['Dados da Conta','Parcelas','Impostos','Aprovações','Anexos','Observações'] as const;
export const payableWireframe={primary:['supplierId','categoryId','description','documentNumber','documentTypeId','documentSeries','issueDate','paymentTermId','originalAmount','discountAmount','additionalAmount'],observations:['costCenterId','notes']} as const;
export function calculateTitleTotal(original:number,discount:number,additional:number):number{return original-discount+additional;}
