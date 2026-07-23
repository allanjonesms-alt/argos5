import React, { useState, useRef } from 'react';
import { 
  MilitarPromocao, 
  VagaQuadro, 
  PromocaoUserLevel 
} from '../../typesPromocoes';
import { 
  evaluateMilitarPromotion, 
  DEFAULT_PROXIMAS_DATAS 
} from '../../services/promocoesService';
import { 
  Award, 
  Calendar, 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  User, 
  ShieldCheck, 
  Share2,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TimelineRelatoriosProps {
  militares: MilitarPromocao[];
  vagas: VagaQuadro[];
  selectedMilitarParam?: MilitarPromocao | null;
}

export const TimelineRelatorios: React.FC<TimelineRelatoriosProps> = ({
  militares,
  vagas,
  selectedMilitarParam
}) => {
  const [selectedMilitarId, setSelectedMilitarId] = useState<string>(
    selectedMilitarParam?.id || militares[0]?.id || ''
  );

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const selectedMilitar = militares.find(m => m.id === selectedMilitarId) || militares[0];
  const evalResult = selectedMilitar 
    ? evaluateMilitarPromotion(selectedMilitar, vagas, militares, DEFAULT_PROXIMAS_DATAS[0].data)
    : null;

  const handleExportCsv = () => {
    const headers = ['Matricula', 'Nome Completo', 'Nome Guerra', 'Graduacao', 'Quadro', 'Unidade', 'Data Praca', 'Ultima Promocao', 'Antiguidade', 'Intersticio Meses', 'Situacao'];
    const rows = militares.map(m => [
      m.matricula,
      `"${m.nome}"`,
      `"${m.nome_guerra}"`,
      m.graduacao,
      m.quadro,
      `"${m.unidade}"`,
      m.data_praca,
      m.ultima_promocao,
      m.ordem_antiguidade,
      m.intersticio_meses,
      m.situacao_funcional
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ARGOS_PMMS_Relatorio_Efetivo_Promocoes_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePdfReport = async () => {
    if (!pdfContainerRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(pdfContainerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Relatorio_Ficha_Promocional_${selectedMilitar?.nome_guerra}_PMMS.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Linha do Tempo & Documentos
            </span>
          </div>
          <h2 className="text-2xl font-black text-navy-950 uppercase tracking-tight mt-1">
            Linha do Tempo da Carreira e Emissão de Relatórios
          </h2>
          <p className="text-xs text-navy-400 font-semibold max-w-xl mt-0.5">
            Visualize a evolução do policial militar desde a praça e exporte relatórios oficiais do ARGOS em PDF ou Excel/CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (CSV)</span>
          </button>

          <button
            disabled={isGeneratingPdf}
            onClick={handleGeneratePdfReport}
            className="bg-navy-950 hover:bg-navy-900 text-amber-400 font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Imprimir PDF Oficial'}</span>
          </button>
        </div>
      </div>

      {/* Select Military */}
      <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs">
        <label className="block text-[10px] font-black uppercase text-navy-500 mb-2">Selecionar Policial Militar para Ficha de Carreira</label>
        <select
          value={selectedMilitarId}
          onChange={(e) => setSelectedMilitarId(e.target.value)}
          className="w-full bg-navy-50 border border-navy-200 text-navy-950 font-bold text-xs rounded-2xl p-3.5 focus:ring-2 focus:ring-amber-500 outline-none"
        >
          {militares.map(m => (
            <option key={m.id} value={m.id}>
              {m.graduacao} {m.nome_guerra} ({m.quadro}) - Matrícula {m.matricula}
            </option>
          ))}
        </select>
      </div>

      {/* Printable Report / Visual Timeline Container */}
      {selectedMilitar && (
        <div ref={pdfContainerRef} className="bg-white border border-navy-200 rounded-3xl p-8 shadow-lg space-y-8">
          {/* Official PMMS / ARGOS PDF Header */}
          <div className="border-b-2 border-navy-950 pb-6 text-center space-y-1">
            <h1 className="text-xl font-black text-navy-950 uppercase tracking-tight">
              POLÍCIA MILITAR DO ESTADO DO MATO GROSSO DO SUL
            </h1>
            <h2 className="text-xs font-black text-navy-800 uppercase tracking-widest">
              SISTEMA ARGOS - DIRETORIA DE GESTÃO DE PESSOAL (DGP)
            </h2>
            <p className="text-[10px] font-bold text-navy-500 uppercase tracking-widest pt-1">
              RELATÓRIO OFICIAL DE PROGRESSÃO FUNCIONAL E ALMANAQUE DE ANTIGUIDADE
            </p>
          </div>

          {/* Military Identification Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-navy-50 p-5 rounded-2xl border border-navy-100 text-xs">
            <div>
              <span className="text-[9px] font-black text-navy-400 uppercase block">Nome Completo</span>
              <span className="font-black text-navy-950 uppercase">{selectedMilitar.nome}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-navy-400 uppercase block">Nome de Guerra / Matrícula</span>
              <span className="font-black text-navy-950 uppercase">{selectedMilitar.nome_guerra} ({selectedMilitar.matricula})</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-navy-400 uppercase block">Posto/Graduação & Quadro</span>
              <span className="font-black text-navy-950 uppercase">{selectedMilitar.graduacao} - {selectedMilitar.quadro}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-navy-400 uppercase block">Unidade Lotação</span>
              <span className="font-black text-navy-950 uppercase">{selectedMilitar.unidade}</span>
            </div>
          </div>

          {/* Career Timeline Section */}
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase text-navy-950 tracking-wider flex items-center gap-2 border-b border-navy-100 pb-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Evolução Histórica da Carreira</span>
            </h3>

            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-navy-200">
              {/* Event 1: Admission */}
              <div className="relative flex items-start gap-4">
                <div className="absolute -left-6 w-5 h-5 bg-navy-950 rounded-full border-2 border-white flex items-center justify-center text-amber-400 font-bold text-[9px]">
                  1
                </div>
                <div className="bg-navy-50 border border-navy-100 p-4 rounded-2xl flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-navy-950 uppercase">Inclusão nas Fileiras da PMMS (Praça)</span>
                    <span className="text-[10px] font-bold text-navy-500">{selectedMilitar.data_praca}</span>
                  </div>
                  <p className="text-[11px] text-navy-600 font-medium">
                    Nomeação e ingresso oficial no Quadro {selectedMilitar.quadro} da Polícia Militar de Mato Grosso do Sul.
                  </p>
                </div>
              </div>

              {/* Recorded Promotion History */}
              {selectedMilitar.historico && selectedMilitar.historico.length > 0 ? (
                selectedMilitar.historico.map((h, idx) => (
                  <div key={h.id} className="relative flex items-start gap-4">
                    <div className="absolute -left-6 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-navy-950 font-bold text-[9px]">
                      {idx + 2}
                    </div>
                    <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-navy-950 uppercase">
                          Promoção a {h.graduacao_para} ({h.criterio})
                        </span>
                        <span className="text-[10px] font-bold text-navy-500">{h.data_evento}</span>
                      </div>
                      <p className="text-[11px] text-navy-700 font-medium">
                        Publicado no {h.bcg_numero} de {h.bcg_data}. {h.observacoes || ''}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-6 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-navy-950 font-bold text-[9px]">
                    2
                  </div>
                  <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-navy-950 uppercase">
                        Última Promoção a {selectedMilitar.graduacao}
                      </span>
                      <span className="text-[10px] font-bold text-navy-500">{selectedMilitar.ultima_promocao}</span>
                    </div>
                    <p className="text-[11px] text-navy-700 font-medium">
                      Promoção registrada e em vigor no quadro de antiguidade da PMMS.
                    </p>
                  </div>
                </div>
              )}

              {/* Future Forecast Milestone */}
              {evalResult && (
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-6 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[9px]">
                    ★
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-emerald-950 uppercase">
                        Previsão Próxima Promoção: {evalResult.proxima_graduacao || 'Fim de Carreira'}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800">{evalResult.previsao_promocao_data}</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      {evalResult.elegivel_vaga 
                        ? 'Policial militar atende aos requisitos de interstício e vaga aberta.' 
                        : evalResult.motivo_inelegibilidade}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Official Signature Footer */}
          <div className="pt-12 flex justify-around text-center text-xs">
            <div className="space-y-1">
              <div className="w-48 border-b border-navy-950 mx-auto mb-1"></div>
              <span className="font-black text-navy-950 uppercase block">{selectedMilitar.nome_guerra}</span>
              <span className="text-[10px] text-navy-500 uppercase block font-bold">Policial Militar Interessado</span>
            </div>

            <div className="space-y-1">
              <div className="w-48 border-b border-navy-950 mx-auto mb-1"></div>
              <span className="font-black text-navy-950 uppercase block">DIRETORIA DE GESTÃO DE PESSOAL</span>
              <span className="text-[10px] text-navy-500 uppercase block font-bold">Polícia Militar de Mato Grosso do Sul</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
