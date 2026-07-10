import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { ChevronLeft, Users, FileSignature, CalendarDays, Award } from 'lucide-react';

interface GestaoPessoalPageProps {
  user: User | null;
}

export const GestaoPessoalPage: React.FC<GestaoPessoalPageProps> = ({ user }) => {
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-red-50 p-6 rounded-full mb-6">
          <i className="fas fa-lock text-red-500 text-6xl"></i>
        </div>
        <h2 className="text-3xl font-black text-navy-950 mb-4">Acesso Restrito</h2>
        <p className="text-navy-400 uppercase font-black text-xs tracking-widest">
          É necessário efetuar login para acessar este terminal.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2.5 bg-navy-50 hover:bg-navy-100 text-navy-700 hover:text-navy-950 rounded-xl transition-all"
          title="Voltar para o Início"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-teal-100 text-teal-800 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              Recursos Humanos
            </span>
          </div>
          <h2 className="text-navy-950 text-3xl font-black uppercase tracking-tighter">
            Gestão Pessoal
          </h2>
          <p className="text-navy-500 text-xs font-semibold uppercase tracking-wider mt-0.5">
            Selecione uma área de atuação administrativa
          </p>
        </div>
      </div>

      {/* Four Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card EFETIVO */}
        <div 
          onClick={() => navigate('/efetivo')}
          className="group bg-white border border-navy-100 hover:border-navy-300 hover:shadow-2xl rounded-3xl p-6 cursor-pointer transition-all flex flex-col justify-between min-h-[260px]"
        >
          <div>
            <div className="w-12 h-12 bg-[#CB9E1B] rounded-2xl flex items-center justify-center mb-5 text-white group-hover:scale-110 transition-all shadow-lg shadow-[#CB9E1B]/15">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-navy-950 uppercase tracking-tight group-hover:text-navy-700 transition-colors">
              RELAÇÃO DE EFETIVO
            </h3>
            <p className="text-[11px] text-navy-400 font-semibold mt-2.5 leading-relaxed">
              Consulta técnica completa e controle operacional do efetivo policial. Visualize fichas individuais, estatísticas funcionais de serviço ativo em tempo real e faça a gestão administrativa de cadastros, senhas e patentes.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-navy-600 uppercase tracking-widest mt-6 group-hover:translate-x-2 transition-transform">
            <span>Acessar Efetivo</span>
            <i className="fas fa-arrow-right"></i>
          </div>
        </div>

        {/* Card REQUERIMENTOS */}
        <div 
          onClick={() => navigate('/requerimentos')}
          className="group bg-white border border-navy-100 hover:border-[#CB9E1B] hover:shadow-2xl rounded-3xl p-6 cursor-pointer transition-all flex flex-col justify-between min-h-[260px]"
        >
          <div>
            <div className="w-12 h-12 bg-[#CB9E1B] rounded-2xl flex items-center justify-center mb-5 text-white group-hover:scale-110 transition-all shadow-lg shadow-yellow-600/10">
              <FileSignature className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-navy-950 uppercase tracking-tight group-hover:text-navy-700 transition-colors">
              REQUERIMENTOS
            </h3>
            <p className="text-[11px] text-navy-400 font-semibold mt-2.5 leading-relaxed">
              Sistema de formulação oficial de requerimentos administrativos. Preencha dados adicionais, emita sua Identidade Funcional ou Certidão de Tempo de Contribuição oficial do ARGOS com assinatura dos responsáveis e download em PDF.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-[#CB9E1B] uppercase tracking-widest mt-6 group-hover:translate-x-2 transition-transform">
            <span>Acessar Requerimentos</span>
            <i className="fas fa-arrow-right"></i>
          </div>
        </div>

        {/* Card ESCALA REMUNERADA */}
        <div 
          onClick={() => navigate('/escala-remunerada')}
          className="group bg-white border border-navy-100 hover:border-[#CB9E1B] hover:shadow-2xl rounded-3xl p-6 cursor-pointer transition-all flex flex-col justify-between min-h-[260px]"
        >
          <div>
            <div className="w-12 h-12 bg-[#CB9E1B] rounded-2xl flex items-center justify-center mb-5 text-white group-hover:scale-110 transition-all shadow-lg shadow-yellow-600/10">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-navy-950 uppercase tracking-tight group-hover:text-navy-700 transition-colors">
              ESCALA REMUNERADA
            </h3>
            <p className="text-[11px] text-navy-400 font-semibold mt-2.5 leading-relaxed">
              Gestão justa de policiais voluntários para a escala de serviço extraordinário remunerado. Organize prioridades de inscrição de forma automatizada, controle locais de posto de serviço e gerencie escalados ativos.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-[#CB9E1B] uppercase tracking-widest mt-6 group-hover:translate-x-2 transition-transform">
            <span>Acessar Escala</span>
            <i className="fas fa-arrow-right"></i>
          </div>
        </div>

        {/* Card FORMATURA E SOLENIDADES */}
        <div 
          onClick={() => navigate('/formatura')}
          className="group bg-white border border-[#CB9E1B] hover:border-[#CB9E1B] hover:shadow-2xl rounded-3xl p-6 cursor-pointer transition-all flex flex-col justify-between min-h-[260px]"
        >
          <div>
            <div className="w-12 h-12 bg-navy-950 rounded-2xl flex items-center justify-center mb-5 text-amber-400 group-hover:scale-110 transition-all shadow-lg shadow-navy-950/15">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-navy-950 uppercase tracking-tight group-hover:text-navy-700 transition-colors">
              FORMATURA GERAL
            </h3>
            <p className="text-[11px] text-navy-400 font-semibold mt-2.5 leading-relaxed">
              Lista e chamada para a Formatura e Solenidades da escala extra nº 0101. Controle presenças em tempo real, visualize estatísticas de quórum atualizadas e organize a fila de apresentação com reordenação dinâmica automática.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-[#CB9E1B] uppercase tracking-widest mt-6 group-hover:translate-x-2 transition-transform">
            <span>Anotar Presenças</span>
            <i className="fas fa-arrow-right"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestaoPessoalPage;
