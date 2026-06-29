import JSZip from 'jszip';
import { generateId } from '@/lib/format';

export interface ParsedNotionTask {
  title: string;
  done: boolean;
}

export interface ParsedNotionPage {
  title: string;
  content: string;
  notionId: string;
  tasks: ParsedNotionTask[];
  children: ParsedNotionPage[];
  // Used for hierarchy resolution
  path: string;
}

export interface ParseResult {
  pages: ParsedNotionPage[];
  totalTasks: number;
}

/**
 * Extracts the Notion ID (32 chars) from the end of a filename or folder name.
 * e.g. "My Page Title abcdef1234567890abcdef1234567890.md" -> "abcdef1234567890abcdef1234567890"
 */
function extractNotionId(name: string): string | null {
  const match = name.match(/([a-f0-9]{32})(?:\.md)?$/i);
  return match ? match[1] : null;
}

/**
 * Cleans the filename to get the actual title.
 */
function extractTitle(name: string, notionId: string | null): string {
  let title = name.replace(/\.md$/i, '');
  if (notionId) {
    title = title.replace(new RegExp(`\\s*${notionId}$`), '');
  }
  // Decode URI components if Notion URL-encoded them
  try {
    return decodeURIComponent(title).trim() || 'Untitled';
  } catch {
    return title.trim() || 'Untitled';
  }
}

/**
 * Parses markdown content to extract tasks and clean up the body.
 */
function parseMarkdownBody(markdown: string): { content: string; tasks: ParsedNotionTask[] } {
  const tasks: ParsedNotionTask[] = [];
  const lines = markdown.split('\n');
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match Notion's task list format: "- [ ] task" or "- [x] task"
    const taskMatch = line.match(/^\s*-\s*\[([ xX])\]\s+(.*)/);
    
    if (taskMatch) {
      const isDone = taskMatch[1].toLowerCase() === 'x';
      const title = taskMatch[2].trim();
      if (title) {
        tasks.push({ title, done: isDone });
      }
      // Keep the task in the markdown as well, so it displays properly
      cleanedLines.push(line);
    } else {
      cleanedLines.push(line);
    }
  }

  // Graceful fallback for unsupported blocks: mostly they are just markdown, 
  // so they will render natively or gracefully degrade to text.
  
  return {
    content: cleanedLines.join('\n'),
    tasks
  };
}

/**
 * Main parser function to read a ZIP file and construct a page hierarchy.
 */
export async function parseNotionExport(file: File): Promise<ParseResult> {
  const zip = new JSZip();
  const loaded = await zip.loadAsync(file);
  
  const pagesMap = new Map<string, ParsedNotionPage>();
  let totalTasks = 0;

  // First pass: Read all markdown files
  for (const relativePath in loaded.files) {
    const zipEntry = loaded.files[relativePath];
    
    if (zipEntry.dir || !relativePath.endsWith('.md')) {
      // Note: Attachments (images/csvs) could be processed here by converting to base64 Data URIs
      // and replacing their relative paths in the markdown content. 
      // For Phase 1, we preserve them as text references (they will break unless uploaded, 
      // but gracefully degrade).
      continue;
    }

    const contentStr = await zipEntry.async('text');
    const pathParts = relativePath.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    const notionId = extractNotionId(filename);
    const title = extractTitle(filename, notionId);
    
    const { content, tasks } = parseMarkdownBody(contentStr);
    
    const page: ParsedNotionPage = {
      title,
      content,
      notionId: notionId || generateId('notion'),
      tasks,
      children: [],
      path: relativePath,
    };
    
    pagesMap.set(relativePath, page);
    totalTasks += tasks.length;
  }

  // Second pass: Build hierarchy based on folder structure
  // Notion exports nest child pages inside a folder named identical to the parent page (without the .md)
  const rootPages: ParsedNotionPage[] = [];

  const allPages = Array.from(pagesMap.values());
  
  for (const page of allPages) {
    const pathParts = page.path.split('/');
    if (pathParts.length === 1) {
      // Root level page
      rootPages.push(page);
    } else {
      // Find parent
      // The parent folder is pathParts[pathParts.length - 2]
      // And the parent markdown file should be right beside that folder, or higher up.
      // E.g. Parent abcdef/Child 1234.md -> Parent is Parent abcdef.md
      const parentFolderPath = pathParts.slice(0, pathParts.length - 1).join('/');
      const expectedParentMdPath = parentFolderPath + '.md';
      
      const parent = pagesMap.get(expectedParentMdPath);
      if (parent) {
        parent.children.push(page);
      } else {
        // If we can't find the parent, attach it to root to avoid losing data
        rootPages.push(page);
      }
    }
  }

  return {
    pages: rootPages,
    totalTasks
  };
}
