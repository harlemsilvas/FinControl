import { describe, expect, it } from 'vitest';
import { resources } from './resources';

describe('master-data resource contracts',()=>{
  it('covers every Phase 10 resource with list columns and form fields',()=>{expect(Object.keys(resources)).toEqual(['suppliers','financial-categories','cost-centers','document-types','payment-methods','payment-terms','banks','bank-accounts']);for(const resource of Object.values(resources)){expect(resource.path).toMatch(/^\//);expect(resource.columns.length).toBeGreaterThanOrEqual(3);expect(resource.fields.some(field=>field.required)).toBe(true);}});
});
