import { 
  MilitarPromocao, 
  GraduacaoPMMS, 
  QuadroPMMS, 
  VagaQuadro, 
  BCGRecord, 
  ReservaReformaRecord, 
  ConfiguracaoPMMS, 
  SimulacaoResultado,
  HistoricoPromocaoMilitar
} from '../typesPromocoes';
import { MIGRATED_POLICE_DATA } from '../lib/migratedData';
import { db } from '../firebase';

export function isUserInArgos(
  matricula: string,
  nome: string,
  cpf?: string,
  argosList: Array<{ matricula: string; nome: string; cpf?: string }> = []
): boolean {
  if (!matricula && !nome && !cpf) return false;

  const cleanMat = matricula ? matricula.replace(/\D/g, '') : '';
  const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';
  const normName = nome ? nome.trim().toLowerCase() : '';

  // 1. Check against MIGRATED_POLICE_DATA
  const foundInMigrated = MIGRATED_POLICE_DATA.some(p => {
    const pMat = p.matricula ? p.matricula.replace(/\D/g, '') : '';
    const pCpf = p.cpf ? p.cpf.replace(/\D/g, '') : '';
    const pName = (p.nome_completo || p.nome || '').trim().toLowerCase();

    if (cleanMat && pMat && cleanMat === pMat) return true;
    if (cleanCpf && pCpf && cleanCpf === pCpf) return true;
    if (normName && pName && (normName.length > 3) && (normName.includes(pName) || pName.includes(normName))) return true;
    return false;
  });

  if (foundInMigrated) return true;

  // 2. Check against passed argosList (Firestore users)
  return argosList.some(u => {
    const uMat = u.matricula ? u.matricula.replace(/\D/g, '') : '';
    const uCpf = u.cpf ? u.cpf.replace(/\D/g, '') : '';
    const uName = (u.nome || '').trim().toLowerCase();

    if (cleanMat && uMat && cleanMat === uMat) return true;
    if (cleanCpf && uCpf && cleanCpf === uCpf) return true;
    if (normName && uName && (normName.length > 3) && (normName.includes(uName) || uName.includes(normName))) return true;
    return false;
  });
}
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

export const DEFAULT_INTERSTICIOS: Record<GraduacaoPMMS, number> = {
  'Soldado': 60,
  'Cabo': 48,
  '3º Sargento': 36,
  '2º Sargento': 36,
  '1º Sargento': 36,
  'Subtenente': 36,
  '2º Tenente': 36,
  '1º Tenente': 24,
  'Capitão': 36,
  'Major': 48,
  'Tenente-Coronel': 36,
  'Coronel': 0
};

export const PROXIMO_POSTO_GRADUACAO: Record<GraduacaoPMMS, GraduacaoPMMS | null> = {
  'Soldado': 'Cabo',
  'Cabo': '3º Sargento',
  '3º Sargento': '2º Sargento',
  '2º Sargento': '1º Sargento',
  '1º Sargento': 'Subtenente',
  'Subtenente': '2º Tenente',
  '2º Tenente': '1º Tenente',
  '1º Tenente': 'Capitão',
  'Capitão': 'Major',
  'Major': 'Tenente-Coronel',
  'Tenente-Coronel': 'Coronel',
  'Coronel': null
};

export const DEFAULT_PROXIMAS_DATAS = [
  { data: '2026-09-05', nome: '05 de Setembro - Aniversário da PMMS' },
  { data: '2026-12-25', nome: '25 de Dezembro - Promoção de Natal' },
  { data: '2027-04-21', nome: '21 de Abril - Dia de Tiradentes' }
];

// Initial mock military officers for PMMS (Empty by default)
export const SEED_MILITARES: MilitarPromocao[] = [];

export const SEED_VAGAS: VagaQuadro[] = [
  { id: 'v1', quadro: 'QPPM', graduacao: 'Cabo', vagas_previstas: 50, vagas_ocupadas: 0, vagas_abertas: 50 },
  { id: 'v2', quadro: 'QPPM', graduacao: '3º Sargento', vagas_previstas: 35, vagas_ocupadas: 0, vagas_abertas: 35 },
  { id: 'v3', quadro: 'QPPM', graduacao: '2º Sargento', vagas_previstas: 25, vagas_ocupadas: 0, vagas_abertas: 25 },
  { id: 'v4', quadro: 'QPPM', graduacao: '1º Sargento', vagas_previstas: 15, vagas_ocupadas: 0, vagas_abertas: 15 },
  { id: 'v5', quadro: 'QPPM', graduacao: 'Subtenente', vagas_previstas: 10, vagas_ocupadas: 0, vagas_abertas: 10 },
  { id: 'v6', quadro: 'QOPM', graduacao: '1º Tenente', vagas_previstas: 12, vagas_ocupadas: 0, vagas_abertas: 12 },
  { id: 'v7', quadro: 'QOPM', graduacao: 'Capitão', vagas_previstas: 10, vagas_ocupadas: 0, vagas_abertas: 10 },
  { id: 'v8', quadro: 'QOPM', graduacao: 'Major', vagas_previstas: 8, vagas_ocupadas: 0, vagas_abertas: 8 },
  { id: 'v9', quadro: 'QOPM', graduacao: 'Tenente-Coronel', vagas_previstas: 6, vagas_ocupadas: 0, vagas_abertas: 6 }
];

