
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Siren } from 'lucide-react';
import { User, UserRole, Shift, Unit, SystemVersion } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { checkIsAdmin } from '../lib/utils';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import TacticalLogo from '../components/TacticalLogo';
import TacticalAlert from '../components/TacticalAlert';

interface DashboardProps {
  user: User | null;
}

const MenuButton: React.FC<{
  to?: string;
  onClick?: () => void;
  icon: string;
  label: string;
  colorClass: string;
  description: string;
  disabled?: boolean;
}> = ({ to, onClick, icon, label, colorClass, description, disabled }) => {
  const content = (
    <div className={`w-16 h-16 ${disabled ? 'bg-navy-700 grayscale' : colorClass} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-6 shadow-lg`}>
      <i className={`fas ${icon} text-3xl text-white`}></i>
    </div>
  );

  const cardClasses = `group relative overflow-hidden bg-white border ${disabled ? 'border-navy-100 opacity-60 cursor-not-allowed' : 'border-navy-100 hover:scale-[1.02] hover:shadow-2xl hover:border-navy-300 cursor-pointer'} rounded-2xl p-6 transition-all flex flex-col items-center text-center shadow-sm`;

  if (disabled) {
    return (
      <div className={cardClasses} onClick={onClick}>
        {content}
        <h3 className="text-xl font-black text-navy-400 mb-2 uppercase tracking-tight">{label}</h3>
        <p className="text-navy-500 text-sm leading-relaxed">{description}</p>
        <div className="absolute top-4 right-4 text-[8px] font-black text-red-500 uppercase tracking-widest border border-red-500/20 px-2 py-0.5 rounded bg-red-500/5">Bloqueado</div>
      </div>
    );
  }

  if (to) {
    return (
      <Link to={to} className={cardClasses}>
        {content}
        <h3 className="text-xl font-black text-navy-950 mb-2 uppercase tracking-tight">{label}</h3>
        <p className="text-navy-500 text-sm leading-relaxed">{description}</p>
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <i className="fas fa-chevron-right text-navy-400"></i>
        </div>
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={cardClasses}>
      {content}
      <h3 className="text-xl font-black text-navy-950 mb-2 uppercase tracking-tight">{label}</h3>
      <p className="text-navy-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeShifts, setActiveShifts] = useState<Shift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [unitFeatures, setUnitFeatures] = useState<string[] | null>(null);
  const [latestVersion, setLatestVersion] = useState<string>('V1.0');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'system_versions'), orderBy('date', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const versionData = snapshot.docs[0].data() as SystemVersion;
        setLatestVersion(versionData.version);
      }
    }, (err) => {
      console.error('Erro ao buscar versão:', err);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.unidade) {
      setUnitFeatures(null);
      return;
    }

    const q = query(collection(db, 'units'), where('nome', '==', user.unidade));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const unitData = snapshot.docs[0].data() as Unit;
        setUnitFeatures(unitData.enabled_features || null);
      } else {
        setUnitFeatures(null);
      }
    });

    return () => unsubscribe();
  }, [user?.unidade]);

  useEffect(() => {
    const checkShifts = async () => {
      try {
        const shiftsRef = collection(db, 'vtr_services');
        const isAdmin = checkIsAdmin(user);
        
        let q = query(
          shiftsRef,
          where('status', '==', 'ATIVO')
        );

        if (!isAdmin) {
          q = query(
            shiftsRef,
            where('status', '==', 'ATIVO'),
            where('unidade', '==', user?.unidade || '')
          );
        }
        
        const querySnapshot = await getDocs(q);
        
        let shifts = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          horario_inicio: doc.data().horario_inicio?.toDate?.()?.toISOString() || doc.data().horario_inicio,
          horario_fim: doc.data().horario_fim?.toDate?.()?.toISOString() || doc.data().horario_fim
        } as Shift));

        shifts.sort((a, b) => new Date(b.horario_inicio || 0).getTime() - new Date(a.horario_inicio || 0).getTime());
        
        setActiveShifts(shifts);
      } catch (err) {
        console.error('Erro ao verificar serviços:', err);
        handleFirestoreError(err, OperationType.LIST, 'vtr_services');
      } finally {
        setIsLoadingShifts(false);
      }
    };
    checkShifts();
    const interval = setInterval(checkShifts, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const isUserInAnyShift = (userName: string | undefined, shifts: Shift[]) => {
    if (!userName || shifts.length === 0) return false;
    const name = userName.toUpperCase();
    return shifts.some(shift => 
      shift.comandante?.toUpperCase() === name ||
      shift.motorista?.toUpperCase() === name ||
      shift.patrulheiro_1?.toUpperCase() === name ||
      shift.patrulheiro_2?.toUpperCase() === name
    );
  };

  const isAdmin = checkIsAdmin(user);
  const isRestrictedRole = user?.role === UserRole.CHEFE_DE_EQUIPE || user?.role === UserRole.PATRULHEIRO;
  const inAnyShift = isUserInAnyShift(user?.nome, activeShifts);
  const canRegisterApproach = isAdmin || inAnyShift;

  const isFeatureEnabled = (featureId: string) => {
    if (isAdmin) return true; // Admins see everything
    if (!unitFeatures) return true; // Default to all enabled if not set
    return unitFeatures.includes(featureId);
  };

  const handleApproachClick = () => {
    if (isAdmin) {
      navigate('/nova-abordagem');
      return;
    }

    if (activeShifts.length === 0) {
      setAlertMessage('Não é possível registrar abordagem sem um SERVIÇO ATIVO. Inicie o serviço no cabeçalho.');
      return;
    }
    
    if (!inAnyShift) {
      setAlertMessage('Acesso Negado: Você não consta como integrante da guarnição de nenhum serviço ativo.');
      return;
    }

    navigate('/nova-abordagem');
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      {alertMessage && (
        <TacticalAlert 
          message={alertMessage} 
          onClose={() => setAlertMessage(null)} 
        />
      )}

      <div className="mb-10 animate-fade-in flex items-center justify-between">
          <div>
            <h2 className="text-navy-950 text-3xl font-black uppercase tracking-tighter">Terminal de Operações</h2>
            <p className="text-navy-500 mt-1">Bem-vindo, <span className="text-navy-900 font-bold">{user?.nome}</span></p>
          </div>
          <div className="hidden sm:block">
             <div className="bg-navy-50 px-4 py-2 rounded-xl border border-navy-100 text-[10px] font-black uppercase text-navy-400 tracking-widest">
                Perfil: {user?.role}
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        <MenuButton
          to="/assistente-ro"
          icon="fa-robot"
          label="Assistente de R.O."
          colorClass="bg-indigo-600 animate-pulse-subtle"
          description="Aprimorar narrativas, tipificar crimes e tirar dúvidas jurídicas de plantão com IA."
        />
        <MenuButton
          to="/parte-diaria?view=actions"
          icon="fa-bolt"
          label="Ações Rápidas"
          colorClass="bg-amber-500"
          description="Lançamento instantâneo de empenhos diários, buscas pessoais e veículos abordados."
        />
        <MenuButton
          to="/parte-diaria"
          icon="fa-file-invoice"
          label="Parte Diária"
          colorClass="bg-red-600"
          description="Abertura e preenchimento da Parte Diária da Unidade."
        />
        <MenuButton
          to="/abordagem"
          icon="fa-fingerprint"
          label="Abordagem"
          colorClass="bg-navy-600"
          description="Módulo unificado de registro, histórico e inteligência de abordagens."
        />
        {user && (
          <MenuButton
            to="/gestao-pessoal"
            icon="fa-users-gear"
            label="Gestão Pessoal"
            colorClass="bg-teal-600"
            description={
              (user.role === UserRole.ADMIN || user.role === UserRole.MASTER)
                ? "Gerenciamento de operadores, redefinição de senhas, escalas e requerimentos."
                : "Consulta de efetivo, ficha individual e envio de requerimentos operacionais."
            }
          />
        )}

        {user?.role === UserRole.MASTER && (
          <MenuButton
            to="/modelos-ro"
            icon="fa-clipboard-list"
            label="Modelos de RO"
            colorClass="bg-pink-600"
            description="Calibrar modelos estruturados, regexes e sugestões do Assistente de RO."
          />
        )}
        {!isRestrictedRole && isAdmin && isFeatureEnabled('ocorrencias') && (
          <MenuButton
            to="/ocorrencias"
            icon="fa-file-invoice"
            label="Ocorrências"
            colorClass="bg-red-700"
            description="SS e RO Realizados."
          />
        )}

        {!isRestrictedRole && isFeatureEnabled('manual') && (
          <MenuButton
            to="/manual"
            icon="fa-book"
            label="Manual do Usuário"
            colorClass="bg-navy-800"
            description="Guia completo de utilização do sistema para operadores."
          />
        )}

        {!isRestrictedRole && (user?.role === UserRole.ADMIN || user?.role === UserRole.MASTER || user?.role === UserRole.SUPERVISOR_DE_OPERACOES) && (
          <div className="sm:col-span-2">
            <MenuButton
              to="/configuracoes"
              icon="fa-gears"
              label="Configurações do Sistema"
              colorClass="bg-red-900"
              description="Gerenciamento de usuários, logs e importação de dados."
            />
          </div>
        )}
      </div>

      {isLoadingShifts ? (
        <div className="mt-8 p-6 bg-navy-50 border border-navy-100 rounded-2xl flex items-center justify-center gap-4">
          <Siren className="w-5 h-5 text-navy-400 animate-pulse" />
          <span className="text-[10px] font-black text-navy-400 uppercase tracking-widest">CARREGANDO DADOS...</span>
        </div>
      ) : (
        <>
          {activeShifts.length === 0 && !isAdmin && (
            <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
              <div className="bg-red-600 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse">
                <i className="fas fa-exclamation-triangle text-white text-xl"></i>
              </div>
              <div>
                <h4 className="text-red-600 font-black uppercase text-xs tracking-widest">Aviso Operacional</h4>
                <p className="text-navy-500 text-[10px] mt-1 uppercase font-bold leading-relaxed">
                  Sistema em modo de consulta apenas. Para realizar novos registros, você deve <span className="text-navy-900">INICIAR O SERVIÇO</span> no topo da página.
                </p>
              </div>
            </div>
          )}

          {activeShifts.length > 0 && !canRegisterApproach && (
            <div className="mt-8 p-6 bg-navy-50 border border-navy-100 rounded-2xl flex items-center gap-4">
              <div className="bg-navy-900 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fas fa-lock text-white text-xl"></i>
              </div>
              <div>
                <h4 className="text-navy-950 font-black uppercase text-xs tracking-widest">Acesso Limitado</h4>
                <p className="text-navy-500 text-[10px] mt-1 uppercase font-bold leading-relaxed">
                  Serviços em andamento. Como você não faz parte de nenhuma destas guarnições, seu acesso para novos registros está bloqueado por diretriz operacional.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-8 p-6 bg-navy-50 rounded-2xl border border-navy-100 border-dashed">
        <div className="flex items-center space-x-4">
          <TacticalLogo size="md" className="opacity-80" />
          <div>
            <h4 className="text-navy-900 font-bold uppercase text-xs tracking-widest">ARGOS {latestVersion}</h4>
            <p className="text-navy-400 text-[10px] mt-1 uppercase font-black tracking-[0.2em]">
              CREATED BY SGT JONES • MONITORAMENTO OPERACIONAL ATIVO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
