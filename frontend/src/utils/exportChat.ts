import type { ChatSession } from '../types';

/**
 * Export a chat session as a Markdown formatted string
 */
export function exportSessionAsMarkdown(session: ChatSession): string {
  const lines: string[] = [];

  lines.push(`# ${session.title}`);
  lines.push('');
  lines.push(`**Session ID:** \`${session.id}\``);
  lines.push(`**Created:** ${session.createdAt}`);
  if (session.repositoryId) {
    lines.push(`**Repository:** \`${session.repositoryId}\``);
  }
  if (session.documentId) {
    lines.push(`**Document:** \`${session.documentId}\``);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of session.messages) {
    const sender = msg.role === 'user' ? '👤 **You**' : '🤖 **CodexRAG Agent**';
    lines.push(`### ${sender}  \`${msg.timestamp}\``);
    lines.push('');
    lines.push(msg.content);
    lines.push('');

    if (msg.retrievedFiles && msg.retrievedFiles.length > 0) {
      lines.push('<details><summary>📎 Retrieved Source Files</summary>');
      lines.push('');
      for (const file of msg.retrievedFiles) {
        lines.push(`- \`${file.path}\` (lines ${file.lines || 'N/A'}, confidence: ${(file.confidence * 100).toFixed(0)}%)`);
      }
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  lines.push(`*Exported from CodexRAG on ${new Date().toLocaleString()}*`);

  return lines.join('\n');
}

/**
 * Export a chat session as a JSON string
 */
export function exportSessionAsJSON(session: ChatSession): string {
  const exportData = {
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      repositoryId: session.repositoryId || null,
      documentId: session.documentId || null,
    },
    messages: session.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      retrievedFiles: msg.retrievedFiles || [],
      tokensUsed: msg.tokensUsed || null,
    })),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Trigger a file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
