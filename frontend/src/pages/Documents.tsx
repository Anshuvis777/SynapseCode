import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  File, 
  FileCode, 
  Info,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useRepositoryStore } from '../store/repositoryStore';
import { useToast } from '../components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../utils';

export const Documents: React.FC = () => {
  const { documents, uploadDocument, deleteDocument } = useRepositoryStore();
  const { toast } = useToast();
  
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validTypes = ['.pdf', '.md', '.docx', '.txt'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        toast('Invalid File Format', {
          description: `Only PDF, MD, DOCX, and TXT are supported. Failed: ${file.name}`,
          type: 'error',
        });
        continue;
      }

      toast('Uploading Document', {
        description: `Starting upload for ${file.name}...`,
        type: 'info',
      });

      await uploadDocument(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove ${name} from DevAssist knowledge index?`)) {
      deleteDocument(id);
      toast('Document Deleted', {
        description: `${name} has been removed from context indices.`,
        type: 'warning',
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <span className="p-2 bg-red-950/40 border border-red-900/30 text-red-400 rounded-lg flex"><FileText className="w-5 h-5" /></span>;
      case 'markdown':
        return <span className="p-2 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-lg flex"><FileCode className="w-5 h-5" /></span>;
      case 'docx':
        return <span className="p-2 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-lg flex"><FileText className="w-5 h-5" /></span>;
      default:
        return <span className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg flex"><File className="w-5 h-5" /></span>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto select-none">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-50">Document Corpus</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Upload specifications, manuals, or guideline documents to augment RAG retrieval inside your chat interface.
        </p>
      </div>

      {/* Info Notice */}
      <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 text-blue-200 rounded-lg flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-normal">
          <span className="font-bold text-blue-300">Semantic RAG Injection:</span> Chunks extracted from PDF, DOCX, TXT, or MD documents are embedded into the workspace store. You can query these documents dynamically inside your chat session by simply referencing their content.
        </p>
      </div>

      {/* Two panel split: Left upload zone, Right document table list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Zone Left */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm">Upload Knowledge Bases</CardTitle>
              <CardDescription>File size limit 10MB per document</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-center">
              
              {/* Drag and Drop Container */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[220px]",
                  dragActive 
                    ? "border-blue-500 bg-blue-950/10" 
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/10 hover:bg-zinc-900/20"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.md,.docx,.txt"
                />

                <div className="h-10 w-10 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mb-4 shadow-sm">
                  <Upload className="w-5 h-5 text-zinc-350" />
                </div>
                
                <p className="text-xs text-zinc-200 font-semibold mb-1">
                  Drag & Drop files here
                </p>
                <p className="text-[10px] text-zinc-500 mb-4 leading-normal max-w-[160px] mx-auto">
                  or click to browse directories for documents
                </p>
                
                {/* Accept badge tags */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {['.PDF', '.MD', '.DOCX', '.TXT'].map((ext) => (
                    <span key={ext} className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-850 text-[9px] font-bold text-zinc-500 rounded font-mono">
                      {ext}
                    </span>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Document List Right */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Document Corpus Index</CardTitle>
                <CardDescription>Select documents to delete or monitor ingestion</CardDescription>
              </div>
              <span className="text-[10px] bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded font-mono text-zinc-400 font-semibold">
                {documents.length} items
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              {documents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-zinc-900">
                    <thead className="text-zinc-455 text-zinc-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">File Name</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-zinc-300">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-zinc-900/30">
                          {/* File Name cell */}
                          <td className="py-3 px-3 max-w-[200px] truncate">
                            <div className="flex items-center gap-2.5">
                              {getFileIcon(doc.type)}
                              <div className="overflow-hidden">
                                <p className="font-semibold text-zinc-200 truncate" title={doc.name}>
                                  {doc.name}
                                </p>
                                <span className="text-[9px] text-zinc-500 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  Uploaded: {doc.uploadedAt}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* File Type Badge */}
                          <td className="py-3 px-3">
                            <span className="font-bold text-[9.5px] uppercase font-mono text-zinc-450 text-zinc-400">
                              {doc.type}
                            </span>
                          </td>

                          {/* Size */}
                          <td className="py-3 px-3 font-mono text-[10.5px]">
                            {doc.size}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            {doc.status === 'uploading' ? (
                              <div className="space-y-1 w-20">
                                <span className="text-[9.5px] font-bold text-blue-400 animate-pulse">
                                  Uploading {doc.uploadProgress}%
                                </span>
                                <div className="h-1 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-blue-500 h-full transition-all duration-300"
                                    style={{ width: `${doc.uploadProgress}%` }}
                                  />
                                </div>
                              </div>
                            ) : doc.status === 'uploaded' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                Ingested
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/30 border border-red-900/30 px-1.5 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3" />
                                Failed
                              </span>
                            )}
                          </td>

                          {/* Delete button */}
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleDelete(doc.id, doc.name)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded border border-transparent hover:border-zinc-850 transition"
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12">
                  <EmptyState
                    icon={FileText}
                    title="No Documents Uploaded"
                    description="Drag-and-drop a PDF, Markdown, DOCX, or TXT file to compile it into the semantic RAG context store."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
