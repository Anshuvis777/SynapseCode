import React, { useState } from 'react';
import { Check, Copy, Code, Eye, BarChart2 } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split content into blocks: code, table, lists, headers, paragraphs
  const parseBlocks = (text: string) => {
    const blocks: { type: string; content: string; language?: string }[] = [];
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';
    let currentCode = '';
    let currentTable: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block Toggle
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          blocks.push({ type: 'code', content: currentCode.trim(), language: codeLanguage });
          inCodeBlock = false;
          currentCode = '';
          codeLanguage = '';
        } else {
          inCodeBlock = true;
          codeLanguage = line.trim().substring(3).trim().toLowerCase() || 'text';
        }
        continue;
      }

      if (inCodeBlock) {
        currentCode += line + '\n';
        continue;
      }

      // Table Row detection (starts/ends with | or contains | )
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        // Skip separator row |---|---|
        if (line.includes('-') && !line.match(/[a-zA-Z0-9]/)) {
          continue;
        }
        currentTable.push(line);
        continue;
      } else if (currentTable.length > 0) {
        // Table ended
        blocks.push({ type: 'table', content: currentTable.join('\n') });
        currentTable = [];
      }

      // Header detection
      if (line.startsWith('#')) {
        blocks.push({ type: 'header', content: line });
        continue;
      }

      // List detection
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ') || /^\d+\.\s/.test(line.trim())) {
        blocks.push({ type: 'list-item', content: line });
        continue;
      }

      // Standard text / empty line / Math Block
      if (line.trim().startsWith('$$') && line.trim().endsWith('$$')) {
        blocks.push({ type: 'math-block', content: line.trim().slice(2, -2).trim() });
        continue;
      }

      if (line.trim()) {
        blocks.push({ type: 'paragraph', content: line });
      } else {
        blocks.push({ type: 'empty', content: '' });
      }
    }

    // Edge cases if content ended but in blocks
    if (inCodeBlock && currentCode) {
      blocks.push({ type: 'code', content: currentCode.trim(), language: codeLanguage });
    }
    if (currentTable.length > 0) {
      blocks.push({ type: 'table', content: currentTable.join('\n') });
    }

    return blocks;
  };

  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 text-zinc-200 text-[14.5px] leading-relaxed max-w-full overflow-hidden select-text">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'header':
            return <HeaderBlock key={idx} content={block.content} />;
          case 'code':
            return <CodeBlock key={idx} content={block.content} language={block.language || 'text'} />;
          case 'table':
            return <TableBlock key={idx} content={block.content} />;
          case 'list-item':
            return <ListItemBlock key={idx} content={block.content} />;
          case 'math-block':
            return <MathBlock key={idx} content={block.content} isBlock={true} />;
          case 'paragraph':
            return <ParagraphBlock key={idx} content={block.content} />;
          case 'empty':
            return <div key={idx} className="h-2" />;
          default:
            return null;
        }
      })}
    </div>
  );
};

/* --- SUB-COMPONENTS --- */

