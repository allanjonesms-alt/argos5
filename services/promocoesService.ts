import { 
  MilitarPromocao, 
  GraduacaoPMMS, 
  QuadroPMMS, 
  VagaQuadro, 
  BCGRecord, 
  ReservaReformaRecord, 
  ConfiguracaoPMMS, 
  SimulacaoResultado,
  HistoricoPromocaoMilitar,
  CriterioPromocao
} from '../typesPromocoes';
import { MIGRATED_POLICE_DATA } from '../lib/migratedData';
import { SUBTENENTES_PMMS_SEED } from '../lib/subtenentesSeedData';
import { SARGENTOS_PMMS_SEED } from '../lib/sargentosSeedData';
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

export const GRADUACAO_HIERARCHY: Record<GraduacaoPMMS, number> = {
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

export function sortByGraduacaoAndAntiguidade(a: MilitarPromocao, b: MilitarPromocao): number {
  const rankA = GRADUACAO_HIERARCHY[a.graduacao] ?? 99;
  const rankB = GRADUACAO_HIERARCHY[b.graduacao] ?? 99;
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return a.ordem_antiguidade - b.ordem_antiguidade;
}

export const DEFAULT_PROXIMAS_DATAS = [
  { data: '2026-09-05', nome: '05 de Setembro - Aniversário da PMMS' },
  { data: '2026-12-25', nome: '25 de Dezembro - Promoção de Natal' },
  { data: '2027-04-21', nome: '21 de Abril - Dia de Tiradentes' }
];

// Initial military officers for PMMS (Contains the 340 Subtenentes and 100 1º Sargentos QPPM in order of seniority)
export const SEED_MILITARES: MilitarPromocao[] = [...SUBTENENTES_PMMS_SEED, ...SARGENTOS_PMMS_SEED];

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

export function isFictitiousMilitar(m: Partial<MilitarPromocao>): boolean {
  if (!m) return true;
  const rawMat = (m.matricula || '').trim();
  const mat = rawMat.replace(/\D/g, '');
  const nome = (m.nome || '').toUpperCase().trim();
  const id = (m.id || '').toLowerCase();
  const obs = (m.observacoes || '').toUpperCase();

  // Any test/fictitious keywords in name, obs, or ID
  if (nome.includes('TESTE') || nome.includes('FICTIC') || nome.includes('FICTÍCIO') || nome.includes('MOCK') || nome.includes('DEMO')) return true;
  if (obs.includes('FICTIC') || obs.includes('FICTÍCIO') || obs.includes('TESTE') || obs.includes('MOCK')) return true;
  if (id.startsWith('pmms_00') || id.includes('fict') || id.includes('test') || id.includes('fake') || id.includes('mock')) return true;

  // Placeholder / fake matriculas
  if (rawMat === '000000' || rawMat === '00000' || rawMat === '123456' || rawMat === '00000000') return true;
  if (mat === '000000' || mat === '00000' || mat === '123456' || mat === '00000000') return true;

  return false;
}

export async function clearFictitiousData(): Promise<void> {
  const local = localStorage.getItem('pmms_militares');
  if (local) {
    try {
      const parsed: MilitarPromocao[] = JSON.parse(local);
      const cleaned = parsed.filter(m => !isFictitiousMilitar(m));
      localStorage.setItem('pmms_militares', JSON.stringify(cleaned));
    } catch (e) {
      localStorage.removeItem('pmms_militares');
    }
  }

  try {
    const snapshot = await getDocs(collection(db, 'pmms_militares'));
    for (const docSnap of snapshot.docs) {
      const item = { id: docSnap.id, ...docSnap.data() } as Partial<MilitarPromocao>;
      if (isFictitiousMilitar(item)) {
        await deleteDoc(doc(db, 'pmms_militares', docSnap.id));
      }
    }
  } catch (e) {
    console.warn('Erro ao expurgar militares fictícios do Firestore:', e);
  }
}

export function deduplicateMilitares(list: MilitarPromocao[]): MilitarPromocao[] {
  const map = new Map<string, MilitarPromocao>();

  for (const item of list) {
    if (isFictitiousMilitar(item)) continue;

    const cleanMat = item.matricula ? item.matricula.replace(/\D/g, '') : '';
    const cleanCpf = item.cpf ? item.cpf.replace(/\D/g, '') : '';
    const normName = item.nome ? item.nome.trim().toUpperCase() : '';

    let key = '';
    if (cleanMat && cleanMat !== '000000') key = `mat_${cleanMat}`;
    else if (cleanCpf) key = `cpf_${cleanCpf}`;
    else if (normName && normName.length > 3) key = `nome_${normName}`;
    else key = `id_${item.id}`;

    if (!map.has(key)) {
      map.set(key, { ...item });
    } else {
      const existing = map.get(key)!;
      map.set(key, {
        ...existing,
        ...item,
        id: existing.id, // Preserve first document ID
        cadastrado_argos: existing.cadastrado_argos || item.cadastrado_argos,
        cpf: existing.cpf || item.cpf,
        email: existing.email || item.email,
        telefone: existing.telefone || item.telefone,
        matricula: existing.matricula || item.matricula,
        nome: existing.nome || item.nome,
        nome_guerra: existing.nome_guerra || item.nome_guerra
      });
    }
  }

  return Array.from(map.values());
}

export async function getMilitaresPromocao(): Promise<MilitarPromocao[]> {
  let dbList: MilitarPromocao[] = [];
  try {
    const q = query(collection(db, 'pmms_militares'), orderBy('ordem_antiguidade', 'asc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      for (const docSnap of snapshot.docs) {
        const item = { id: docSnap.id, ...docSnap.data() } as MilitarPromocao;
        if (isFictitiousMilitar(item)) {
          deleteDoc(doc(db, 'pmms_militares', docSnap.id)).catch(() => {});
        } else {
          dbList.push(item);
        }
      }
    }
  } catch (e) {
    console.warn('Usando dados locais para militares PMMS:', e);
  }

  let localList: MilitarPromocao[] = [];
  const local = localStorage.getItem('pmms_militares');
  if (local) {
    try {
      const parsed: MilitarPromocao[] = JSON.parse(local);
      localList = parsed.filter(m => !isFictitiousMilitar(m));
    } catch(err) {}
  }

  // Combine seed Subtenentes and 1º Sargentos with any overrides from DB or LocalStorage
  const combined = [...SUBTENENTES_PMMS_SEED, ...SARGENTOS_PMMS_SEED, ...dbList, ...localList].filter(m => !isFictitiousMilitar(m));
  const merged = deduplicateMilitares(combined);
  merged.sort(sortByGraduacaoAndAntiguidade);

  localStorage.setItem('pmms_militares', JSON.stringify(merged));

  return merged;
}

export async function saveMilitarPromocao(militar: Partial<MilitarPromocao>): Promise<MilitarPromocao> {
  if (isFictitiousMilitar(militar)) {
    throw new Error('Não é permitido cadastrar ou salvar militares fictícios ou de teste.');
  }

  const currentList = await getMilitaresPromocao();
  
  const cleanMat = militar.matricula ? militar.matricula.replace(/\D/g, '') : '';
  const cleanCpf = militar.cpf ? militar.cpf.replace(/\D/g, '') : '';
  const normName = militar.nome ? militar.nome.trim().toUpperCase() : '';

  // Find existing by ID, clean matricula, clean CPF, or exact normalized name
  const existing = currentList.find(m => {
    if (militar.id && m.id === militar.id) return true;
    const mMat = m.matricula ? m.matricula.replace(/\D/g, '') : '';
    const mCpf = m.cpf ? m.cpf.replace(/\D/g, '') : '';
    const mName = m.nome ? m.nome.trim().toUpperCase() : '';

    if (cleanMat && mMat && cleanMat === mMat && cleanMat !== '000000') return true;
    if (cleanCpf && mCpf && cleanCpf === mCpf) return true;
    if (normName && mName && normName.length > 3 && normName === mName) return true;
    return false;
  });

  const id = militar.id || (existing ? existing.id : `pmms_${Date.now()}`);
  const now = new Date().toISOString();
  const reqMeses = militar.graduacao ? DEFAULT_INTERSTICIOS[militar.graduacao] || 36 : 36;
  
  const fullObj: MilitarPromocao = {
    id,
    matricula: militar.matricula || existing?.matricula || '000000',
    nome: (militar.nome || existing?.nome || '').toUpperCase(),
    nome_guerra: (militar.nome_guerra || militar.nome || existing?.nome_guerra || existing?.nome || '').toUpperCase(),
    graduacao: militar.graduacao || existing?.graduacao || 'Soldado',
    quadro: militar.quadro || existing?.quadro || 'QPPM',
    unidade: militar.unidade || existing?.unidade || 'PMMS',
    data_praca: militar.data_praca || existing?.data_praca || now.substring(0, 10),
    ultima_promocao: militar.ultima_promocao || existing?.ultima_promocao || now.substring(0, 10),
    ordem_antiguidade: militar.ordem_antiguidade || existing?.ordem_antiguidade || 99,
    intersticio_meses: militar.intersticio_meses || existing?.intersticio_meses || reqMeses,
    situacao_funcional: militar.situacao_funcional || existing?.situacao_funcional || 'ATIVO',
    cpf: militar.cpf || existing?.cpf || '',
    telefone: militar.telefone || existing?.telefone || '',
    email: militar.email || existing?.email || '',
    cadastrado_argos: militar.cadastrado_argos ?? existing?.cadastrado_argos ?? false,
    historico: militar.historico || existing?.historico || [],
    created_at: existing?.created_at || militar.created_at || now,
    updated_at: now
  };

  try {
    await setDoc(doc(db, 'pmms_militares', id), fullObj, { merge: true });
  } catch (e) {
    console.warn('Gravando no storage local para militar PMMS:', e);
  }

  const idx = currentList.findIndex(m => m.id === id);
  if (idx >= 0) currentList[idx] = fullObj;
  else currentList.push(fullObj);

  const deduplicated = deduplicateMilitares(currentList);
  localStorage.setItem('pmms_militares', JSON.stringify(deduplicated));

  return fullObj;
}

export async function deleteMilitarPromocao(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'pmms_militares', id));
  } catch (e) {}

  const currentList = await getMilitaresPromocao();
  const updated = currentList.filter(m => m.id !== id);
  
  // Sort remaining by graduation rank and antiguidade
  updated.sort(sortByGraduacaoAndAntiguidade);

  // Re-sequence 1..N automatically so numbers adjust seamlessly
  for (let i = 0; i < updated.length; i++) {
    const newOrdem = i + 1;
    if (updated[i].ordem_antiguidade !== newOrdem) {
      updated[i].ordem_antiguidade = newOrdem;
      try {
        await updateDoc(doc(db, 'pmms_militares', updated[i].id), { ordem_antiguidade: newOrdem });
      } catch (e) {}
    }
  }

  localStorage.setItem('pmms_militares', JSON.stringify(updated));
}

