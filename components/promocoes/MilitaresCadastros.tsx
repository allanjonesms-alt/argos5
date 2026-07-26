import React, { useState } from 'react';
import { 
  MilitarPromocao, 
  GraduacaoPMMS, 
  QuadroPMMS, 
  SituacaoFuncionalPMMS, 
  PromocaoUserLevel,
  CriterioPromocao
} from '../../typesPromocoes';
import { DEFAULT_INTERSTICIOS, isUserInArgos, PROXIMO_POSTO_GRADUACAO, sortByGraduacaoAndAntiguidade } from '../../services/promocoesService';
import { 
  Search, 
  Plus, 
  Trash2, 
  User, 
  Award, 
  X, 
  UserCheck,
  UserX,
  TrendingUp,
  ArrowUpDown,
  Users,
  ShieldCheck,
  Layers,
  Calendar,
  Filter
} from 'lucide-react';

interface MilitaresCadastrosProps {
  militares: MilitarPromocao[];
  userLevel: PromocaoUserLevel;
  argosUsersList?: Array<{ matricula: string; nome: string; cpf?: string }>;
  onSaveMilitar: (militar: Partial<MilitarPromocao>) => Promise<void>;
  onDeleteMilitar: (id: string) => Promise<void>;
  onReorderMilitar?: (id: string, newPosition: number) => Promise<void>;
  onPromoteMilitar?: (
    id: string, 
    dataPromocao?: string, 
    criterio?: CriterioPromocao, 
    bcgNum?: string, 
    observacoes?: string
  ) => Promise<void>;
  onRefreshData?: () => void;
}

