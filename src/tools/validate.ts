/**
 * Schema Validation Tool for LM Studio Plugin
 * 
 * Validates JSON/YAML data against JSON Schema with precise error paths.
 * Returns structured JSON for model parsing.
 */

import * as Ajv from 'ajv';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// BUG-FIX: Cache ajv instance to avoid creating new instances per validation
let cachedAjv: any = null;

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
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
      try {
        // BUG-08 FIX: Branch on format to parse YAML or JSON
        parsedData = format === 'yaml' ? yaml.load(data) : JSON.parse(data);
      } catch (e) {
        return {
          valid: false,
          errors: [{ path: '$', message: `Invalid ${format.toUpperCase()}: ${String(e)}` }]
        };
      }
    } else if (file_path) {
      const content = fs.readFileSync(file_path, 'utf8');
      try {
        // BUG-08 FIX: Branch on format to parse YAML or JSON
        parsedData = format === 'yaml' ? yaml.load(content) : JSON.parse(content);
      } catch (e) {
        return {
          valid: false,
          errors: [{ path: '$', message: `Invalid ${format.toUpperCase()} in ${file_path}: ${String(e)}` }]
        };
      }
    } else {
      return {
        valid: false,
        errors: [{ path: '$', message: 'Either data or file_path must be provided' }]
      };
    }
    
    // Parse schema
    let parsedSchema: any;
    if (schema) {
      try {
        parsedSchema = JSON.parse(schema);
      } catch (e) {
        return {
          valid: false,
          errors: [{ path: '$', message: `Invalid JSON schema: ${String(e)}` }]
        };
      }
    } else if (schema_path) {
      const schemaContent = fs.readFileSync(schema_path, 'utf8');
      try {
        // Try JSON first, then YAML as fallback
        try {
          parsedSchema = JSON.parse(schemaContent);
        } catch {
          // Not valid JSON, try YAML
          parsedSchema = yaml.load(schemaContent);
        }
      } catch (e) {
        return {
          valid: false,
          errors: [{ path: '$', message: `Invalid schema in ${schema_path}: ${String(e)}` }]
        };
      }
    } else {
      return {
        valid: false,
        errors: [{ path: '$', message: 'Either schema or schema_path must be provided' }]
      };
    }
    
    // Validate
    // BUG-FIX: Use cached ajv instance to improve performance
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
