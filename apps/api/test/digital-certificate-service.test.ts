import { describe, expect, it } from 'vitest';
import forge from 'node-forge';
import { extractIcpBrasilCnpj } from '../src/domains/integrations/digital-certificate-service.js';

function otherName(oid:string,value:string):{type:number;value:forge.asn1.Asn1[]}{
  return {type:0,value:[
    forge.asn1.create(forge.asn1.Class.UNIVERSAL,forge.asn1.Type.OID,false,forge.asn1.oidToDer(oid).getBytes()),
    forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC,0,true,[
      forge.asn1.create(forge.asn1.Class.UNIVERSAL,forge.asn1.Type.UTF8,false,value),
    ]),
  ]};
}

describe('ICP-Brasil certificate document extraction',()=>{
  it('uses the CNPJ otherName OID instead of another 14-digit identifier',()=>{
    const extensions=[{name:'subjectAltName',altNames:[
      otherName('2.16.76.1.3.2','29277404000109'),
      otherName('2.16.76.1.3.3','19330326000105'),
    ]}];

    expect(extractIcpBrasilCnpj(extensions)).toBe('19330326000105');
  });

  it('does not infer a CNPJ from unrelated alternative names',()=>{
    const extensions=[{name:'subjectAltName',altNames:[otherName('2.16.76.1.3.2','29277404000109')]}];

    expect(extractIcpBrasilCnpj(extensions)).toBeNull();
  });
});
