/**
 * Typed argument interfaces for all tool handlers.
 * Replaces Record<string, any> to prevent silent parameter mismatches.
 */

// ===================== WEB SEARCH =====================
export interface WebSearchArgs {
  query: string;
  engine?: string;
  max_results?: number;
  search_type?: string;
  region?: string;
  safesearch?: string;
  language?: string;
}

export interface FetchWebContentArgs {
  url: string;
  max_length?: number;
}

// ===================== FILE OPERATIONS =====================
export interface CreateFileArgs {
  file_type: string;
  filename: string;
  content?: string;
  title?: string;
  headers?: string;
  rows?: string;
  data?: string;
  output_dir?: string;
  styled?: boolean;
  paragraphs?: string;
}

export interface ReadFileArgs {
  filepath: string;
}

export interface SearchDirectoryArgs {
  root_dir: string;
  pattern?: string;
  extensions?: string;
  min_size?: number;
  max_size?: number;
  after_date?: string;
  before_date?: string;
  content_query?: string;
  recursive?: boolean;
  sort_by?: string;
  case_sensitive?: boolean;
  max_results?: number;
  show_details?: boolean;
}

// ===================== GREP =====================
export interface GrepArgs {
  pattern: string;
  path?: string;
  recursive?: boolean;
  ignore_case?: boolean;
  glob?: string;
  max_count?: number;
  include_line_numbers?: boolean;
  use_json?: boolean;
  timeout_seconds?: number;
}

// ===================== TERMINAL =====================
export interface RunCommandArgs {
  command: string;
  shell?: string;
  timeout?: number;
}

// ===================== CODE EXECUTION =====================
export interface ExecuteCodeArgs {
  language: 'python' | 'bash' | 'powershell' | 'node';
  code?: string;
  file_path?: string;
  timeout_seconds?: number;
  cwd?: string;
  args?: string[];
}

// ===================== PATCH =====================
export interface ApplyPatchArgs {
  file_path: string;
  diff: string;
  dry_run?: boolean;
  all_or_nothing?: boolean;
}

// ===================== MEMORY =====================
export interface MemorySetArgs {
  key: string;
  value: string;
  namespace?: string;
}

export interface MemoryGetArgs {
  key: string;
  namespace?: string;
}

export interface MemoryListArgs {
  namespace?: string;
  prefix?: string;
}

export interface MemoryDeleteArgs {
  key: string;
  namespace?: string;
}

export interface MemoryLogAppendArgs {
  text: string;
}

export interface MemoryLogTailArgs {
  n?: number;
}

// ===================== SEMANTIC SEARCH =====================
export interface IndexBuildArgs {
  directory: string;
  extensions?: string;
  index_path?: string;
}

export interface IndexQueryArgs {
  query: string;
  index_path?: string;
  top_k?: number;
}

export interface IndexUpdateArgs {
  directory: string;
  index_path?: string;
  extensions?: string;
}

// ===================== VALIDATION =====================
export interface ValidateSchemaArgs {
  data?: string;
  schema?: string;
  file_path?: string;
  schema_path?: string;
  format?: string;
}

// ===================== VISION =====================
export interface ReadImageArgs {
  file_path: string;
  ocr_only?: boolean;
}

// ===================== SANDBOX =====================
export interface CheckEnvArgs {
  check_docker?: boolean;
  check_wsl2?: boolean;
  check_pwsh?: boolean;
}

export interface RunInSandboxArgs {
  language: 'python' | 'node' | 'bash';
  code: string;
  file_path?: string;
  timeout_seconds?: number;
  cwd?: string;
  args?: string[];
  network_enabled?: boolean;
}

export interface ManageSandboxArgs {
  action: 'pull' | 'list';
  image?: string;
}

// ===================== GIT =====================
export interface GitStatusArgs { directory: string; }
export interface GitDiffArgs { directory: string; file?: string; }
export interface GitLogArgs { directory: string; n?: number; }
export interface GitBlameArgs { directory: string; file: string; }
export interface GitListFilesArgs { directory: string; commit?: string; path_in_tree?: string; }
export interface GitReadFileArgs { directory: string; commit?: string; file_path: string; }

// ===================== BACKGROUND TASKS =====================
export interface RunBackgroundTaskArgs {
  command: string;
  shell?: string;
  cwd?: string;
  timeout?: number;
}

export interface CheckTaskStatusArgs { task_id: string; }
export interface StopTaskArgs { task_id: string; }

// ===================== AUDIO / IMAGE =====================
export interface TranscribeAudioArgs {
  file_path: string;
  language?: string;
  model?: string;
}

export interface DescribeImageArgs { file_path: string; }

// ===================== CODE INTEL =====================
export interface FindSymbolArgs {
  symbol: string;
  directory: string;
  language?: string;
}

export interface GetReferencesArgs {
  symbol: string;
  directory: string;
  language?: string;
}

// ===================== BROWSE JS =====================
export interface BrowseJsArgs {
  url: string;
  wait_for_selector?: string;
}

// ===================== GITHUB =====================
export interface GithubPushArgs {
  directory: string;
  message?: string;
  branch?: string;
  dry_run?: boolean;
}

export interface GithubCreatePrArgs {
  directory: string;
  title: string;
  body?: string;
  head: string;
  base?: string;
}

export interface GithubCreateIssueArgs {
  directory: string;
  title: string;
  body?: string;
  labels?: string[];
}

export interface GithubListPrsArgs {
  directory: string;
  state?: string;
  limit?: number;
}

export interface GithubGetPrArgs { directory: string; pr_number: number; }

export interface GithubMergePrArgs { directory: string; pr_number: number; }

export interface GithubListIssuesArgs {
  directory: string;
  state?: string;
  limit?: number;
}

export interface GithubGetIssueArgs { directory: string; issue_number: number; }

export interface GithubCommentArgs {
  directory: string;
  target_type: 'pr' | 'issue';
  target_number: number;
  body: string;
}

export interface GithubApiArgs {
  directory: string;
  route: string;
  method?: string;
  body?: any;
}

// ===================== VIDEO =====================
export interface AnalyzeVideoArgs {
  file_path: string;
  interval?: number;
  question?: string;
}

// ===================== WORK STATE =====================
export interface SaveWorkArgs { key: string; content: string; }
export interface LoadWorkArgs { key: string; }
export interface ClearWorkArgs { key: string; }

// ===================== WRITE FILE =====================
export interface WriteFileArgs {
  filepath: string;
  content: string;
}
