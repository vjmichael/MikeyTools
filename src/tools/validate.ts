/**
 * Schema Validation Tool for LM Studio Plugin
 * 
 * Validates JSON/YAML data against JSON Schema with precise error paths.
 * Returns structured JSON for model parsing.
 * 
 * AUTO-REPAIR: If JSON parsing fails, automatically attempts repair via json_repair.
 * If repair succeeds, validates the repaired JSON against the schema.
 */

import * as Ajv from 'ajv';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { repairJSON } from './json_repair';

// BUG-FIX: Cache ajv instance to avoid creating new instances per validation
let cachedAjv: any = null;

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Attempt to parse JSON with auto-repair on failure.
 * Returns { success: true, data: any } or { success: false, error: string }
 */
function parseJSONWithRepair(jsonString: string): { success: true; data: any } | { success: false; error: string } {
  try {
    return { success: true, data: JSON.parse(jsonString) };
  } catch (e) {
    // Attempt JSON repair
    const repairResult = repairJSON(jsonString, { logRepairs: false, maxAttempts: 5 });
    if (repairResult.success && repairResult.repaired) {
      try {
        return { success: true, data: JSON.parse(repairResult.repaired) };
      } catch {
        return { success: false, error: `JSON parsing failed. Repair also failed: ${repairResult.error || 'unknown error'}` };
      }
    }
    return { success: false, error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}. Repair failed.` };
  }
}

export async function validateSchema(
  data?: string,
  schema?: string,
  file_path?: string,
  schema_path?: string,
  format: 'json' | 'yaml' = 'json'
): Promise<ValidationResult> {
  try {
    // Parse data
    let parsedData: any;
    if (data) {
      if (format === 'yaml') {
        try {
          parsedData = yaml.load(data);
        } catch (e) {
          return { valid: false, errors: [{ path: '$', message: `Invalid YAML: ${String(e)}` }] };
        }
      } else {
        // JSON format - attempt parse with auto-repair
        const parseResult = parseJSONWithRepair(data);
        if (!parseResult.success) {
          return { valid: false, errors: [{ path: '$', message: parseResult.error }] };
        }
        parsedData = parseResult.data;
      }
    } else if (file_path) {
      const content = fs.readFileSync(file_path, 'utf8');
      if (format === 'yaml') {
        try {
          parsedData = yaml.load(content);
        } catch (e) {
          return { valid: false, errors: [{ path: '$', message: `Invalid YAML in ${file_path}: ${String(e)}` }] };
        }
      } else {
        // JSON format - attempt parse with auto-repair
        const parseResult = parseJSONWithRepair(content);
        if (!parseResult.success) {
          return { valid: false, errors: [{ path: '$', message: `${parseResult.error} in ${file_path}` }] };
        }
        parsedData = parseResult.data;
      }
    } else {
      return { valid: false, errors: [{ path: '$', message: 'Either data or file_path must be provided' }] };
    }
    
    // Parse schema
    let parsedSchema: any;
    if (schema) {
      try {
        parsedSchema = JSON.parse(schema);
      } catch (e) {
        return { valid: false, errors: [{ path: '$', message: `Invalid JSON schema: ${String(e)}` }] };
      }
    } else if (schema_path) {
      const schemaContent = fs.readFileSync(schema_path, 'utf8');
      try {
        parsedSchema = JSON.parse(schemaContent);
      } catch {
        // Not valid JSON, try YAML
        try {
          parsedSchema = yaml.load(schemaContent);
        } catch (e) {
          return { valid: false, errors: [{ path: '$', message: `Invalid schema in ${schema_path}: ${String(e)}` }] };
        }
      }
    } else {
      return { valid: false, errors: [{ path: '$', message: 'Either schema or schema_path must be provided' }] };
    }
    
    // Validate
    const AjvModule = Ajv as any;
    if (!cachedAjv) {
      cachedAjv = new (AjvModule.default || AjvModule)();
    }
    const validate = cachedAjv.compile(parsedSchema);
    const valid = validate(parsedData);
    
    if (valid) {
      return { valid: true, errors: [] };
    }
    
    // Format errors
    const errors = validate.errors?.map((err: any) => ({
      path: err.instancePath || '$',
      message: err.message
    })) || [];
    
    return { valid: false, errors: errors };
    
  } catch (e) {
    return {
      valid: false,
      errors: [{ path: '$', message: `Validation error: ${String(e)}` }]
    };
  }
}
