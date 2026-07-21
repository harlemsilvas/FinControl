export interface Summary {totalPayable:string;overdue:string;upcoming:string;paid:string}
export interface ChartPoint {label:string;amount:string}
export interface UpcomingItem {id:string;documentNumber:string;supplierName:string;dueDate:string;openBalance:string;highlight:'OVERDUE'|'TODAY'|'UPCOMING'}
export interface DashboardResponse {summary:Summary;dueSeries:ChartPoint[];categories:ChartPoint[];upcoming:UpcomingItem[]}
export interface AgendaItem {id:string;payableTitleId:string;documentNumber:string;description:string;supplierName:string;categoryName:string;installmentNumber:number;installmentCount:number;dueDate:string;openBalance:string;highlight:'OVERDUE'|'TODAY'|'UPCOMING'}
export interface AgendaResponse {data:AgendaItem[];total:string;count:number}
export interface Option {id:string;name?:string;legalName?:string}
export interface OptionResponse {data:Option[]}
export function iso(date:Date):string{return date.toISOString().slice(0,10);}
export function monthRange(date=new Date()):{from:string;to:string}{return {from:iso(new Date(date.getFullYear(),date.getMonth(),1)),to:iso(new Date(date.getFullYear(),date.getMonth()+1,0))};}
export function shortDate(value:string):string{return new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'2-digit',month:'short'}).format(new Date(`${value}T00:00:00Z`));}
