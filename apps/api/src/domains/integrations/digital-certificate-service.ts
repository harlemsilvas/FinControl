import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import forge from 'node-forge';
import { ApplicationError } from '../../common/errors/application-error.js';
import type { Database, QueryExecutor } from '../../infrastructure/database/database.js';
import type { AuthUser } from '../auth/auth-repository.js';

const MAX_BYTES = 5 * 1024 * 1024;
const CNPJ_OID = '2.16.76.1.3.3';
const CERT_BAG_OID = '1.2.840.113549.1.12.10.1.3';
const SHROUDED_KEY_BAG_OID = '1.2.840.113549.1.12.10.1.2';
const KEY_BAG_OID = '1.2.840.113549.1.12.10.1.1';
type CertificateAttribute = { type:string;name?:string;shortName?:string;value:unknown };
type CertificateExtension = { id?:string;name?:string;altNames?:Array<{type:number;value:unknown}> };

function asAsn1Nodes(value:unknown):forge.asn1.Asn1[]{
  return Array.isArray(value)?value.filter((item):item is forge.asn1.Asn1=>Boolean(item)&&typeof item==='object'&&'type' in item):[];
}

function leafStrings(node:forge.asn1.Asn1):string[]{
  if(typeof node.value==='string')return [node.value];
  return asAsn1Nodes(node.value).flatMap(leafStrings);
}

export function extractIcpBrasilCnpj(extensions:CertificateExtension[]):string|null{
  const san=extensions.find(extension=>extension.name==='subjectAltName'||extension.id==='2.5.29.17');
  for(const altName of san?.altNames??[]){
    if(altName.type!==0)continue;
    const nodes=asAsn1Nodes(altName.value);
    const oidNode=nodes.find(node=>node.tagClass===forge.asn1.Class.UNIVERSAL&&node.type===forge.asn1.Type.OID&&typeof node.value==='string');
    if(!oidNode||forge.asn1.derToOid(oidNode.value as string)!==CNPJ_OID)continue;
    const cnpj=nodes.filter(node=>node!==oidNode).flatMap(leafStrings).flatMap(value=>value.match(/\d{14}/g)??[])[0];
    if(cnpj)return cnpj;
  }
  return null;
}

interface CertificateRow extends Record<string, unknown> {
  id:string; company_id:string; company_name:string; display_name:string; original_file_name:string;
  fingerprint_sha256:string; serial_number:string; subject_name:string; issuer_name:string;
  certificate_document_number:string|null; valid_from:Date|string; valid_until:Date|string;
  last_validated_at:Date|string; is_active:boolean; created_at:Date|string; updated_at:Date|string;
  encrypted_payload?:Buffer; encryption_iv?:Buffer; authentication_tag?:Buffer;
}
interface Metadata { fingerprintSha256:string; serialNumber:string; subjectName:string; issuerName:string; documentNumber:string|null; validFrom:Date; validUntil:Date }
export interface CertificateUpload { companyId:string; displayName?:string; password:string; fileName:string; mimeType:string; bytes:Buffer }

const iso=(value:Date|string):string=>new Date(value).toISOString();
const digits=(value:string):string=>value.replace(/\D/g,'');
function api(row:CertificateRow):object {
  const days=Math.ceil((new Date(row.valid_until).getTime()-Date.now())/86_400_000);
  return { id:row.id,companyId:row.company_id,companyName:row.company_name,displayName:row.display_name,
    originalFileName:row.original_file_name,fingerprintSha256:row.fingerprint_sha256,serialNumber:row.serial_number,
    subjectName:row.subject_name,issuerName:row.issuer_name,certificateDocumentNumber:row.certificate_document_number,
    validFrom:iso(row.valid_from),validUntil:iso(row.valid_until),daysUntilExpiration:days,
    status:days<0?'EXPIRED':days<=30?'EXPIRING':'VALID',isActive:row.is_active,
    lastValidatedAt:iso(row.last_validated_at),createdAt:iso(row.created_at),updatedAt:iso(row.updated_at) };
}