export const SEED_BCGS: BCGRecord[] = [];

export const SEED_RESERVAS: ReservaReformaRecord[] = [];

export function calculateMonthsDifference(fromDateStr: string, toDateInput?: string | Date): number {
  if (!fromDateStr) return 0;
  const from = new Date(fromDateStr);
  const to = toDateInput ? new Date(toDateInput) : new Date();
  
  const yearsDiff = to.getFullYear() - from.getFullYear();
  const monthsDiff = to.getMonth() - from.getMonth();
  
  let totalMonths = yearsDiff * 12 + monthsDiff;
  if (to.getDate() < from.getDate()) {
    totalMonths -= 1;
  }
  return Math.max(0, totalMonths);
}

export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase();
}

/**
 * Core Rules Engine: Evaluates military promotion status
 */
export function evaluateMilitarPromotion(
  militar: MilitarPromocao,
  vagas: VagaQuadro[],
  allMilitares: MilitarPromocao[],
  targetDateStr: string = DEFAULT_PROXIMAS_DATAS[0].data,
  customVagasDelta: Record<string, number> = {}
): SimulacaoResultado {
  const proximaGrad = PROXIMO_POSTO_GRADUACAO[militar.graduacao];
  const reqMeses = militar.intersticio_meses || DEFAULT_INTERSTICIOS[militar.graduacao] || 36;
  const mesesCumpridos = calculateMonthsDifference(militar.ultima_promocao, targetDateStr);
  
  const percentual = reqMeses > 0 ? Math.min(100, Math.round((mesesCumpridos / reqMeses) * 100)) : 100;
  const intersticioCumprido = reqMeses === 0 || mesesCumpridos >= reqMeses;

  if (!proximaGrad) {
    return {
      militar,
      posicao_fila: 1,
      intersticio_cumprido: true,
      meses_cumpridos: mesesCumpridos,
      percentual_intersticio: 100,
      elegivel_vaga: false,
      previsao_promocao_data: '-',
      motivo_inelegibilidade: 'Último posto da carreira alcançado (Coronel).'
    };
  }

  const vagaObj = vagas.find(v => v.quadro === militar.quadro && v.graduacao === proximaGrad);
  const baseVagas = vagaObj ? vagaObj.vagas_abertas : 0;
  const deltaKey = `${militar.quadro}_${proximaGrad}`;
  const totalVagasDisponiveis = Math.max(0, baseVagas + (customVagasDelta[deltaKey] || 0));

  const peersInSameRank = allMilitares.filter(m => 
    m.quadro === militar.quadro && 
    m.graduacao === militar.graduacao && 
    m.situacao_funcional === 'ATIVO'
  );

  peersInSameRank.sort((a, b) => {
    if (a.ordem_antiguidade !== b.ordem_antiguidade) return a.ordem_antiguidade - b.ordem_antiguidade;
    return new Date(a.ultima_promocao).getTime() - new Date(b.ultima_promocao).getTime();
  });

  const eligiblePeers = peersInSameRank.filter(m => {
    const mMeses = calculateMonthsDifference(m.ultima_promocao, targetDateStr);
    const mReq = m.intersticio_meses || DEFAULT_INTERSTICIOS[m.graduacao] || 36;
    return mReq === 0 || mMeses >= mReq;
  });

  const myPositionInEligible = eligiblePeers.findIndex(m => m.id === militar.id);
  const myGeneralPosition = peersInSameRank.findIndex(m => m.id === militar.id) + 1;

  let elegivelVaga = false;
  let motivoInelegibilidade = '';

  if (militar.situacao_funcional !== 'ATIVO') {
    motivoInelegibilidade = `Militar em situação ${militar.situacao_funcional} (inelegível para promoção).`;
  } else if (!intersticioCumprido) {
    const mesesFaltantes = reqMeses - mesesCumpridos;
    motivoInelegibilidade = `Faltam ${mesesFaltantes} meses para cumprir o interstício mínimo de ${reqMeses} meses.`;
  } else if (totalVagasDisponiveis === 0) {
    motivoInelegibilidade = `Sem vagas abertas no Quadro ${militar.quadro} para ${proximaGrad}.`;
  } else if (myPositionInEligible === -1) {
    motivoInelegibilidade = 'Interstício não verificado para a data alvo selecionada.';
  } else if (myPositionInEligible >= totalVagasDisponiveis) {
    const excedente = (myPositionInEligible + 1) - totalVagasDisponiveis;
    motivoInelegibilidade = `Posição na fila (${myPositionInEligible + 1}º) excede o número de vagas disponíveis (${totalVagasDisponiveis}). Faltam ${excedente} vagas.`;
  } else {
    elegivelVaga = true;
  }

  return {
    militar,
    posicao_fila: myGeneralPosition,
    intersticio_cumprido: intersticioCumprido,
    meses_cumpridos: mesesCumpridos,
    percentual_intersticio: percentual,
    elegivel_vaga: elegivelVaga,
    previsao_promocao_data: elegivelVaga ? targetDateStr : (intersticioCumprido ? 'Próxima Abertura de Vagas' : 'Aguardando Interstício'),
    motivo_inelegibilidade: motivoInelegibilidade,
    proxima_graduacao: proximaGrad
  };
}