export const MilitaresCadastros: React.FC<MilitaresCadastrosProps> = ({
  militares,
  userLevel,
  argosUsersList = [],
  onSaveMilitar,
  onDeleteMilitar,
  onReorderMilitar,
  onPromoteMilitar,
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGraduacao, setSelectedGraduacao] = useState<string>('');
  const [sortBy, setSortBy] = useState<'antiguidade' | 'nome' | 'promocao'>('antiguidade');

  // Modal State for New Military
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilitar, setEditingMilitar] = useState<Partial<MilitarPromocao> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for Promotion
  const [promotingMilitar, setPromotingMilitar] = useState<MilitarPromocao | null>(null);
  const [promoteDate, setPromoteDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [promoteCriterio, setPromoteCriterio] = useState<CriterioPromocao>('ANTIGUIDADE');
  const [promoteBcgNum, setPromoteBcgNum] = useState<string>('BCG OFICIAL PMMS');
  const [promoteObs, setPromoteObs] = useState<string>('');
  const [isPromoting, setIsPromoting] = useState<boolean>(false);

  // Pre-calculate rank positions and offsets across all officers (sorted by rank hierarchy then antiguidade)
  const sortedAll = [...militares].sort(sortByGraduacaoAndAntiguidade);
  const rankCounts: Record<string, number> = {};
  const rankOffsets: Record<string, number> = {};
  const rankMap: Record<string, { pos: number; total: number; offset: number }> = {};

  sortedAll.forEach(m => {
    rankCounts[m.graduacao] = (rankCounts[m.graduacao] || 0) + 1;
  });

  const rankCurrentCounters: Record<string, number> = {};
  let accumulatedOffset = 0;
  let lastGradForOffset = '';

  sortedAll.forEach((m) => {
    if (m.graduacao !== lastGradForOffset) {
      if (lastGradForOffset && rankCounts[lastGradForOffset]) {
        accumulatedOffset += rankCounts[lastGradForOffset];
      }
      rankOffsets[m.graduacao] = accumulatedOffset;
      lastGradForOffset = m.graduacao;
    }

    rankCurrentCounters[m.graduacao] = (rankCurrentCounters[m.graduacao] || 0) + 1;
    const rankPos = rankCurrentCounters[m.graduacao];

    rankMap[m.id] = {
      pos: rankPos,
      total: rankCounts[m.graduacao] || 1,
      offset: rankOffsets[m.graduacao] || 0
    };
  });

  // Filtered & Sorted militaries
  const filteredMilitares = militares.filter(m => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = !cleanSearch || (
      m.nome.toLowerCase().includes(cleanSearch) ||
      m.matricula.includes(cleanSearch) ||
      (m.cpf && m.cpf.includes(cleanSearch))
    );

    if (cleanSearch) {
      return matchesSearch && (!selectedGraduacao || m.graduacao === selectedGraduacao);
    }

    if (!selectedGraduacao) return false;

    return m.graduacao === selectedGraduacao;
  }).sort((a, b) => {
    if (sortBy === 'antiguidade') return sortByGraduacaoAndAntiguidade(a, b);
    if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
    if (sortBy === 'promocao') return new Date(a.ultima_promocao).getTime() - new Date(b.ultima_promocao).getTime();
    return 0;
  });

  const handleOpenAddModal = () => {
    setEditingMilitar({
      graduacao: 'Soldado',
      quadro: 'QPPM',
      unidade: '1º BPM - CAMPO GRANDE',
      data_praca: new Date().toISOString().substring(0, 10),
      ultima_promocao: new Date().toISOString().substring(0, 10),
      ordem_antiguidade: militares.length + 1,
      intersticio_meses: 60,
      situacao_funcional: 'ATIVO'
    });
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilitar || !editingMilitar.nome || !editingMilitar.matricula) return;
    setIsSaving(true);
    try {
      await onSaveMilitar(editingMilitar);
      setIsModalOpen(false);
      setEditingMilitar(null);
    } catch (err) {
      console.error('Erro ao salvar militar:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover o cadastro do policial militar ${name}?`)) {
      await onDeleteMilitar(id);
    }
  };

  const handleOpenPromoteModal = (m: MilitarPromocao) => {
    const nextGrad = PROXIMO_POSTO_GRADUACAO[m.graduacao];
    if (!nextGrad) return;
    setPromotingMilitar(m);
    setPromoteDate(new Date().toISOString().substring(0, 10));
    setPromoteCriterio('ANTIGUIDADE');
    setPromoteBcgNum('BCG OFICIAL PMMS');
    setPromoteObs('');
  };

  const handleConfirmPromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingMilitar || !onPromoteMilitar) return;
    if (!promoteDate) {
      alert('Por favor, informe a data da promoção.');
      return;
    }
    setIsPromoting(true);
    try {
      await onPromoteMilitar(
        promotingMilitar.id,
        promoteDate,
        promoteCriterio,
        promoteBcgNum,
        promoteObs
      );
      setPromotingMilitar(null);
    } catch (err) {
      console.error('Erro ao efetivar promoção:', err);
    } finally {
      setIsPromoting(false);
    }
  };

  const handleReorderPosition = async (id: string, newPos: number) => {
    if (onReorderMilitar) {
      await onReorderMilitar(id, newPos);
    }
  };

  const canEdit = userLevel === 'ADMIN' || userLevel === 'EDITOR';

  // Variable to keep track of rank changes when rendering table rows
  let lastRenderedGraduation = '';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Quick Rank Selection Buttons Bar */}
      <div className="bg-white border border-navy-100 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-amber-500" />
            <span className="text-xs font-black uppercase tracking-wider text-navy-950">
              SELEÇÃO POR GRADUAÇÃO (SUBTENENTE A SOLDADO)
            </span>
            <span className="hidden sm:inline text-[10px] text-navy-500 font-semibold">
              (Clique em uma graduação para carregar apenas a lista correspondente)
            </span>
          </div>
          {selectedGraduacao && (
            <button
              onClick={() => setSelectedGraduacao('')}
              className="text-[11px] font-bold text-navy-500 hover:text-navy-800 underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Limpar seleção
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {[
            'Subtenente',
            '1º Sargento',
            '2º Sargento',
            '3º Sargento',
            'Cabo',
            'Soldado',
            '2º Tenente',
            '1º Tenente',
            'Capitão',
            'Major',
            'Tenente-Coronel',
            'Coronel'
          ].map((grad) => {
            const count = rankCounts[grad] || 0;
            const isSelected = selectedGraduacao === grad;
            return (
              <button
                key={grad}
                onClick={() => setSelectedGraduacao(grad)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 active:scale-95 ${
                  isSelected
                    ? 'bg-navy-950 text-amber-400 shadow-md ring-2 ring-amber-500/50 font-black'
                    : count > 0
                      ? 'bg-white hover:bg-navy-50 text-navy-900 border border-navy-200 hover:border-amber-400'
                      : 'bg-navy-50/50 text-navy-400 border border-navy-100 opacity-60'
                }`}
              >
                <span>{grad}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  isSelected 
                    ? 'bg-amber-500/20 text-amber-300' 
                    : count > 0 
                      ? 'bg-navy-100 text-navy-800' 
                      : 'bg-navy-100/50 text-navy-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Action Header */}
      <div className="bg-white border border-navy-100 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Pesquisar militar por nome, matrícula ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-navy-50/80 border border-navy-100 text-navy-950 text-xs font-bold rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAddModal}
            className="bg-amber-500 hover:bg-amber-400 text-navy-950 font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0 justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Militar</span>
          </button>
        )}
      </div>

      {/* Military List Table */}
      <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy-950 text-white text-[10px] font-black uppercase tracking-wider">
                <th className="p-4 pl-6">Classificação</th>
                <th className="p-4">Posto / Grad.</th>
                <th className="p-4">Nome Militar</th>
                <th className="p-4">Matrícula</th>
                <th className="p-4">Última Promoção</th>
                <th className="p-4">Cadastro ARGOS</th>
                <th className="p-4">Quadro</th>
                <th className="p-4 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50 text-xs text-navy-900">
              {filteredMilitares.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-navy-500 font-bold text-xs">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Users className="w-12 h-12 text-amber-500/80" />
                      {!selectedGraduacao && !searchTerm ? (
                        <>
                          <p className="text-sm font-black text-navy-950 uppercase tracking-wide">Selecione uma Graduação</p>
                          <p className="text-xs font-normal text-navy-500 max-w-md">
                            Clique em um dos botões acima (<strong className="text-navy-900">Subtenente a Soldado</strong>) para carregar a relação de policiais militares da respectiva graduação.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-black text-navy-900 uppercase tracking-wider">Nenhum militar encontrado</p>
                          <p className="text-[11px] font-normal text-navy-500">
                            Não foi localizado nenhum policial militar na graduação de <strong className="text-navy-950">{selectedGraduacao || 'pesquisada'}</strong>.
                          </p>
                        </>
                      )}
                      {canEdit && (
                        <button
                          onClick={handleOpenAddModal}
                          className="mt-2 bg-amber-500 hover:bg-amber-400 text-navy-950 font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-2xl transition-all shadow-md flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Cadastrar Novo Militar</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMilitares.map((m) => {
                  const isArgos = m.cadastrado_argos || isUserInArgos(m.matricula, m.nome, m.cpf, argosUsersList);
                  const nextGrad = PROXIMO_POSTO_GRADUACAO[m.graduacao];
                  const rankInfo = rankMap[m.id] || { pos: m.ordem_antiguidade, total: 1, offset: 0 };

                  // Check if we need to render a rank divider banner ("marco na divisão das graduações")
                  const showGraduationDivider = m.graduacao !== lastRenderedGraduation;
                  if (showGraduationDivider) {
                    lastRenderedGraduation = m.graduacao;
                  }

                  return (
                    <React.Fragment key={m.id}>
                      {showGraduationDivider && (
                        <tr className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 text-white border-y-2 border-amber-500/50 shadow-md">
                          <td colSpan={8} className="py-3 px-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-500 text-navy-950 font-black flex items-center justify-center text-xs shadow-sm shrink-0">
                                  <Award className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2.5">
                                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
                                      DIVISÃO DE GRADUAÇÃO — {m.graduacao.toUpperCase()} PM
                                    </h3>
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                      {m.quadro}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-navy-200 font-medium mt-0.5">
                                    Almanaque de Antiguidade • Classificação reiniciada nesta graduação (1º ao {rankInfo.total}º)
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="bg-navy-800/90 text-amber-400 border border-amber-500/20 text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-xs">
                                  <Users className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{rankInfo.total} {rankInfo.total === 1 ? 'Militar' : 'Militares'}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr 
                        className={`transition-colors hover:bg-amber-50/40 ${
                          isArgos ? 'bg-amber-50/20 text-navy-950 font-normal' : 'font-normal text-navy-700'
                        }`}
                      >
                        <td className="p-4 pl-6 font-bold text-amber-600">
                          {canEdit ? (
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex items-center gap-1" title={`Posição na graduação de ${m.graduacao} (1 a ${rankInfo.total}). Digite a nova posição e tecle Enter`}>
                                <input
                                  type="number"
                                  min={1}
                                  max={rankInfo.total}
                                  defaultValue={rankInfo.pos}
                                  key={`pos_${m.id}_${rankInfo.pos}`}
                                  onBlur={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val > 0 && val !== rankInfo.pos) {
                                      const targetGlobalPos = rankInfo.offset + val;
                                      handleReorderPosition(m.id, targetGlobalPos);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = parseInt((e.target as HTMLInputElement).value, 10);
                                      if (!isNaN(val) && val > 0 && val !== rankInfo.pos) {
                                        const targetGlobalPos = rankInfo.offset + val;
                                        handleReorderPosition(m.id, targetGlobalPos);
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }
                                  }}
                                  className="w-14 bg-amber-50/90 border border-amber-300 text-navy-950 font-black text-xs text-center rounded-xl py-1 px-1 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                />
                                <span className="text-xs font-black text-amber-600">º</span>
                              </div>
                              <span className="text-[9px] font-bold text-navy-400 uppercase tracking-tight">
                                {m.ordem_antiguidade}º Geral
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-sm font-black text-amber-600">{rankInfo.pos}º</span>
                              <span className="text-[9px] font-bold text-navy-400 uppercase tracking-tight">
                                {m.ordem_antiguidade}º Geral
                              </span>
                            </div>
                          )}
                        </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] uppercase font-bold ${
                          isArgos ? 'bg-amber-400 text-navy-950' : 'bg-navy-100 text-navy-950'
                        }`}>
                          {m.graduacao}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                            isArgos ? 'bg-amber-500 text-navy-950' : 'bg-navy-100 text-navy-900'
                          }`}>
                            {m.nome ? m.nome.substring(0, 2) : 'PM'}
                          </div>
                          <div>
                            <span className="block uppercase font-bold text-navy-950 text-sm">
                              {m.nome}
                            </span>
                            {m.observacoes && (
                              <span className="block text-[10px] text-amber-700 font-bold uppercase tracking-tight">
                                {m.observacoes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-medium text-navy-900">
                        {m.matricula}
                      </td>
                      <td className="p-4 font-semibold text-navy-800">
                        {m.ultima_promocao}
                      </td>
                      <td className="p-4">
                        {isArgos ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500 text-navy-950 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                            <UserCheck className="w-3 h-3" />
                            <span>CADASTRADO ARGOS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-navy-100 text-navy-500 font-medium text-[9px] px-2.5 py-1 rounded-full uppercase">
                            <UserX className="w-3 h-3" />
                            <span>SEM CADASTRO</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-[11px] font-bold text-navy-600">
                        {m.quadro}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <>
                              {nextGrad && (
                                <button
                                  onClick={() => handleOpenPromoteModal(m)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1 shrink-0"
                                  title={`Promover para ${nextGrad}`}
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>Promover</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(m.id, m.nome)}
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                                title="Excluir da Lista"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add New Military */}
      {isModalOpen && editingMilitar && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-navy-100 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-navy-100">
              <div>
                <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Cadastro Oficial PMMS
                </span>
                <h3 className="text-xl font-black text-navy-950 uppercase tracking-tight mt-1">
                  Novo Cadastro no Banco Promocional
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-navy-400 hover:text-navy-950 rounded-xl hover:bg-navy-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={editingMilitar.nome || ''}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, nome: e.target.value.toUpperCase() })}
                    placeholder="EX: CARLOS ALBERTO SILVA"
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Matrícula Funcional *</label>
                  <input
                    type="text"
                    required
                    value={editingMilitar.matricula || ''}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, matricula: e.target.value })}
                    placeholder="EX: 102345"
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">CPF</label>
                  <input
                    type="text"
                    value={editingMilitar.cpf || ''}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Posto / Graduação Atual *</label>
                  <select
                    value={editingMilitar.graduacao || 'Soldado'}
                    onChange={(e) => {
                      const grad = e.target.value as GraduacaoPMMS;
                      setEditingMilitar({ 
                        ...editingMilitar, 
                        graduacao: grad,
                        intersticio_meses: DEFAULT_INTERSTICIOS[grad] || 36
                      });
                    }}
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
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
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Quadro *</label>
                  <select
                    value={editingMilitar.quadro || 'QPPM'}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, quadro: e.target.value as QuadroPMMS })}
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="QPPM">QPPM (Praças)</option>
                    <option value="QOPM">QOPM (Oficiais)</option>
                    <option value="QOPMA">QOPMA (Auxiliares)</option>
                    <option value="QAE">QAE (Especialistas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Unidade / Lotação</label>
                  <input
                    type="text"
                    value={editingMilitar.unidade || ''}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, unidade: e.target.value.toUpperCase() })}
                    placeholder="EX: 1º BPM - CAMPO GRANDE"
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Ordem de Antiguidade (Posição Inicial)</label>
                  <input
                    type="number"
                    value={editingMilitar.ordem_antiguidade || militares.length + 1}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, ordem_antiguidade: Number(e.target.value) })}
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Data de Inclusão / Praça *</label>
                  <input
                    type="date"
                    required
                    value={editingMilitar.data_praca || ''}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, data_praca: e.target.value })}
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Data da Última Promoção *</label>
                  <input
                    type="date"
                    required
                    value={editingMilitar.ultima_promocao || ''}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, ultima_promocao: e.target.value })}
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-navy-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 text-navy-500 font-black text-xs uppercase hover:bg-navy-50 rounded-2xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-navy-950 hover:bg-navy-900 text-amber-400 font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  {isSaving ? 'Gravando...' : 'Cadastrar Militar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Promote Military */}
      {promotingMilitar && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-navy-100 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-navy-100">
              <div>
                <span className="bg-emerald-100 text-emerald-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 w-fit">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Promoção Funcional PMMS
                </span>
                <h3 className="text-xl font-black text-navy-950 uppercase tracking-tight mt-1">
                  Promover Policial Militar
                </h3>
              </div>
              <button 
                onClick={() => setPromotingMilitar(null)}
                className="p-2 text-navy-400 hover:text-navy-950 rounded-xl hover:bg-navy-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-navy-50 rounded-2xl border border-navy-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-navy-950 uppercase">{promotingMilitar.nome}</span>
                <span className="text-[10px] font-bold text-navy-500 font-mono">MAT: {promotingMilitar.matricula}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-navy-700">
                <span className="bg-navy-200 text-navy-900 px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-black">
                  {promotingMilitar.graduacao}
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-black">
                  {PROXIMO_POSTO_GRADUACAO[promotingMilitar.graduacao]}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPromoteSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">
                  Data da Promoção *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    type="date"
                    required
                    value={promoteDate}
                    onChange={(e) => setPromoteDate(e.target.value)}
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-navy-400 font-medium block mt-1">
                  Esta data atualizará a 'Última Promoção' no assentamento funcional do policial.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">
                  Critério de Promoção *
                </label>
                <select
                  value={promoteCriterio}
                  onChange={(e) => setPromoteCriterio(e.target.value as CriterioPromocao)}
                  className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="ANTIGUIDADE">Antiguidade</option>
                  <option value="MERECIMENTO">Merecimento</option>
                  <option value="BRAVURA">Bravura</option>
                  <option value="POST_MORTEM">Post Mortem</option>
                  <option value="RESSARCIMENTO">Ressarcimento de Preterição</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">
                  Boletim Geral / Decreto (BCG)
                </label>
                <input
                  type="text"
                  value={promoteBcgNum}
                  onChange={(e) => setPromoteBcgNum(e.target.value)}
                  placeholder="Ex: BCG Nº 180/2026"
                  className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">
                  Observações / Anotação Funcional
                </label>
                <textarea
                  rows={2}
                  value={promoteObs}
                  onChange={(e) => setPromoteObs(e.target.value)}
                  placeholder="Anotações sobre a publicação no diário oficial..."
                  className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-4 border-t border-navy-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPromotingMilitar(null)}
                  className="px-5 py-3 text-navy-500 font-black text-xs uppercase hover:bg-navy-50 rounded-2xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPromoting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{isPromoting ? 'Promovendo...' : 'Efetivar Promoção'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
