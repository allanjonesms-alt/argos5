import React, { useState } from 'react';
import { 
  MilitarPromocao, 
  GraduacaoPMMS, 
  QuadroPMMS, 
  SituacaoFuncionalPMMS, 
  PromocaoUserLevel 
} from '../../typesPromocoes';
import { DEFAULT_INTERSTICIOS, clearFictitiousData, isUserInArgos } from '../../services/promocoesService';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Filter, 
  User, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronDown,
  ArrowUpDown,
  History,
  UserCheck,
  UserX,
  RotateCcw
} from 'lucide-react';

interface MilitaresCadastrosProps {
  militares: MilitarPromocao[];
  userLevel: PromocaoUserLevel;
  argosUsersList?: Array<{ matricula: string; nome: string; cpf?: string }>;
  onSaveMilitar: (militar: Partial<MilitarPromocao>) => Promise<void>;
  onDeleteMilitar: (id: string) => Promise<void>;
  onSelectMilitarToDetail: (militar: MilitarPromocao) => void;
  onRefreshData?: () => void;
}

export const MilitaresCadastros: React.FC<MilitaresCadastrosProps> = ({
  militares,
  userLevel,
  argosUsersList = [],
  onSaveMilitar,
  onDeleteMilitar,
  onSelectMilitarToDetail,
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuadro, setSelectedQuadro] = useState<string>('TODOS');
  const [selectedGraduacao, setSelectedGraduacao] = useState<string>('TODOS');
  const [sortBy, setSortBy] = useState<'antiguidade' | 'nome' | 'promocao'>('antiguidade');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilitar, setEditingMilitar] = useState<Partial<MilitarPromocao> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleClearFictitious = async () => {
    if (confirm('Deseja apagar todos os dados fictícios do sistema e manter apenas cadastros reais?')) {
      await clearFictitiousData();
      if (onRefreshData) onRefreshData();
    }
  };

  // Filtered & Sorted militaries
  const filteredMilitares = militares.filter(m => {
    const matchesSearch = 
      m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nome_guerra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.matricula.includes(searchTerm) ||
      (m.cpf && m.cpf.includes(searchTerm));

    const matchesQuadro = selectedQuadro === 'TODOS' || m.quadro === selectedQuadro;
    const matchesGraduacao = selectedGraduacao === 'TODOS' || m.graduacao === selectedGraduacao;

    return matchesSearch && matchesQuadro && matchesGraduacao;
  }).sort((a, b) => {
    if (sortBy === 'antiguidade') return a.ordem_antiguidade - b.ordem_antiguidade;
    if (sortBy === 'nome') return a.nome_guerra.localeCompare(b.nome_guerra);
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

  const handleOpenEditModal = (m: MilitarPromocao) => {
    setEditingMilitar({ ...m });
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

  const canEdit = userLevel === 'ADMIN' || userLevel === 'EDITOR';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search & Action Header */}
      <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Pesquisar militar por nome, nome de guerra, matrícula ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-navy-50/80 border border-navy-100 text-navy-950 text-xs font-bold rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quadro Filter */}
          <select
            value={selectedQuadro}
            onChange={(e) => setSelectedQuadro(e.target.value)}
            className="bg-navy-50 border border-navy-200 text-navy-900 text-xs font-bold rounded-2xl px-3.5 py-3 focus:outline-none"
          >
            <option value="TODOS">Todos os Quadros</option>
            <option value="QPPM">QPPM (Praças)</option>
            <option value="QOPM">QOPM (Oficiais)</option>
            <option value="QOPMA">QOPMA (Auxiliares)</option>
            <option value="QAE">QAE (Especialistas)</option>
          </select>

          {/* Graduação Filter */}
          <select
            value={selectedGraduacao}
            onChange={(e) => setSelectedGraduacao(e.target.value)}
            className="bg-navy-50 border border-navy-200 text-navy-900 text-xs font-bold rounded-2xl px-3.5 py-3 focus:outline-none"
          >
            <option value="TODOS">Todas as Graduações</option>
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

          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearFictitious}
                className="bg-navy-50 hover:bg-navy-100 text-navy-700 font-bold text-xs uppercase px-4 py-3.5 rounded-2xl transition-all flex items-center gap-1.5"
                title="Apagar dados fictícios do banco"
              >
                <RotateCcw className="w-4 h-4 text-navy-500" />
                <span>Limpar Fictícios</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="bg-amber-500 hover:bg-amber-400 text-navy-950 font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Militar</span>
              </button>
            </div>
          )}
        </div>
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
                  <td colSpan={8} className="p-12 text-center text-navy-400 uppercase font-bold text-xs">
                    Nenhum militar registrado no Almanaque Geral. Importe o BCG para alimentar o Quadro de Acesso.
                  </td>
                </tr>
              ) : (
                filteredMilitares.map((m) => {
                  const reqMeses = m.intersticio_meses || DEFAULT_INTERSTICIOS[m.graduacao] || 36;
                  const isArgos = m.cadastrado_argos || isUserInArgos(m.matricula, m.nome, m.cpf, argosUsersList);

                  return (
                    <tr 
                      key={m.id} 
                      className={`transition-colors hover:bg-amber-50/40 ${
                        isArgos ? 'bg-amber-50/20 font-black text-navy-950' : 'font-normal text-navy-700'
                      }`}
                    >
                      <td className="p-4 pl-6 font-black text-amber-600">
                        {m.ordem_antiguidade}º
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] uppercase ${
                          isArgos ? 'bg-amber-400 text-navy-950 font-black' : 'bg-navy-100 text-navy-950 font-bold'
                        }`}>
                          {m.graduacao}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                            isArgos ? 'bg-amber-500 text-navy-950 font-black' : 'bg-navy-100 text-navy-900 font-bold'
                          }`}>
                            {m.nome_guerra ? m.nome_guerra.substring(0, 2) : 'PM'}
                          </div>
                          <div>
                            <span className={`block uppercase ${isArgos ? 'font-black text-navy-950 text-sm' : 'font-semibold text-navy-900'}`}>
                              {m.nome}
                            </span>
                            <span className="text-[10px] text-navy-400 block uppercase font-medium">
                              Guerra: {m.nome_guerra}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className={`p-4 font-mono ${isArgos ? 'font-black text-navy-950' : 'font-bold text-navy-700'}`}>
                        {m.matricula}
                      </td>
                      <td className={`p-4 ${isArgos ? 'font-black text-navy-950' : 'font-semibold text-navy-800'}`}>
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
                      <td className="p-4 pr-6 text-right space-x-1">
                        <button
                          onClick={() => onSelectMilitarToDetail(m)}
                          className="p-2 bg-navy-50 hover:bg-navy-100 text-navy-700 rounded-xl transition-all"
                          title="Ficha e Linha do Tempo"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(m)}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all"
                              title="Editar Cadastro"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id, m.nome_guerra)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Military */}
      {isModalOpen && editingMilitar && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-navy-100 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-navy-100">
              <div>
                <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Cadastro Oficial PMMS
                </span>
                <h3 className="text-xl font-black text-navy-950 uppercase tracking-tight mt-1">
                  {editingMilitar.id ? 'Editar Dados do Policial Militar' : 'Novo Cadastro no Banco Promocional'}
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
                <div>
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
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Nome de Guerra *</label>
                  <input
                    type="text"
                    required
                    value={editingMilitar.nome_guerra || ''}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, nome_guerra: e.target.value.toUpperCase() })}
                    placeholder="EX: SILVA"
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
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Ordem de Antiguidade (Fila)</label>
                  <input
                    type="number"
                    value={editingMilitar.ordem_antiguidade || 1}
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

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Interstício Necessário (Meses)</label>
                  <input
                    type="number"
                    value={editingMilitar.intersticio_meses || 36}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, intersticio_meses: Number(e.target.value) })}
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-navy-500 mb-1">Situação Funcional</label>
                  <select
                    value={editingMilitar.situacao_funcional || 'ATIVO'}
                    onChange={(e) => setEditingMilitar({ ...editingMilitar, situacao_funcional: e.target.value as SituacaoFuncionalPMMS })}
                    className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="AGREGADO">AGREGADO</option>
                    <option value="LICENÇA">LICENÇA</option>
                    <option value="RESERVA">RESERVA</option>
                    <option value="REFORMADO">REFORMADO</option>
                  </select>
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
                  {isSaving ? 'Gravando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