// Header Renderer
const HeaderBlock: React.FC<{ content: string }> = ({ content }) => {
  const level = content.match(/^#+/)?.[0].length || 1;
  const text = content.replace(/^#+\s*/, '');
  const parsedText = renderInlineStyles(text);

  if (level === 1) return <h1 className="text-xl font-bold text-zinc-50 mt-4 mb-2 tracking-tight">{parsedText}</h1>;
  if (level === 2) return <h2 className="text-lg font-semibold text-zinc-100 mt-3 mb-1.5 border-b border-zinc-800 pb-1">{parsedText}</h2>;
  return <h3 className="text-base font-semibold text-zinc-200 mt-2 mb-1">{parsedText}</h3>;
};

// Code Block with Copy Button and Syntax Highlighting
const CodeBlock: React.FC<{ content: string; language: string }> = ({ content, language }) => {
  const [copied, setCopied] = useState(false);
  const [showRawMermaid, setShowRawMermaid] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMermaid = language === 'mermaid';

  // Simple syntax highlighter for UI presentation
  const highlightCode = (code: string, lang: string) => {
    if (lang === 'text') return code;
    
    // Fallback simple highlighter using regexes for visual flavor
    const keywords = /\b(const|let|var|function|return|export|import|from|class|extends|async|await|def|import|from|as|if|elif|else|for|while|try|except|with|yield|interface|type|public|private)\b/g;
    const strings = /("[^"]*"|'[^']*'|`[^`]*`)/g;
    const comments = /(\/\/.*|\/\*[\s\S]*?\*\/|#.*)/g;
    const numbers = /\b(\d+)\b/g;
    const types = /\b(string|number|boolean|any|void|unknown|List|Dict|Tuple|str|int|float|bool|Depends|APIRouter|FastAPI)\b/g;

    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    highlighted = highlighted.replace(comments, '<span class="text-zinc-500 font-normal">$1</span>');
    highlighted = highlighted.replace(strings, '<span class="text-emerald-400">$1</span>');
    highlighted = highlighted.replace(keywords, '<span class="text-blue-400 font-semibold">$1</span>');
    highlighted = highlighted.replace(types, '<span class="text-sky-300 font-medium">$1</span>');
    highlighted = highlighted.replace(numbers, '<span class="text-amber-400">$1</span>');

    return <code dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  // If it's a Mermaid diagram, render a beautiful interactive block
  if (isMermaid) {
    return (
      <div className="border border-zinc-800 rounded-lg overflow-hidden my-4 bg-zinc-950">
        <div className="flex justify-between items-center px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
            <BarChart2 className="w-4 h-4" />
            <span>DevAssist Agent Flowchart</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRawMermaid(!showRawMermaid)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded border border-zinc-800 hover:bg-zinc-800 transition"
            >
              {showRawMermaid ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
              <span>{showRawMermaid ? 'Show Diagram' : 'Show Source'}</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded border border-zinc-800 hover:bg-zinc-800 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {showRawMermaid ? (
          <pre className="p-4 text-xs font-mono overflow-x-auto text-zinc-400 bg-zinc-950/70 select-text">
            {content}
          </pre>
        ) : (
          <div className="p-6 flex flex-col items-center justify-center bg-zinc-900/10 min-h-[220px]">
            {/* Render a beautiful interactive flow diagram mock based on content */}
            <div className="w-full max-w-md space-y-4">
              <div className="flex flex-col items-center">
                <div className="px-3.5 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono rounded shadow-sm">
                  Start Prompt
                </div>
                <div className="w-0.5 h-6 bg-zinc-700"></div>
                <div className="px-3.5 py-1.5 bg-blue-950/40 border border-blue-800/80 text-blue-300 text-xs font-mono rounded shadow-sm text-center">
                  1. Semantic Vector Search
                </div>
                <div className="w-0.5 h-6 bg-zinc-700"></div>
                <div className="px-3.5 py-1.5 bg-purple-950/40 border border-purple-800/80 text-purple-300 text-xs font-mono rounded shadow-sm text-center">
                  2. LLM Context Formulator
                </div>
                <div className="w-0.5 h-6 bg-zinc-700"></div>
                <div className="px-3.5 py-1.5 bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs font-mono rounded shadow-sm text-center">
                  3. Generated Code response
                </div>
              </div>
            </div>
            <div className="mt-4 text-[11px] text-zinc-500 italic">
              Interactive visualization compiled by DevAssist LLM
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden my-3 bg-zinc-950 shadow-md">
      <div className="flex justify-between items-center px-4 py-1.5 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-[11.5px] font-mono text-zinc-400 uppercase font-semibold tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded border border-zinc-800/60 hover:bg-zinc-800 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto text-zinc-300 bg-zinc-950/60 leading-relaxed select-text">
        {highlightCode(content, language)}
      </pre>
    </div>
  );
};

// Table Renderer
const TableBlock: React.FC<{ content: string }> = ({ content }) => {
  const rows = content.split('\n').map((row) =>
    row
      .trim()
      .split('|')
      .filter((_, i, arr) => i > 0 && i < arr.length - 1)
      .map((cell) => cell.trim())
  );

  const headers = rows[0];
  const bodyRows = rows.slice(1);

  return (
    <div className="overflow-x-auto my-3 border border-zinc-800 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-zinc-800 text-left">
        <thead className="bg-zinc-900/70 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2 border-r border-zinc-800 last:border-r-0">
                {renderInlineStyles(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-900/10 text-zinc-300 text-xs">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-zinc-900/30">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2 border-r border-zinc-800 last:border-r-0 max-w-xs truncate">
                  {renderInlineStyles(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// List Item Renderer
const ListItemBlock: React.FC<{ content: string }> = ({ content }) => {
  const isOrdered = /^\d+\.\s/.test(content.trim());
  const itemText = content.replace(/^(\*|-|\d+\.)\s*/, '');
  const parsed = renderInlineStyles(itemText);

  return (
    <div className="flex items-start gap-2 pl-2">
      {isOrdered ? (
        <span className="text-zinc-500 font-mono text-xs mt-0.5 font-bold">1.</span>
      ) : (
        <span className="text-blue-500 text-base leading-none select-none mt-0.5">•</span>
      )}
      <span className="text-zinc-300">{parsed}</span>
    </div>
  );
};

// Math Render Block (LaTeX support)
const MathBlock: React.FC<{ content: string; isBlock?: boolean }> = ({ content, isBlock }) => {
  return (
    <div
      className={`font-mono text-blue-300 border border-blue-900/20 bg-blue-950/10 px-3 py-1.5 rounded text-sm ${
        isBlock ? 'my-3 text-center block' : 'inline-block px-1.5 py-0.5'
      }`}
    >
      <span className="text-blue-500 select-none mr-1.5">𝝭</span>
      {content}
    </div>
  );
};

// Paragraph Block
const ParagraphBlock: React.FC<{ content: string }> = ({ content }) => {
  return <p className="text-zinc-300 text-[14px] leading-relaxed">{renderInlineStyles(content)}</p>;
};

/* --- HELPER FOR INLINE STYLING --- */
function renderInlineStyles(text: string): React.ReactNode[] {
  // Regex to match: **bold**, `code`, $math$, [link](url)
  const regex = /(\*\*.*?\*\*|`.*?`|\$.*?\$|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-zinc-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded font-mono text-xs border border-zinc-700/60">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      return <MathBlock key={i} content={part.slice(1, -1)} isBlock={false} />;
    }
    if (part.startsWith('[') && part.includes('](')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <a
            key={i}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline font-medium transition"
          >
            {match[1]}
          </a>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}