export class DigitalCertificateService {
  private readonly key:Buffer|null;
  constructor(private readonly database:Database,encryptionKey?:string){
    this.key=encryptionKey?Buffer.from(encryptionKey,'base64'):null;
    if(this.key&&this.key.length!==32)throw new Error('CERTIFICATE_ENCRYPTION_KEY must be a base64 encoded 32-byte key');
  }
  async list(user:AuthUser):Promise<{data:object[]}>{
    const values:unknown[]=[];let scope='';
    if(!user.isMaster){values.push(user.companies.map(c=>c.id));scope=' AND cdc.company_id=ANY($1::uuid[])';}
    const result=await this.database.query<CertificateRow>(`${this.select()} WHERE cdc.deleted_at IS NULL${scope} ORDER BY company_name`,values);
    return {data:result.rows.map(api)};
  }
  async create(input:CertificateUpload,user:AuthUser):Promise<object>{
    this.configured();this.access(user,input.companyId,true);
    if(!/\.(pfx|p12)$/i.test(input.fileName))throw new ApplicationError({code:'CERTIFICATE_FILE_TYPE_INVALID',message:'Selecione um certificado A1 nos formatos .pfx ou .p12.',statusCode:400});
    if(!input.bytes.length||input.bytes.length>MAX_BYTES)throw new ApplicationError({code:'CERTIFICATE_FILE_SIZE_INVALID',message:'O certificado deve possuir no máximo 5 MB.',statusCode:400});
    if(!input.password)throw new ApplicationError({code:'CERTIFICATE_PASSWORD_REQUIRED',message:'Informe a senha do certificado.',statusCode:400});
    const metadata=this.parse(input.bytes,input.password);const id=randomUUID();const payload=this.encrypt(id,input.companyId,input.bytes,input.password);
    return this.database.transaction(async tx=>{
      const company=await tx.query<{document_number:string;company_name:string}&Record<string,unknown>>(`SELECT document_number,COALESCE(NULLIF(trade_name,''),legal_name) company_name FROM cadastros.companies WHERE id=$1 AND is_active AND deleted_at IS NULL`,[input.companyId]);
      const c=company.rows[0];if(!c)throw new ApplicationError({code:'COMPANY_NOT_FOUND',message:'Empresa não encontrada ou inativa.',statusCode:404});
      if(metadata.documentNumber&&digits(c.document_number)!==metadata.documentNumber)throw new ApplicationError({code:'CERTIFICATE_COMPANY_MISMATCH',message:`O certificado pertence ao CNPJ ${metadata.documentNumber} e não à empresa selecionada.`,statusCode:409});
      await tx.query(`UPDATE integracoes.company_digital_certificates SET is_active=false,updated_at=CURRENT_TIMESTAMP,updated_by=$2 WHERE company_id=$1 AND is_active AND deleted_at IS NULL`,[input.companyId,user.id]);
      const result=await tx.query<CertificateRow>(`INSERT INTO integracoes.company_digital_certificates(id,company_id,display_name,original_file_name,fingerprint_sha256,serial_number,subject_name,issuer_name,certificate_document_number,valid_from,valid_until,encrypted_payload,encryption_iv,authentication_tag,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15) RETURNING *,$16::text company_name`,[id,input.companyId,input.displayName?.trim()||`Certificado ${c.company_name}`,input.fileName,metadata.fingerprintSha256,metadata.serialNumber,metadata.subjectName,metadata.issuerName,metadata.documentNumber,metadata.validFrom,metadata.validUntil,payload.encrypted,payload.iv,payload.tag,user.id,c.company_name]);
      await this.audit(tx,id,'CREATED',user.id,{companyId:input.companyId,fileName:input.fileName,fingerprintSha256:metadata.fingerprintSha256,validUntil:metadata.validUntil});
      return api(result.rows[0]!);
    });
  }
  async validate(id:string,user:AuthUser):Promise<object>{
    this.configured();const row=await this.find(id);this.access(user,row.company_id,false);
    const secret=this.decrypt(row);const metadata=this.parse(secret.bytes,secret.password);
    await this.database.query(`UPDATE integracoes.company_digital_certificates SET last_validated_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,updated_by=$2 WHERE id=$1`,[id,user.id]);
    await this.audit(this.database,id,'VALIDATED',user.id,{fingerprintSha256:metadata.fingerprintSha256,validUntil:metadata.validUntil});
    return api(await this.find(id));
  }
  async remove(id:string,user:AuthUser):Promise<void>{const row=await this.find(id);this.access(user,row.company_id,true);await this.database.query(`UPDATE integracoes.company_digital_certificates SET is_active=false,deleted_at=CURRENT_TIMESTAMP,deleted_by=$2,updated_at=CURRENT_TIMESTAMP,updated_by=$2 WHERE id=$1 AND deleted_at IS NULL`,[id,user.id]);await this.audit(this.database,id,'DEACTIVATED',user.id,{companyId:row.company_id});}
  private parse(bytes:Buffer,password:string):Metadata{
    try{
      const asn1=forge.asn1.fromDer(bytes.toString('binary'));const p12=forge.pkcs12.pkcs12FromAsn1(asn1,false,password);
      const cert=p12.getBags({bagType:CERT_BAG_OID})[CERT_BAG_OID]?.[0]?.cert;
      const keys=[...(p12.getBags({bagType:SHROUDED_KEY_BAG_OID})[SHROUDED_KEY_BAG_OID]??[]),...(p12.getBags({bagType:KEY_BAG_OID})[KEY_BAG_OID]??[])];
      if(!cert||!keys.length)throw new Error('missing certificate or key');
      const subjectAttributes=cert.subject.attributes as CertificateAttribute[];const issuerAttributes=cert.issuer.attributes as CertificateAttribute[];
      const subject=subjectAttributes.map(a=>`${a.shortName??a.name??a.type}=${String(a.value)}`).join(', ');const issuer=issuerAttributes.map(a=>`${a.shortName??a.name??a.type}=${String(a.value)}`).join(', ');
      const documentNumber=extractIcpBrasilCnpj(cert.extensions as CertificateExtension[]);
      if(cert.validity.notAfter.getTime()<=Date.now())throw new ApplicationError({code:'CERTIFICATE_EXPIRED',message:'O certificado informado está vencido.',statusCode:400});
      return {fingerprintSha256:createHash('sha256').update(bytes).digest('hex'),serialNumber:cert.serialNumber,subjectName:subject,issuerName:issuer,documentNumber,validFrom:cert.validity.notBefore,validUntil:cert.validity.notAfter};
    }catch(error){if(error instanceof ApplicationError)throw error;throw new ApplicationError({code:'CERTIFICATE_INVALID',message:'Senha incorreta, arquivo inválido ou certificado sem chave privada.',statusCode:400});}
  }
  private encrypt(id:string,companyId:string,bytes:Buffer,password:string):{encrypted:Buffer;iv:Buffer;tag:Buffer}{const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',this.key!,iv);cipher.setAAD(Buffer.from(`${id}:${companyId}:v1`));const encrypted=Buffer.concat([cipher.update(JSON.stringify({pfx:bytes.toString('base64'),password}),'utf8'),cipher.final()]);return {encrypted,iv,tag:cipher.getAuthTag()};}
  private decrypt(row:CertificateRow):{bytes:Buffer;password:string}{try{const decipher=createDecipheriv('aes-256-gcm',this.key!,row.encryption_iv!);decipher.setAAD(Buffer.from(`${row.id}:${row.company_id}:v1`));decipher.setAuthTag(row.authentication_tag!);const decoded=JSON.parse(Buffer.concat([decipher.update(row.encrypted_payload!),decipher.final()]).toString('utf8')) as {pfx:string;password:string};return {bytes:Buffer.from(decoded.pfx,'base64'),password:decoded.password};}catch{throw new ApplicationError({code:'CERTIFICATE_DECRYPTION_FAILED',message:'Não foi possível abrir o certificado armazenado. Verifique a chave de criptografia do ambiente.',statusCode:500});}}
  private configured():void{if(!this.key)throw new ApplicationError({code:'CERTIFICATE_CONFIGURATION_MISSING',message:'O cofre de certificados ainda não foi configurado no servidor.',statusCode:503});}
  private access(user:AuthUser,companyId:string,write:boolean):void{if(user.isMaster)return;const company=user.companies.find(c=>c.id===companyId);if(!company||(write&&company.accessScope!=='OPERATIONAL'))throw new ApplicationError({code:'COMPANY_ACCESS_DENIED',message:'Você não possui acesso operacional a esta empresa.',statusCode:403});}
  private select():string{return `SELECT cdc.*,COALESCE(NULLIF(c.trade_name,''),c.legal_name) company_name FROM integracoes.company_digital_certificates cdc JOIN cadastros.companies c ON c.id=cdc.company_id`;}
  private async find(id:string):Promise<CertificateRow>{const result=await this.database.query<CertificateRow>(`${this.select()} WHERE cdc.id=$1 AND cdc.deleted_at IS NULL`,[id]);if(!result.rows[0])throw new ApplicationError({code:'CERTIFICATE_NOT_FOUND',message:'Certificado não encontrado.',statusCode:404});return result.rows[0];}
  private async audit(tx:QueryExecutor,id:string,action:string,userId:string,data:object):Promise<void>{await tx.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,new_data,user_id,source_code) VALUES('DOM-006','DIGITAL_CERTIFICATE',$1,$2,$3,$4,'API')`,[id,action,JSON.stringify(data),userId]);}
}
