import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  BCGRecord, 
  MilitarPromocao, 
  PromocaoUserLevel,
  GraduacaoPMMS,
  QuadroPMMS
} from '../../typesPromocoes';
import { isUserInArgos, DEFAULT_INTERSTICIOS } from '../../services/promocoesService';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  FileSearch,
  Check,
  ListOrdered,
  Plus,
  Trash2,
  FileSpreadsheet,
  UserCheck,
  UserX,
  RefreshCw,
  Info
} from 'lucide-react';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '5.6.205'}/build/pdf.worker.min.mjs`;

interface ExtractedAlmanaqueItem {
  id: string;
  nr_classificacao: number;
  graduacao: GraduacaoPMMS;
  nome: string;
  matricula: string;
  ultima_promocao: string;
  quadro: QuadroPMMS;
  cadastrado_argos: boolean;
}

interface ImportadorBCGProps {
  bcgs: BCGRecord[];
  militares: MilitarPromocao[];
  userLevel: PromocaoUserLevel;
  argosUsersList?: Array<{ matricula: string; nome: string; cpf?: string }>;
  onSaveBCG: (bcg: Partial<BCGRecord>) => Promise<BCGRecord>;
  onSaveMilitar: (militar: Partial<MilitarPromocao>) => Promise<void>;
  onApplyPromocaoSimulada: (militarId: string, novaGraduacao: GraduacaoPMMS) => Promise<void>;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    let pageText = '';
    let lastY: number | null = null;

    for (const item of textContent.items as any[]) {
      if (!item.str || item.str.trim().length === 0) continue;
      const currentY = item.transform ? item.transform[5] : null;

      // Insert newline when vertical Y position changes significantly (new line on page)
      if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 3) {
        pageText += '\n';
      } else if (item.hasEOL) {
        pageText += '\n';
      } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
        pageText += ' ';
      }

      pageText += item.str.trim();
      if (currentY !== null) lastY = currentY;
    }

    fullText += `--- PÁGINA ${pageNum} ---\n` + pageText + '\n\n';
  }

  return fullText;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export const ImportadorBCG: React.FC<ImportadorBCGProps> = ({
  bcgs,
  militares,
  userLevel,
  argosUsersList = [],
  onSaveBCG,
  onSaveMilitar,
  onApplyPromocaoSimulada
}) => {
  const [importMode, setImportMode] = useState<'upload' | 'texto'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bcgNumeroInput, setBcgNumeroInput] = useState<string>('BCG 077/2026');
  const [bcgDataInput, setBcgDataInput] = useState<string>(new Date().toISOString().substring(0, 10));
  
  const [rawText, setRawText] = useState<string>(
`--- PÁGINA 1 ---
1º - Subtenente - AURELIO FRANCISCO DA SILVA - Matrícula 102340 - Promoção: 05/09/2019
2º - 1º Sargento - GUSTAVO HENRIQUE SOUZA - Matrícula 087456 - Promoção: 25/12/2021
3º - 2º Sargento - MARCOS VINICIUS PEREIRA - Matrícula 098123 - Promoção: 05/09/2021
--- PÁGINA 2 ---
4º - 3º Sargento - RODRIGO MENDES FERREIRA - Matrícula 102346 - Promoção: 21/04/2021
5º - Cabo - CARLOS ALBERTO SILVA - Matrícula 102345 - Promoção: 10/05/2020
6º - Soldado - ALLAN JONES - Matrícula 484506021 - Promoção: 05/09/2022`
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedList, setExtractedList] = useState<ExtractedAlmanaqueItem[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setExtractedList([]);
      setIsConfirmed(false);
      setSuccessMessage(null);

      // Auto-set document name
      const fname = file.name.replace('.pdf', '').replace(/_/g, ' ');
      if (fname.toUpperCase().includes('BCG')) {
        setBcgNumeroInput(fname.toUpperCase());
      }
    }
  };

  // Parsing function to extract Quadro de Acesso / Almanaque entries from all pages text
  const parseBCGTextToAlmanaque = (text: string): ExtractedAlmanaqueItem[] => {
    // Filter out page headers like "--- PÁGINA 1 ---" or empty lines
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.toUpperCase().startsWith('--- PÁGINA') && !l.toUpperCase().startsWith('PÁGINA '));

    const rawItems: Array<{
      docIndex: number;
      graduacao: GraduacaoPMMS;
      nome: string;
      matricula: string;
      ultima_promocao: string;
      quadro: QuadroPMMS;
      cadastrado_argos: boolean;
    }> = [];

    let currentRank: GraduacaoPMMS = 'Subtenente';

    lines.forEach((line, index) => {
      const upperLine = line.toUpperCase();

      // Check for section headers updating currentRank
      if (upperLine.includes('SUBTENENTE') || upperLine.includes('SUB TEN') || upperLine.includes('SUB-TEN')) {
        currentRank = 'Subtenente';
      } else if (upperLine.includes('1º SARGENTO') || upperLine.includes('1º SGT') || upperLine.includes('1 SARGENTO')) {
        currentRank = '1º Sargento';
      } else if (upperLine.includes('2º SARGENTO') || upperLine.includes('2º SGT') || upperLine.includes('2 SARGENTO')) {
        currentRank = '2º Sargento';
      } else if (upperLine.includes('3º SARGENTO') || upperLine.includes('3º SGT') || upperLine.includes('3 SARGENTO')) {
        currentRank = '3º Sargento';
      } else if (upperLine.includes('CABO') || upperLine.includes(' CB ')) {
        currentRank = 'Cabo';
      } else if (upperLine.includes('SOLDADO') || upperLine.includes(' SD ')) {
        currentRank = 'Soldado';
      } else if (upperLine.includes('CORONEL') && !upperLine.includes('TENENTE-CORONEL')) {
        currentRank = 'Coronel';
      } else if (upperLine.includes('TENENTE-CORONEL') || upperLine.includes('TEN-CEL')) {
        currentRank = 'Tenente-Coronel';
      } else if (upperLine.includes('MAJOR')) {
        currentRank = 'Major';
      } else if (upperLine.includes('CAPITÃO') || upperLine.includes('CAPITAO')) {
        currentRank = 'Capitão';
      } else if (upperLine.includes('1º TENENTE') || upperLine.includes('1º TEN')) {
        currentRank = '1º Tenente';
      } else if (upperLine.includes('2º TENENTE') || upperLine.includes('2º TEN')) {
        currentRank = '2º Tenente';
      }

      // If line is a pure section header or document title, skip adding as a person line
      if (upperLine.startsWith('QUADRO DE ACESSO') || upperLine.startsWith('RELAÇÃO DE') || upperLine.startsWith('ALMANAQUE') || upperLine.startsWith('BOLETIM GERAL') || upperLine.startsWith('ESTADO DE MATO GROSSO')) {
        return;
      }

      // Extract specific rank for this line if present, else fallback to currentRank
      let lineGrad: GraduacaoPMMS = currentRank;
      if (upperLine.includes('CORONEL') && !upperLine.includes('TENENTE-CORONEL')) lineGrad = 'Coronel';
      else if (upperLine.includes('TENENTE-CORONEL') || upperLine.includes('TEN-CEL')) lineGrad = 'Tenente-Coronel';
      else if (upperLine.includes('MAJOR')) lineGrad = 'Major';
      else if (upperLine.includes('CAPITÃO') || upperLine.includes('CAPITAO')) lineGrad = 'Capitão';
      else if (upperLine.includes('1º TENENTE') || upperLine.includes('1º TEN')) lineGrad = '1º Tenente';
      else if (upperLine.includes('2º TENENTE') || upperLine.includes('2º TEN')) lineGrad = '2º Tenente';
      else if (upperLine.includes('SUBTENENTE') || upperLine.includes('SUB TEN') || upperLine.includes('SUB-TEN')) lineGrad = 'Subtenente';
      else if (upperLine.includes('1º SARGENTO') || upperLine.includes('1º SGT')) lineGrad = '1º Sargento';
      else if (upperLine.includes('2º SARGENTO') || upperLine.includes('2º SGT')) lineGrad = '2º Sargento';
      else if (upperLine.includes('3º SARGENTO') || upperLine.includes('3º SGT')) lineGrad = '3º Sargento';
      else if (upperLine.includes('CABO')) lineGrad = 'Cabo';
      else if (upperLine.includes('SOLDADO')) lineGrad = 'Soldado';

      // Extract Matricula
      let mat = '';
      const matchMat = line.match(/(?:MATRÍCULA|MATRICULA|MAT|MAT\.)\s*[:\.\-]?\s*(\d{5,12})/i) || line.match(/(\d{5,10})/);
      if (matchMat) {
        mat = matchMat[1];
      } else {
        mat = `${Math.floor(100000 + Math.random() * 899999)}`;
      }

      // Extract Data Ultima Promoção
      let dtPromocao = new Date().toISOString().substring(0, 10);
      const matchDate = line.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/) || line.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      if (matchDate) {
        if (matchDate[1].length === 4) {
          dtPromocao = `${matchDate[1]}-${matchDate[2]}-${matchDate[3]}`;
        } else {
          dtPromocao = `${matchDate[3]}-${matchDate[2]}-${matchDate[1]}`;
        }
      }

      // Extract Nome
      let nome = line
        .replace(/^(\d+)[\º\ª\.\-\s]/, '')
        .replace(/(?:SOLDADO|CABO|3º SARGENTO|2º SARGENTO|1º SARGENTO|SUBTENENTE|SUB TEN|SUB-TEN|2º TENENTE|1º TENENTE|CAPITÃO|MAJOR|TENENTE-CORONEL|CORONEL|SD|CB|1º SGT|2º SGT|3º SGT|1º SARG|2º SARG|3º SARG|SUB TEN|1º TEN|2º TEN|CAP|MAJ|TEN CEL)/gi, '')
        .replace(/(?:MATRÍCULA|MATRICULA|MAT|MAT\.)\s*[:\.\-]?\s*\d+/gi, '')
        .replace(/(?:PROMOVIDO EM|DATA PROMOÇÃO|PROMOÇÃO|DATA|EM)\s*[:\.\-]?\s*\d{2}[\/\-]\d{2}[\/\-]\d{4}/gi, '')
        .replace(/[\-\:\,\.]/g, ' ')
        .trim();

      if (!nome || nome.length < 3) {
        return;
      }

      // Determine Quadro
      const q: QuadroPMMS = (lineGrad === 'Capitão' || lineGrad === 'Major' || lineGrad === 'Tenente-Coronel' || lineGrad === 'Coronel' || lineGrad === '1º Tenente' || lineGrad === '2º Tenente') ? 'QOPM' : 'QPPM';

      // Check against ARGOS User Database
      const hasArgos = isUserInArgos(mat, nome, undefined, argosUsersList);

      rawItems.push({
        docIndex: index,
        graduacao: lineGrad,
        nome: nome.toUpperCase(),
        matricula: mat,
        ultima_promocao: dtPromocao,
        quadro: q,
        cadastrado_argos: hasArgos
      });
    });

    // Rank hierarchy map
    const RANK_HIERARCHY: Record<GraduacaoPMMS, number> = {
      'Coronel': 1,
      'Tenente-Coronel': 2,
      'Major': 3,
      'Capitão': 4,
      '1º Tenente': 5,
      '2º Tenente': 6,
      'Subtenente': 7,
      '1º Sargento': 8,
      '2º Sargento': 9,
      '3º Sargento': 10,
      'Cabo': 11,
      'Soldado': 12
    };

    // Sort by rank hierarchy first, then maintain original document order
    rawItems.sort((a, b) => {
      const rA = RANK_HIERARCHY[a.graduacao] || 99;
      const rB = RANK_HIERARCHY[b.graduacao] || 99;
      if (rA !== rB) return rA - rB;
      return a.docIndex - b.docIndex;
    });

    // Map to final items with continuous classification starting at 1
    return rawItems.map((item, idx) => ({
      id: `ext_${Date.now()}_${idx}`,
      nr_classificacao: idx + 1,
      graduacao: item.graduacao,
      nome: item.nome,
      matricula: item.matricula,
      ultima_promocao: item.ultima_promocao,
      quadro: item.quadro,
      cadastrado_argos: item.cadastrado_argos
    }));
  };

  const handleProcessAndExtract = async () => {
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      if (importMode === 'upload' && selectedFile) {
        // 1. First, perform fast, complete client-side extraction using pdfjs-dist
        // This processes all pages line-by-line and extracts all 3,000+ officers without token truncation
        const pdfText = await extractTextFromPdf(selectedFile);
        setRawText(pdfText);
        const parsedLocal = parseBCGTextToAlmanaque(pdfText);

        if (parsedLocal && parsedLocal.length > 0) {
          setExtractedList(parsedLocal);
          setIsProcessing(false);
          return;
        }

        // 2. Fallback to Gemini proxy if client-side extraction produced no results
        try {
          const base64Pdf = await fileToBase64(selectedFile);
          const response = await fetch('/api/parse-bcg-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Pdf })
          });

          if (response.ok) {
            const resData = await response.json();
            if (Array.isArray(resData.data) && resData.data.length > 0) {
              const parsedItems: ExtractedAlmanaqueItem[] = resData.data.map((item: any, idx: number) => {
                const mat = item.matricula ? String(item.matricula).trim() : `${Math.floor(100000 + Math.random() * 899999)}`;
                const nome = item.nome ? String(item.nome).toUpperCase().trim() : `POLICIAL MILITAR ${idx + 1}`;
                const grad = (item.graduacao || 'Soldado') as GraduacaoPMMS;
                const q: QuadroPMMS = (grad === 'Capitão' || grad === 'Major' || grad === 'Tenente-Coronel' || grad === 'Coronel' || grad === '1º Tenente' || grad === '2º Tenente') ? 'QOPM' : 'QPPM';
                const hasArgos = isUserInArgos(mat, nome, undefined, argosUsersList);

                return {
                  id: `gemini_ext_${Date.now()}_${idx}`,
                  nr_classificacao: Number(item.nr_classificacao) || (idx + 1),
                  graduacao: grad,
                  nome,
                  matricula: mat,
                  ultima_promocao: item.ultima_promocao || new Date().toISOString().substring(0, 10),
                  quadro: q,
                  cadastrado_argos: hasArgos
                };
              });

              setExtractedList(parsedItems.sort((a, b) => a.nr_classificacao - b.nr_classificacao));
              setIsProcessing(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Proxy Gemini não respondeu:', err);
        }
      } else {
        // Text paste mode
        const parsed = parseBCGTextToAlmanaque(rawText);
        setExtractedList(parsed);
      }
    } catch (err) {
      console.error('Erro ao processar PDF do BCG:', err);
      alert('Não foi possível ler o arquivo PDF. Verifique se o arquivo não está protegido por senha.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddManualRow = () => {
    const nextClass = extractedList.length + 1;
    const newItem: ExtractedAlmanaqueItem = {
      id: `manual_${Date.now()}`,
      nr_classificacao: nextClass,
      graduacao: 'Soldado',
      nome: 'NOVO POLICIAL MILITAR',
      matricula: '123456',
      ultima_promocao: new Date().toISOString().substring(0, 10),
      quadro: 'QPPM',
      cadastrado_argos: false
    };
    setExtractedList(prev => [...prev, newItem].sort((a, b) => a.nr_classificacao - b.nr_classificacao));
  };

  const handleRemoveRow = (id: string) => {
    setExtractedList(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof ExtractedAlmanaqueItem, value: any) => {
    setExtractedList(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'matricula' || field === 'nome') {
          updated.cadastrado_argos = isUserInArgos(updated.matricula, updated.nome, undefined, argosUsersList);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleConfirmImport = async () => {
    if (extractedList.length === 0) return;
    setIsProcessing(true);

    try {
      // 1. Save BCG Record
      await onSaveBCG({
        numero: bcgNumeroInput || 'BCG OFICIAL PMMS',
        ano: new Date().getFullYear(),
        data_publicacao: bcgDataInput,
        arquivo_nome: selectedFile ? selectedFile.name : 'Extrato_BCG_Quadro_Acesso.txt',
        status: 'PROCESSADO',
        promocoes_extraidas: extractedList.length,
        reservas_extraidas: 0,
        transferencias_extraidas: 0,
        processado_por: 'Operador ARGOS'
      });

      // 2. Save extracted military officers into database in classification order
      for (const item of extractedList) {
        const nomeGuerra = item.nome.split(' ').pop() || item.nome;
        await onSaveMilitar({
          id: `militar_bcg_${item.matricula}`,
          matricula: item.matricula,
          nome: item.nome,
          nome_guerra: nomeGuerra,
          graduacao: item.graduacao,
          quadro: item.quadro,
          unidade: 'PMMS',
          data_praca: item.ultima_promocao,
          ultima_promocao: item.ultima_promocao,
          ordem_antiguidade: item.nr_classificacao,
          intersticio_meses: DEFAULT_INTERSTICIOS[item.graduacao] || 36,
          situacao_funcional: 'ATIVO',
          cadastrado_argos: item.cadastrado_argos
        });
      }

      setIsConfirmed(true);
      setSuccessMessage(`Quadro de Acesso criado com sucesso! ${extractedList.length} policiais militares atualizados no Almanaque Geral.`);
    } catch (err) {
      console.error('Erro ao importar lista do BCG:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalArgosCadastrados = extractedList.filter(i => i.cadastrado_argos).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Informative Banner regarding BCG vs Diário Oficial */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-amber-950 flex items-start gap-4 shadow-xs">
        <div className="p-2.5 bg-amber-500 text-navy-950 rounded-2xl shrink-0 mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <span className="font-black text-xs uppercase tracking-wider text-amber-900 block">
            Finalidade do Boletim Geral (BCG) & Diário Oficial (DOE)
          </span>
          <p className="text-xs text-amber-900/90 font-semibold leading-relaxed">
            Os BCGs importados servem exclusivamente para estabelecer a <strong>ordem classificatória do Quadro de Acesso (Almanaque Geral)</strong>. A formalização e efetivação das promoções serão realizadas posteriormente mediante a importação do <strong>Diário Oficial (DOE)</strong>.
          </p>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Importação & Almanaque
            </span>
            <span className="bg-navy-950 text-amber-400 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Quadro de Acesso
            </span>
          </div>
          <h2 className="text-2xl font-black text-navy-950 uppercase tracking-tight mt-1">
            Importador de BCG & Quadro de Acesso (Almanaque)
          </h2>
          <p className="text-xs text-navy-400 font-semibold max-w-3xl mt-0.5">
            Leia todas as páginas do BCG para extrair a lista geral classificatória. Policiais com cadastro no ARGOS possuem a etiqueta de status correspondente.
          </p>
        </div>
      </div>

      {/* Mode Selection & Inputs */}
      <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-navy-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportMode('upload')}
              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                importMode === 'upload' 
                  ? 'bg-navy-950 text-amber-400 shadow-sm' 
                  : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
              }`}
            >
              Upload Arquivo PDF
            </button>
            <button
              onClick={() => setImportMode('texto')}
              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                importMode === 'texto' 
                  ? 'bg-navy-950 text-amber-400 shadow-sm' 
                  : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
              }`}
            >
              Texto / Páginas do BCG
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="text-[9px] font-black uppercase text-navy-400 block">Número do BCG</label>
              <input
                type="text"
                value={bcgNumeroInput}
                onChange={(e) => setBcgNumeroInput(e.target.value)}
                className="bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-navy-400 block">Data de Publicação</label>
              <input
                type="date"
                value={bcgDataInput}
                onChange={(e) => setBcgDataInput(e.target.value)}
                className="bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Upload Mode UI */}
        {importMode === 'upload' ? (
          <div className="bg-navy-50/50 border-2 border-dashed border-navy-200 hover:border-amber-500 rounded-2xl p-8 text-center space-y-4 transition-all flex flex-col items-center justify-center min-h-[220px]">
            <div className="w-12 h-12 bg-white text-amber-500 rounded-2xl flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-navy-950 uppercase">
                {selectedFile ? selectedFile.name : 'Selecione o arquivo PDF do BCG'}
              </h3>
              <p className="text-[11px] text-navy-400 font-medium mt-1">
                {selectedFile 
                  ? `Tamanho: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` 
                  : 'Carregue o PDF do Boletim Geral para extração automática do Quadro de Acesso'}
              </p>
            </div>
            <label className="cursor-pointer bg-navy-950 hover:bg-navy-900 text-amber-400 font-black text-xs uppercase tracking-wider px-6 py-3 rounded-2xl transition-all shadow-md inline-block">
              <span>{selectedFile ? 'Trocar Arquivo PDF' : 'Escolher Arquivo PDF'}</span>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          /* Text Paste / Pages Reader UI */
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-navy-500">
              Cole o conteúdo das páginas do BCG para leitura completa da classificação:
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Exemplo:&#10;1º - Soldado - ALLAN JONES - Matrícula 484506021 - Promoção: 05/09/2022&#10;2º - Cabo - CARLOS ALBERTO SILVA - Matrícula 102345 - Promoção: 10/05/2020"
              className="w-full bg-navy-50 border border-navy-200 text-navy-950 font-mono text-xs p-4 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleProcessAndExtract}
            disabled={isProcessing || (importMode === 'upload' && !selectedFile)}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-navy-950 font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition-all shadow-md flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Lendo páginas do BCG e extraindo classificação...</span>
              </>
            ) : (
              <>
                <FileSearch className="w-4 h-4" />
                <span>Extrair e Ordenar Lista Classificatória</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold text-xs uppercase">{successMessage}</span>
        </div>
      )}

      {/* Extracted Classification List Table */}
      {extractedList.length > 0 && (
        <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-navy-950 font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase">
                  Lista Classificatória
                </span>
                <span className="text-xs font-black uppercase text-navy-950">
                  Quadro de Acesso ({extractedList.length} Policiais Extraídos)
                </span>
              </div>
              <p className="text-[11px] text-navy-400 font-medium mt-1">
                {totalArgosCadastrados} policiais militares foram identificados com cadastro ativo no ARGOS.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddManualRow}
                className="bg-navy-50 hover:bg-navy-100 text-navy-900 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Adicionar Policial</span>
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                {isConfirmed ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvo no Almanaque</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Gerar Lista Geral no Almanaque</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-navy-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-950 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="p-3.5 pl-6 w-24">Nr. Classif.</th>
                  <th className="p-3.5 w-36">Graduação</th>
                  <th className="p-3.5">Nome Militar</th>
                  <th className="p-3.5 w-36">Matrícula</th>
                  <th className="p-3.5 w-36">Última Promoção</th>
                  <th className="p-3.5 w-36 text-center">Cadastro ARGOS</th>
                  <th className="p-3.5 pr-6 text-right w-16">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 text-xs text-navy-900">
                {extractedList.map((item) => {
                  const isArgos = item.cadastrado_argos;

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors hover:bg-amber-50/40 ${
                        isArgos ? 'bg-amber-50/20 text-navy-950 font-normal' : 'font-normal text-navy-700'
                      }`}
                    >
                      {/* Nr de Classificação */}
                      <td className="p-3.5 pl-6">
                        <input
                          type="number"
                          value={item.nr_classificacao}
                          onChange={(e) => handleUpdateItem(item.id, 'nr_classificacao', Number(e.target.value))}
                          className="w-16 bg-navy-50 border border-navy-200 text-xs rounded-lg px-2 py-1 text-center font-medium text-navy-950"
                        />
                      </td>

                      {/* Graduação */}
                      <td className="p-3.5">
                        <select
                          value={item.graduacao}
                          onChange={(e) => handleUpdateItem(item.id, 'graduacao', e.target.value as GraduacaoPMMS)}
                          className="bg-navy-50 border border-navy-200 text-xs rounded-lg px-2 py-1 font-medium text-navy-950"
                        >
                          <option value="Soldado">Soldado</option>
                          <option value="Cabo">Cabo</option>
                          <option value="3º Sargento">3º Sargento</option>
                          <option value="2º Sargento">2º Sargento</option>
                          <option value="1º Sargento">1º Sargento</option>
                          <option value="Subtenente">Subtenente</option>
                          <option value="2º Tenente">2º Tenente</option>
                          <option value="1º Tenente">1º Tenente</option>
                          <option value="Capitão">Capitão</option>
                          <option value="Major">Major</option>
                          <option value="Tenente-Coronel">Tenente-Coronel</option>
                          <option value="Coronel">Coronel</option>
                        </select>
                      </td>

                      {/* Nome */}
                      <td className="p-3.5">
                        <input
                          type="text"
                          value={item.nome}
                          onChange={(e) => handleUpdateItem(item.id, 'nome', e.target.value.toUpperCase())}
                          className="w-full bg-navy-50 border border-navy-200 text-xs rounded-lg px-2.5 py-1 uppercase font-normal text-navy-900"
                        />
                      </td>

                      {/* Matrícula */}
                      <td className="p-3.5 font-mono">
                        <input
                          type="text"
                          value={item.matricula}
                          onChange={(e) => handleUpdateItem(item.id, 'matricula', e.target.value)}
                          className="w-28 bg-navy-50 border border-navy-200 text-xs rounded-lg px-2 py-1 font-medium text-navy-900"
                        />
                      </td>

                      {/* Data da Última Promoção */}
                      <td className="p-3.5">
                        <input
                          type="date"
                          value={item.ultima_promocao}
                          onChange={(e) => handleUpdateItem(item.id, 'ultima_promocao', e.target.value)}
                          className="bg-navy-50 border border-navy-200 text-xs rounded-lg px-2 py-1 font-medium text-navy-900"
                        />
                      </td>

                      {/* Status ARGOS (Destaque em negrito se possui cadastro) */}
                      <td className="p-3.5 text-center">
                        {isArgos ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500 text-navy-950 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                            <UserCheck className="w-3 h-3" />
                            <span>CADASTRADO ARGOS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-navy-100 text-navy-500 font-medium text-[10px] px-2.5 py-1 rounded-full uppercase">
                            <UserX className="w-3 h-3" />
                            <span>SEM CADASTRO</span>
                          </span>
                        )}
                      </td>

                      {/* Ação Excluir */}
                      <td className="p-3.5 pr-6 text-right">
                        <button
                          onClick={() => handleRemoveRow(item.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                          title="Remover da lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History of Registered BCGs */}
      <div className="space-y-4">
        <h3 className="text-lg font-black uppercase text-navy-950 tracking-tight">
          Histórico de Boletins Gerais Registrados ({bcgs.length})
        </h3>

        <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-950 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="p-4 pl-6">Número BCG</th>
                  <th className="p-4">Data Publicação</th>
                  <th className="p-4">Arquivo / Origem</th>
                  <th className="p-4">Registros Extraídos</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 text-xs font-semibold text-navy-900">
                {bcgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-navy-400 font-bold uppercase">
                      Nenhum Boletim Geral registrado até o momento.
                    </td>
                  </tr>
                ) : (
                  bcgs.map((b) => (
                    <tr key={b.id} className="hover:bg-navy-50/60 transition-colors">
                      <td className="p-4 pl-6 font-black text-navy-950">
                        {b.numero}
                      </td>
                      <td className="p-4 font-bold text-navy-700">
                        {b.data_publicacao}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-navy-600">
                        {b.arquivo_nome}
                      </td>
                      <td className="p-4 font-black text-emerald-600">
                        {b.promocoes_extraidas} policiais
                      </td>
                      <td className="p-4">
                        <span className="bg-emerald-100 text-emerald-800 font-black text-[9px] px-2.5 py-1 rounded-full uppercase">
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-navy-500 font-medium text-[11px]">
                        {b.processado_por}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