export async function reorderMilitarAntiguidade(id: string, newPosition: number): Promise<void> {
  const currentList = await getMilitaresPromocao();
  currentList.sort(sortByGraduacaoAndAntiguidade);

  const targetIdx = currentList.findIndex(m => m.id === id);
  if (targetIdx === -1) return;

  const [movedMilitar] = currentList.splice(targetIdx, 1);
  const clampedPosition = Math.max(1, Math.min(currentList.length + 1, Math.floor(newPosition)));
  currentList.splice(clampedPosition - 1, 0, movedMilitar);

  // Re-sequence all 1..N
  for (let i = 0; i < currentList.length; i++) {
    const newOrdem = i + 1;
    currentList[i].ordem_antiguidade = newOrdem;
    try {
      await updateDoc(doc(db, 'pmms_militares', currentList[i].id), { ordem_antiguidade: newOrdem });
    } catch (e) {}
  }

  localStorage.setItem('pmms_militares', JSON.stringify(currentList));
}

export async function promoteMilitarToNextRank(
  militarId: string,
  dataPromocao?: string,
  criterio: CriterioPromocao = 'ANTIGUIDADE',
  bcgNum: string = 'BCG OFICIAL PMMS',
  observacoes?: string
): Promise<MilitarPromocao | null> {
  const currentList = await getMilitaresPromocao();
  const target = currentList.find(m => m.id === militarId);
  if (!target) return null;

  const nextGrad = PROXIMO_POSTO_GRADUACAO[target.graduacao];
  if (!nextGrad) return null;

  return await executePromocaoMilitar(militarId, nextGrad, criterio, bcgNum, dataPromocao, observacoes);
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
  criterio: CriterioPromocao = 'ANTIGUIDADE',
  bcgNum: string = 'BCG OFICIAL',
  dataPromocao?: string,
  observacoes?: string
): Promise<MilitarPromocao | null> {
  const militares = await getMilitaresPromocao();
  const target = militares.find(m => m.id === militarId);
  if (!target) return null;

  const nowStr = new Date().toISOString().substring(0, 10);
  const dataEvento = (dataPromocao && dataPromocao.trim() !== '') ? dataPromocao : nowStr;
  const gradAnt = target.graduacao;

  const novoHistorico: HistoricoPromocaoMilitar = {
    id: `hist_${Date.now()}`,
    militar_id: target.id,
    graduacao_de: gradAnt,
    graduacao_para: novaGraduacao,
    data_evento: dataEvento,
    criterio: criterio,
    bcg_numero: bcgNum,
    bcg_data: dataEvento,
    observacoes: observacoes || `Promoção por ${criterio} registrada via Painel ARGOS PMMS.`
  };

  const updatedHist = [novoHistorico, ...(target.historico || [])];

  const updatedMilitar: MilitarPromocao = {
    ...target,
    graduacao: novaGraduacao,
    ultima_promocao: dataEvento,
    intersticio_meses: DEFAULT_INTERSTICIOS[novaGraduacao] || 36,
    historico: updatedHist
  };

  return await saveMilitarPromocao(updatedMilitar);
}
