import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Upload,
  FileText,
  FilePlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Trash2,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { MedicalDocument, LabResult, DocumentType } from '@/types';
import { StatusBadge, DocTypeBadge, LabFlagBadge } from '@/components/Badges';
import { Spinner, EmptyState } from '@/components/Loading';
import { formatDate, formatFileSize, timeAgo, cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'lab_report', label: 'Laboratory Report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'doctor_note', label: 'Doctor Note' },
  { value: 'medical_history', label: 'Medical History' },
  { value: 'other', label: 'Other' },
];

export function MedicalRecords() {
  const { id } = useParams();
  if (id) return <DocumentDetail documentId={id} />;
  return <RecordsList />;
}

function RecordsList() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType>('lab_report');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<Record<string, number>>({});

  useEffect(() => {
    fetchDocuments();
    return () => {
      Object.values(pollRef.current).forEach((id) => clearInterval(id));
    };
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('medical_documents')
      .select('*')
      .order('created_at', { ascending: false });
    setDocuments((data as MedicalDocument[]) || []);
    setLoading(false);
  };

  const pollDocumentStatus = useCallback((docId: string) => {
    if (pollRef.current[docId]) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('medical_documents')
        .select('*')
        .eq('id', docId)
        .maybeSingle();

      if (data) {
        const doc = data as MedicalDocument;
        setDocuments((prev) => prev.map((d) => (d.id === docId ? doc : d)));

        const done = ['ai_summary_ready', 'needs_review', 'failed', 'text_extracted'].includes(doc.processing_status);
        if (done) {
          clearInterval(interval);
          delete pollRef.current[docId];
        }
      }
    }, 3000);
    pollRef.current[docId] = Number(interval);
  }, []);

  const handleFile = async (file: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`${file.name}: Unsupported file type. Please upload a PDF, PNG, JPEG, or WebP file.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`${file.name}: File too large. Maximum size is 10MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create document record
      const fileName = file.name;
      const filePath = `${user?.id}/${Date.now()}-${fileName}`;

      const { data: docData, error: insertError } = await supabase
        .from('medical_documents')
        .insert({
          title: fileName.replace(/\.[^/.]+$/, ''),
          document_type: selectedType,
          file_name: fileName,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          processing_status: 'uploading',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      const docId = (docData as MedicalDocument).id;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('medical_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update status to processing
      await supabase
        .from('medical_documents')
        .update({ processing_status: 'processing' })
        .eq('id', docId);

      // Read file content for text extraction
      let extractedText = '';

      if (file.type === 'application/pdf') {
        extractedText = await extractPdfText(file);
      } else if (file.type.startsWith('image/')) {
        // For images, we'll note that OCR is needed
        extractedText = await extractImageText(file);
      }

      // Call AI processing edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            documentId: docId,
            extractedText,
            documentType: selectedType,
            fileName,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AI processing failed');
      }

      await fetchDocuments();
      pollDocumentStatus(docId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleRetry = async (doc: MedicalDocument) => {
    if (!doc.file_path) return;
    setError(null);

    // Re-download the file from storage and re-process
    const { data: fileData } = await supabase.storage
      .from('medical_documents')
      .download(doc.file_path);

    if (!fileData) {
      setError('Could not retrieve the original file for reprocessing.');
      return;
    }

    const file = new File([fileData], doc.file_name, { type: doc.mime_type || 'application/pdf' });

    await supabase
      .from('medical_documents')
      .update({ processing_status: 'processing', error_message: '' })
      .eq('id', doc.id);

    let extractedText = '';
    if (file.type === 'application/pdf') {
      extractedText = await extractPdfText(file);
    } else if (file.type.startsWith('image/')) {
      extractedText = await extractImageText(file);
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-process`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          documentId: doc.id,
          extractedText,
          documentType: doc.document_type,
          fileName: doc.file_name,
        }),
      }
    );

    if (response.ok) {
      pollDocumentStatus(doc.id);
    } else {
      setError('Reprocessing failed. Please try uploading the file again.');
    }
  };

  const handleDelete = async (doc: MedicalDocument) => {
    if (!confirm(`Delete "${doc.title}"? This will also remove all associated lab results and timeline events.`)) return;

    if (doc.file_path) {
      await supabase.storage.from('medical_documents').remove([doc.file_path]);
    }
    await supabase.from('medical_documents').delete().eq('id', doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-midnight-900">Medical Records</h1>
        <p className="mt-1 text-sm text-midnight-400">
          Upload lab reports, prescriptions, and other medical documents. AI will extract and explain the information.
        </p>
      </div>

      {/* Upload area */}
      <div className="card p-6">
        {/* Document type selector */}
        <div className="mb-4">
          <label className="label-text">Document type</label>
          <div className="flex flex-wrap gap-2">
            {DOC_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  selectedType === type.value
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-midnight-600 hover:bg-slate-200'
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
            dragOver
              ? 'border-teal-500 bg-teal-50/50'
              : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50/50'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileSelect}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={36} className="text-teal-600 animate-spin" />
              <div className="w-full max-w-xs">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-midnight-500 mt-2">
                  {uploadProgress < 100 ? 'Uploading...' : 'Processing with AI...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 flex items-center justify-center mb-4">
                <Upload size={24} className="text-teal-600" />
              </div>
              <p className="text-sm font-medium text-midnight-700">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-xs text-midnight-400 mt-1.5">
                Supports PDF, PNG, JPEG, WebP • Max 10MB
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 animate-fade-in">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Documents list */}
      <div>
        <h2 className="text-lg font-semibold text-midnight-800 mb-4">Upload History</h2>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : documents.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={FilePlus}
              title="No documents uploaded yet"
              description="Upload your first medical document above to get AI-powered explanations and structured data extraction."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="card-hover p-4 group">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/app/records/${doc.id}`}>
                      <p className="text-sm font-medium text-midnight-800 truncate group-hover:text-teal-600 transition-colors">
                        {doc.title}
                      </p>
                    </Link>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <DocTypeBadge type={doc.document_type} />
                      <StatusBadge status={doc.processing_status} />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-midnight-400">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{timeAgo(doc.created_at)}</span>
                      {doc.source_organization && <span>{doc.source_organization}</span>}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to={`/app/records/${doc.id}`} className="btn-ghost text-xs">
                    <FileText size={14} /> View Details
                  </Link>
                  {(doc.processing_status === 'failed' || doc.processing_status === 'needs_review') && (
                    <button onClick={() => handleRetry(doc)} className="btn-ghost text-xs">
                      <RefreshCw size={14} /> Retry
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc)}
                    className="btn-ghost text-xs text-rose-600 hover:bg-rose-50 ml-auto"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Document Detail ============

function DocumentDetail({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const [doc, setDoc] = useState<MedicalDocument | null>(null);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    setLoading(true);
    const { data: docData } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();

    const document = docData as MedicalDocument | null;
    setDoc(document);

    if (document) {
      const { data: labs } = await supabase
        .from('lab_results')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });
      setLabResults((labs as LabResult[]) || []);

      // Get file URL
      if (document.file_path) {
        const urlResult = await supabase.storage
          .from('medical_documents')
          .createSignedUrl(document.file_path, 3600);
        if (urlResult.data) setFileUrl(urlResult.data.signedUrl);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Spinner size={32} /></div>
    );
  }

  if (!doc) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle size={32} className="text-rose-400 mx-auto mb-3" />
        <p className="text-midnight-600">Document not found.</p>
        <Link to="/app/records" className="btn-secondary mt-4">Back to records</Link>
      </div>
    );
  }

  const outOfRangeCount = labResults.filter((l) => l.is_out_of_range).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link to="/app/records" className="p-2 rounded-lg hover:bg-slate-100 transition-colors mt-0.5">
            <ArrowLeft size={18} className="text-midnight-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-midnight-900">{doc.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <DocTypeBadge type={doc.document_type} />
              <StatusBadge status={doc.processing_status} />
              {doc.extraction_confidence > 0 && (
                <span className="badge bg-slate-100 text-midnight-600">
                  Confidence: {Math.round(doc.extraction_confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {doc.error_message && (
        <div className="card p-4 bg-amber-50/60 border-amber-100">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{doc.error_message}</p>
          </div>
        </div>
      )}

      {/* Document overview */}
      <div className="card p-5">
        <h3 className="font-semibold text-midnight-800 mb-4">Document Overview</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoItem label="File name" value={doc.file_name} />
          <InfoItem label="File size" value={formatFileSize(doc.file_size)} />
          <InfoItem label="Report date" value={formatDate(doc.report_date)} />
          <InfoItem label="Source" value={doc.source_organization || '—'} />
          <InfoItem label="Uploaded" value={formatDate(doc.created_at)} />
          <InfoItem label="Document type" value={doc.document_type.replace(/_/g, ' ')} />
        </div>
        {fileUrl && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4">
            <Download size={16} /> Download original
          </a>
        )}
      </div>

      {/* AI Summary */}
      {doc.ai_summary && (
        <div className="card p-5 bg-gradient-to-br from-white to-sky-50/20 border-sky-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-ai flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <h3 className="font-semibold text-midnight-800">AI Summary</h3>
            <span className="badge bg-sky-50 text-sky-700">AI-Generated</span>
          </div>
          <p className="text-sm text-midnight-700 leading-relaxed">{doc.ai_summary}</p>
        </div>
      )}

      {/* AI Explanation */}
      {doc.ai_explanation && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-ai flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <h3 className="font-semibold text-midnight-800">Explanation in Simple Language</h3>
            <span className="badge bg-sky-50 text-sky-700">AI-Generated</span>
          </div>
          <div className="prose-chat text-sm">
            {doc.ai_explanation.split('\n').map((para, i) => (
              para.trim() ? <p key={i}>{para}</p> : null
            ))}
          </div>
        </div>
      )}

      {/* Lab results */}
      {labResults.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-midnight-800">Laboratory Results</h3>
            {outOfRangeCount > 0 && (
              <span className="badge bg-amber-50 text-amber-700">
                {outOfRangeCount} outside reference range
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-midnight-400 text-xs uppercase tracking-wider">
                  <th className="pb-2 pr-4 font-medium">Test Name</th>
                  <th className="pb-2 pr-4 font-medium">Value</th>
                  <th className="pb-2 pr-4 font-medium">Unit</th>
                  <th className="pb-2 pr-4 font-medium">Reference Range</th>
                  <th className="pb-2 pr-4 font-medium">Flag</th>
                </tr>
              </thead>
              <tbody>
                {labResults.map((lab) => (
                  <tr key={lab.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-midnight-800">{lab.test_name}</td>
                    <td className={cn(
                      'py-3 pr-4 font-semibold',
                      lab.is_out_of_range ? 'text-amber-700' : 'text-midnight-800'
                    )}>
                      {lab.value}
                    </td>
                    <td className="py-3 pr-4 text-midnight-600">{lab.unit || '—'}</td>
                    <td className="py-3 pr-4 text-midnight-500">{lab.reference_range || 'Not provided'}</td>
                    <td className="py-3 pr-4"><LabFlagBadge flag={lab.flag} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-slate-50 text-xs text-midnight-400">
            Reference ranges can vary by laboratory and context. Values outside a reference range are not a diagnosis.
            Always discuss results with your clinician.
          </div>
        </div>
      )}

      {/* Questions for clinician */}
      {doc.questions_for_clinician && doc.questions_for_clinician.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <HelpCircle size={16} className="text-teal-600" />
            </div>
            <h3 className="font-semibold text-midnight-800">Questions to Discuss with Your Clinician</h3>
          </div>
          <ul className="space-y-2">
            {doc.questions_for_clinician.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-midnight-700">
                <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted text */}
      {doc.extracted_text && (
        <div className="card p-5">
          <h3 className="font-semibold text-midnight-800 mb-3">Extracted Text (from document)</h3>
          <div className="max-h-80 overflow-y-auto p-4 rounded-xl bg-slate-50 text-sm text-midnight-600 whitespace-pre-wrap font-mono leading-relaxed">
            {doc.extracted_text}
          </div>
        </div>
      )}

      {/* Original document preview */}
      {fileUrl && doc.mime_type?.startsWith('image/') && (
        <div className="card p-5">
          <h3 className="font-semibold text-midnight-800 mb-3">Original Document</h3>
          <img src={fileUrl} alt={doc.title} className="w-full rounded-xl border border-slate-200" />
        </div>
      )}

      {fileUrl && doc.mime_type === 'application/pdf' && (
        <div className="card p-5">
          <h3 className="font-semibold text-midnight-800 mb-3">Original Document</h3>
          <iframe src={fileUrl} className="w-full h-[600px] rounded-xl border border-slate-200" title={doc.title} />
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-midnight-400 mb-1">{label}</p>
      <p className="text-sm text-midnight-700 capitalize truncate">{value}</p>
    </div>
  );
}

// ============ Text Extraction ============

async function extractPdfText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Use pdf.js via CDN
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str?: string }) => item.str || '')
        .join(' ');
      fullText += pageText + '\n\n';
    }
    return fullText.trim();
  } catch (err) {
    console.error('PDF extraction error:', err);
    return '';
  }
}

async function loadPdfJs(): Promise<any> {
  // Load PDF.js from CDN
  const existing = (window as any).pdfjsLib;
  if (existing) return existing;

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const pdfjsLib = (window as any).pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return pdfjsLib;
}

async function extractImageText(file: File): Promise<string> {
  // For images, we use the Gemini vision API via the edge function
  // But first, we need to pass the image as base64 to the edge function
  // For simplicity, we return a placeholder and let the edge function know
  // In a production app, we'd use Tesseract.js or send the image to Gemini Vision
  try {
    // Convert to base64
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Call Gemini Vision via edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-process`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          imageData: base64,
          isImage: true,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.extractedText || '';
    }
    return '';
  } catch (err) {
    console.error('Image extraction error:', err);
    return '';
  }
}