export async function clearFictitiousData(): Promise<void> {
  localStorage.removeItem('pmms_militares');
  localStorage.removeItem('pmms_bcgs');
  localStorage.removeItem('pmms_reservas_reformas');
  try {
    const snapshot = await getDocs(collection(db, 'pmms_militares'));
    for (const docSnap of snapshot.docs) {
      if (docSnap.id.startsWith('pmms_00')) {
        await deleteDoc(doc(db, 'pmms_militares', docSnap.id));
      }
    }
  } catch (e) {}
}

export async function getMilitaresPromocao(): Promise<MilitarPromocao[]> {
  try {
    const q = query(collection(db, 'pmms_militares'), orderBy('ordem_antiguidade', 'asc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MilitarPromocao));
      // Filter out old seed records if present
      const filtered = docs.filter(m => !m.id.startsWith('pmms_00') || m.cadastrado_argos);
      return filtered;
    }
  } catch (e) {
    console.warn('Usando dados locais para militares PMMS:', e);
  }

  const local = localStorage.getItem('pmms_militares');
  if (local) {
    try {
      const parsed: MilitarPromocao[] = JSON.parse(local);
      const filtered = parsed.filter(m => !m.id.startsWith('pmms_00') || m.cadastrado_argos);
      return filtered;
    } catch(err) {}
  }

  return [];
}

export async function saveMilitarPromocao(militar: Partial<MilitarPromocao>): Promise<MilitarPromocao> {
  const id = militar.id || `pmms_${Date.now()}`;
  const now = new Date().toISOString();
  const reqMeses = militar.graduacao ? DEFAULT_INTERSTICIOS[militar.graduacao] || 36 : 36;
  
  const fullObj: MilitarPromocao = {
    id,
    matricula: militar.matricula || '000000',
    nome: (militar.nome || '').toUpperCase(),
    nome_guerra: (militar.nome_guerra || militar.nome || '').toUpperCase(),
    graduacao: militar.graduacao || 'Soldado',
    quadro: militar.quadro || 'QPPM',
    unidade: militar.unidade || 'PMMS',
    data_praca: militar.data_praca || now.substring(0, 10),
    ultima_promocao: militar.ultima_promocao || now.substring(0, 10),
    ordem_antiguidade: militar.ordem_antiguidade || 99,
    intersticio_meses: militar.intersticio_meses || reqMeses,
    situacao_funcional: militar.situacao_funcional || 'ATIVO',
    cpf: militar.cpf || '',
    telefone: militar.telefone || '',
    email: militar.email || '',
    historico: militar.historico || [],
    created_at: militar.created_at || now,
    updated_at: now
  };

  try {
    await setDoc(doc(db, 'pmms_militares', id), fullObj, { merge: true });
  } catch (e) {
    console.warn('Gravando no storage local para militar PMMS:', e);
  }

  const currentList = await getMilitaresPromocao();
  const idx = currentList.findIndex(m => m.id === id);
  if (idx >= 0) currentList[idx] = fullObj;
  else currentList.push(fullObj);
  localStorage.setItem('pmms_militares', JSON.stringify(currentList));

  return fullObj;
}

export async function deleteMilitarPromocao(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'pmms_militares', id));
  } catch (e) {}

  const currentList = await getMilitaresPromocao();
  const updated = currentList.filter(m => m.id !== id);
  localStorage.setItem('pmms_militares', JSON.stringify(updated));
}

