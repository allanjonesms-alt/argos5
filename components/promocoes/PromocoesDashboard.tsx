import React, { useState } from 'react';
import { 
  MilitarPromocao, 
  VagaQuadro, 
  BCGRecord, 
  ReservaReformaRecord, 
  PromocaoUserLevel 
} from '../../typesPromocoes';
import { 
  DEFAULT_PROXIMAS_DATAS, 
  evaluateMilitarPromotion, 
  calculateMonthsDifference,
  DEFAULT_INTERSTICIOS 
} from '../../services/promocoesService';
import { 
  Users, 
  Award, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Calendar, 
  FileText, 
  UserX, 
  Search, 
  ChevronRight, 
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

interface PromocoesDashboardProps {
  militares: MilitarPromocao[];
  vagas: VagaQuadro[];
  bcgs: BCGRecord[];
  reservas: ReservaReformaRecord[];
  userLevel: PromocaoUserLevel;
  onSelectMilitarToDetail: (militar: MilitarPromocao) => void;
  onNavigateTab: (tab: string) => void;
}

export const PromocoesDashboard: React.FC<PromocoesDashboardProps> = ({
  militares,
  vagas,
  bcgs,
  reservas,
  userLevel,
  onSelectMilitarToDetail,
  onNavigateTab
}) => {
  const [selectedForecastMilitarId, setSelectedForecastMilitarId] = useState<string>(militares[0]?.id || '');
  const [targetPromocaoDate, setTargetPromocaoDate] = useState<string>(DEFAULT_PROXIMAS_DATAS[0].data);

  // General KPIs
  const totalMilitares = militares.length;
  const ativos = militares.filter(m => m.situacao_funcional === 'ATIVO').length;
  const totalVagasAbertas = vagas.reduce((acc, v) => acc + v.vagas_abertas, 0);

  // Evaluate eligibility for all militaries against selected promotional date
  const evaluationResults = militares.map(m => evaluateMilitarPromotion(m, vagas, militares, targetPromocaoDate));
  
  const elegiveisComVagaCount = evaluationResults.filter(r => r.elegivel_vaga).length;
  const emIntersticioCount = evaluationResults.filter(r => !r.intersticio_cumprido && r.militar.situacao_funcional === 'ATIVO').length;

  // Selected military forecast detail
  const selectedMilitar = militares.find(m => m.id === selectedForecastMilitarId) || militares[0];
  const selectedEvaluation = selectedMilitar ? evaluateMilitarPromotion(selectedMilitar, vagas, militares, targetPromocaoDate) : null;

  // Chart Data Preparation: Distribution by Post/Rank
  const graduacaoCounts: Record<string, number> = {};
  militares.forEach(m => {
    graduacaoCounts[m.graduacao] = (graduacaoCounts[m.graduacao] || 0) + 1;
  });

  const chartDataGraduacoes = Object.keys(graduacaoCounts).map(grad => ({
    name: grad,
    quantidade: graduacaoCounts[grad]
  }));

  const COLORS = ['#0284C7', '#0F172A', '#EAB308', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & PMMS Promotional Countdown */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border border-amber-500/30 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-navy-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              PMMS - Painel de Inteligência Promocional
            </span>
            <span className="bg-navy-800 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
              Atualizado
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight">
            Progressão Funcional & Almanaque PMMS
          </h1>
          <p className="text-xs text-navy-200 font-medium max-w-2xl">
            Acompanhamento em tempo real das vagas, interstícios e previsões de promoções para oficiais e praças da Polícia Militar de Mato Grosso do Sul.
          </p>
        </div>

        {/* Countdown Box */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 md:p-5 flex items-center gap-4 shrink-0">
          <div className="p-3 bg-amber-500 text-navy-950 rounded-xl font-black">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
              Próxima Data Promocional
            </span>
            <span className="text-sm font-black text-white uppercase block">
              {DEFAULT_PROXIMAS_DATAS[0].nome}
            </span>
            <span className="text-xs font-bold text-navy-200">
              {DEFAULT_PROXIMAS_DATAS[0].data}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Military */}
        <div className="bg-white border border-navy-100 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-navy-400 tracking-wider">Total Efetivo</span>
            <div className="p-2.5 bg-navy-50 text-navy-900 rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-navy-950 block">{totalMilitares}</span>
            <span className="text-[10px] font-bold text-emerald-600 block">{ativos} Militares Ativos</span>
          </div>
        </div>

        {/* KPI 2: Promotable with Vacancy */}
        <div className="bg-white border border-navy-100 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-navy-400 tracking-wider">Elegíveis c/ Vaga</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-600 block">{elegiveisComVagaCount}</span>
            <span className="text-[10px] font-bold text-navy-400 block">Prontos para Promoção</span>
          </div>
        </div>

        {/* KPI 3: Open Vacancies */}
        <div className="bg-white border border-navy-100 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-navy-400 tracking-wider">Vagas Abertas</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600 block">{totalVagasAbertas}</span>
            <span className="text-[10px] font-bold text-navy-400 block">Em Todos os Quadros</span>
          </div>
        </div>

        {/* KPI 4: In Interstício */}
        <div className="bg-white border border-navy-100 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-navy-400 tracking-wider">Em Interstício</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-navy-950 block">{emIntersticioCount}</span>
            <span className="text-[10px] font-bold text-navy-400 block">Cumprindo Tempo</span>
          </div>
        </div>

        {/* KPI 5: BCGs Processed */}
        <div className="bg-white border border-navy-100 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-navy-400 tracking-wider">Boletins BCG</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-navy-950 block">{bcgs.length}</span>
            <span className="text-[10px] font-bold text-navy-400 block">Boletins Registrados</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Individual Forecast Calculator & Quick Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Individual Forecast Tool */}
          <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm uppercase text-navy-950 tracking-tight">
                  Calculadora Individual de Previsão Funcional
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('simulador')}
                className="text-xs font-black uppercase text-amber-600 hover:text-amber-500 flex items-center gap-1"
              >
                <span>Simulador Avançado</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-navy-400 mb-1">Selecione o Policial Militar</label>
                <select
                  value={selectedForecastMilitarId}
                  onChange={(e) => setSelectedForecastMilitarId(e.target.value)}
                  className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {militares.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.graduacao} {m.nome_guerra} ({m.quadro}) - Mat. {m.matricula}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-navy-400 mb-1">Data Alvo para Simulação</label>
                <select
                  value={targetPromocaoDate}
                  onChange={(e) => setTargetPromocaoDate(e.target.value)}
                  className="w-full bg-navy-50 border border-navy-200 text-navy-950 text-xs font-bold rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {DEFAULT_PROXIMAS_DATAS.map((d: { data: string; nome: string }, idx: number) => (
                    <option key={idx} value={d.data}>{d.nome} ({d.data})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Forecast Outcome Card */}
            {selectedMilitar && selectedEvaluation && (
              <div className="bg-navy-950 text-white rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-navy-800">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">Policial Militar</span>
                    <span className="text-base font-black uppercase text-white block">{selectedMilitar.nome}</span>
                    <span className="text-xs text-navy-300 font-bold block">{selectedMilitar.graduacao} • {selectedMilitar.quadro} • {selectedMilitar.unidade}</span>
                  </div>
                  <button
                    onClick={() => onSelectMilitarToDetail(selectedMilitar)}
                    className="self-start sm:self-auto bg-amber-500 hover:bg-amber-400 text-navy-950 text-xs font-black uppercase px-3.5 py-2 rounded-xl transition-all"
                  >
                    Ver Ficha
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-navy-900/80 p-3.5 rounded-xl border border-navy-800">
                    <span className="text-[9px] font-black uppercase text-navy-400 block">Fila de Antiguidade</span>
                    <span className="text-lg font-black text-amber-400 block">#{selectedEvaluation.posicao_fila}º da Fila</span>
                  </div>

                  <div className="bg-navy-900/80 p-3.5 rounded-xl border border-navy-800">
                    <span className="text-[9px] font-black uppercase text-navy-400 block">Progresso do Interstício</span>
                    <span className="text-lg font-black text-white block">{selectedEvaluation.percentual_intersticio}%</span>
                    <span className="text-[9px] text-navy-300 font-semibold">{selectedEvaluation.meses_cumpridos} de {selectedMilitar.intersticio_meses || 36} meses</span>
                  </div>

                  <div className="bg-navy-900/80 p-3.5 rounded-xl border border-navy-800">
                    <span className="text-[9px] font-black uppercase text-navy-400 block">Status Elegibilidade</span>
                    <span className={`text-sm font-black block uppercase mt-1 ${selectedEvaluation.elegivel_vaga ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedEvaluation.elegivel_vaga ? 'Elegível c/ Vaga' : 'Aguardando Requisitos'}
                    </span>
                  </div>
                </div>

                <div className="bg-navy-900 p-3.5 rounded-xl border border-navy-800 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-amber-400 uppercase text-[10px] block">Parecer da Regra Promocional</span>
                    <p className="text-navy-200 text-xs font-medium">
                      {selectedEvaluation.elegivel_vaga 
                        ? `Apto para promoção a ${selectedEvaluation.proxima_graduacao} na data ${targetPromocaoDate}.`
                        : selectedEvaluation.motivo_inelegibilidade}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rank Distribution Chart */}
          <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <h3 className="font-black text-sm uppercase text-navy-950 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                <span>Distribuição do Efetivo por Posto e Graduação</span>
              </h3>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataGraduacoes} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#0F172A' }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '12px', border: 'none', fontSize: '12px' }} 
                  />
                  <Bar dataKey="quantidade" radius={[8, 8, 0, 0]}>
                    {chartDataGraduacoes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Vacancies Table & Next Promotional Queue */}
        <div className="space-y-6">
          {/* Vacancy Quota Card */}
          <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <h3 className="font-black text-sm uppercase text-navy-950 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Quadro de Vagas Abertas PMMS</span>
              </h3>
              <button
                onClick={() => onNavigateTab('simulador')}
                className="text-[10px] font-black uppercase text-amber-600 hover:underline"
              >
                Ajustar Vagas
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {vagas.map((v) => (
                <div key={v.id} className="p-3 bg-navy-50/70 border border-navy-100 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-navy-950 uppercase block">{v.graduacao}</span>
                    <span className="text-[9px] font-bold text-navy-400 block">{v.quadro} • Previstas: {v.vagas_previstas}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-black px-2.5 py-1 rounded-xl block ${v.vagas_abertas > 0 ? 'bg-amber-100 text-amber-900' : 'bg-navy-200 text-navy-600'}`}>
                      {v.vagas_abertas} vagas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seniority Queue Preview */}
          <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <h3 className="font-black text-sm uppercase text-navy-950 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Topo da Fila de Antiguidade</span>
              </h3>
              <button
                onClick={() => onNavigateTab('efetivo')}
                className="text-[10px] font-black uppercase text-amber-600 hover:underline"
              >
                Ver Fila Completa
              </button>
            </div>

            <div className="space-y-3">
              {militares.slice(0, 4).map((m) => (
                <div 
                  key={m.id} 
                  onClick={() => onSelectMilitarToDetail(m)}
                  className="p-3 bg-white hover:bg-navy-50/80 border border-navy-100 rounded-2xl transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-navy-950 text-amber-400 rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                      #{m.ordem_antiguidade}
                    </span>
                    <div>
                      <span className="font-black text-navy-950 text-xs block group-hover:text-amber-600 transition-colors uppercase">
                        {m.nome_guerra}
                      </span>
                      <span className="text-[10px] text-navy-400 font-bold block">{m.graduacao} • {m.quadro}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-navy-400 group-hover:text-amber-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
