export interface Summary {totalPayable:string;overdue:string;today?:string;todayCount?:string|number;upcoming:string;paid:string}
export interface ChartPoint {label:string;amount:string}
export interface UpcomingItem {id:string;documentNumber:string;supplierName:string;companyName?:string|null;dueDate:string;openBalance:string;highlight:'OVERDUE'|'TODAY'|'UPCOMING'}
export interface DashboardResponse {summary:Summary;dueSeries:ChartPoint[];categories:ChartPoint[];upcoming:UpcomingItem[]}
export interface AgendaItem {id:string;payableTitleId:string;documentNumber:string;description:string;supplierName:string;companyName?:string|null;categoryName:string;installmentNumber:number;installmentCount:number;dueDate:string;openBalance:string;highlight:'OVERDUE'|'TODAY'|'UPCOMING'}
export interface AgendaResponse {data:AgendaItem[];total:string;count:number}
export interface Option {id:string;name?:string;legalName?:string}
export interface OptionResponse {data:Option[]}
export function iso(date:Date):string{return date.toISOString().slice(0,10);}
export function monthRange(date=new Date()):{from:string;to:string}{return {from:iso(new Date(date.getFullYear(),date.getMonth(),1)),to:iso(new Date(date.getFullYear(),date.getMonth()+1,0))};}
export function monthKey(date=new Date()):string{return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;}
export function monthStart(value:string):string{return `${value}-01`;}
export function monthEnd(value:string):string{const [yearText,monthText]=value.split('-');const year=Number(yearText);const month=Number(monthText);return iso(new Date(year,month,0));}
export function shortDate(value:string):string{return new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'2-digit',month:'short'}).format(new Date(`${value}T00:00:00Z`));}