export async function getVagasQuadros(): Promise<VagaQuadro[]> {
  try {
    const snapshot = await getDocs(collection(db, 'pmms_vagas'));
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VagaQuadro));
    }
  } catch (e) {}

  const local = localStorage.getItem('pmms_vagas');
  if (local) {
    try { return JSON.parse(local); } catch(e) {}
  }

  localStorage.setItem('pmms_vagas', JSON.stringify(SEED_VAGAS));
  return SEED_VAGAS;
}

export async function saveVagaQuadro(vaga: Partial<VagaQuadro>): Promise<VagaQuadro> {
  const id = vaga.id || `vaga_${Date.now()}`;
  const prev = vaga.vagas_previstas || 0;
  const ocup = vaga.vagas_ocupadas || 0;
  const abertas = Math.max(0, prev - ocup);

  const fullObj: VagaQuadro = {
    id,
    quadro: vaga.quadro || 'QPPM',
    graduacao: vaga.graduacao || 'Soldado',
    vagas_previstas: prev,
    vagas_ocupadas: ocup,
    vagas_abertas: abertas
  };

  try {
    await setDoc(doc(db, 'pmms_vagas', id), fullObj, { merge: true });
  } catch (e) {}

  const current = await getVagasQuadros();
  const idx = current.findIndex(v => v.id === id);
  if (idx >= 0) current[idx] = fullObj;
  else current.push(fullObj);
  localStorage.setItem('pmms_vagas', JSON.stringify(current));

  return fullObj;
}

export async function getBCGRecords(): Promise<BCGRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, 'pmms_bcgs'));
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BCGRecord));
    }
  } catch (e) {}

  const local = localStorage.getItem('pmms_bcgs');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }

  localStorage.setItem('pmms_bcgs', JSON.stringify(SEED_BCGS));
  return SEED_BCGS;
}

export async function saveBCGRecord(bcg: Partial<BCGRecord>): Promise<BCGRecord> {
  const id = bcg.id || `bcg_${Date.now()}`;
  const now = new Date().toISOString();
  const fullObj: BCGRecord = {
    id,
    numero: bcg.numero || `BCG ${Math.floor(Math.random() * 200)}/2026`,
    ano: bcg.ano || 2026,
    data_publicacao: bcg.data_publicacao || now.substring(0, 10),
    arquivo_nome: bcg.arquivo_nome || 'documento.pdf',
    arquivo_url: bcg.arquivo_url || '',
    status: bcg.status || 'PROCESSADO',
    promocoes_extraidas: bcg.promocoes_extraidas || 0,
    reservas_extraidas: bcg.reservas_extraidas || 0,
    transferencias_extraidas: bcg.transferencias_extraidas || 0,
    processado_por: bcg.processado_por || 'Operador ARGOS',
    created_at: bcg.created_at || now
  };

  try {
    await setDoc(doc(db, 'pmms_bcgs', id), fullObj, { merge: true });
  } catch (e) {}

  const current = await getBCGRecords();
  const idx = current.findIndex(b => b.id === id);
  if (idx >= 0) current[idx] = fullObj;
  else current.unshift(fullObj);
  localStorage.setItem('pmms_bcgs', JSON.stringify(current));

  return fullObj;
}

export async function getReservasReformas(): Promise<ReservaReformaRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, 'pmms_reservas_reformas'));
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReservaReformaRecord));
    }
  } catch (e) {}

  const local = localStorage.getItem('pmms_reservas_reformas');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }

  localStorage.setItem('pmms_reservas_reformas', JSON.stringify(SEED_RESERVAS));
  return SEED_RESERVAS;
}

export async function executePromocaoMilitar(
  militarId: string, 
  novaGraduacao: GraduacaoPMMS, 
  criterio: any = 'ANTIGUIDADE',
  bcgNum: string = 'BCG OFICIAL'
): Promise<MilitarPromocao | null> {
  const militares = await getMilitaresPromocao();
  const target = militares.find(m => m.id === militarId);
  if (!target) return null;

  const nowStr = new Date().toISOString().substring(0, 10);
  const gradAnt = target.graduacao;

  const novoHistorico: HistoricoPromocaoMilitar = {
    id: `hist_${Date.now()}`,
    militar_id: target.id,
    graduacao_de: gradAnt,
    graduacao_para: novaGraduacao,
    data_evento: nowStr,
    criterio: criterio,
    bcg_numero: bcgNum,
    bcg_data: nowStr,
    observacoes: `Promoção por ${criterio} registrada via Painel ARGOS PMMS.`
  };

  const updatedHist = [novoHistorico, ...(target.historico || [])];

  const updatedMilitar: MilitarPromocao = {
    ...target,
    graduacao: novaGraduacao,
    ultima_promocao: nowStr,
    intersticio_meses: DEFAULT_INTERSTICIOS[novaGraduacao] || 36,
    historico: updatedHist
  };

  return await saveMilitarPromocao(updatedMilitar);
}
