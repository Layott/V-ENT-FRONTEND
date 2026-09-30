#!/usr/bin/env node
// French and Portuguese written without their accents.
//
// The French settings page showed "Verified" in English (inbox 314), and the
// French it should have shown was "Verifiee". The block around it read
// "equipe", "Deplacer", "Etat", "Telecharger le releve", "evenement",
// "proprietaire", "etre": a whole admin block typed without accents. A
// reader sees a site that does not quite speak their language.
//
// This reads the French and Portuguese tables for words that are always
// written with an accent and fails on the bare form. The list is words, not
// guesses: each entry exists only in its accented spelling.
//
//   node scripts/check-accents.mjs
//   node scripts/check-accents.mjs --self-test

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

export const BARE = {
  fr: {
    // Found 29 September 2026 on the sign-out page ("Se deconnecter").
    deconnecter: 'déconnecter', deconnecte: 'déconnecté', deconnectez: 'déconnectez',
    definissez: 'définissez', definir: 'définir',
    equipe: 'équipe', equipes: 'équipes', evenement: 'événement', evenements: 'événements',
    etat: 'état', etre: 'être', ete: 'été', deja: 'déjà', telecharger: 'télécharger',
    telecharge: 'téléchargé', releve: 'relevé', releves: 'relevés', deplacer: 'déplacer',
    deplace: 'déplace', proprietaire: 'propriétaire', details: 'détails', detient: 'détient',
    gere: 'gère', gerer: 'gérer', role: 'rôle', roles: 'rôles', dirigee: 'dirigée',
    enregistre: 'enregistré', verifie: 'vérifié', verifiee: 'vérifiée', cree: 'créé',
    creee: 'créée', supprime: 'supprimé', modifie: 'modifié', numero: 'numéro',
    prenom: 'prénom', periode: 'période', parametres: 'paramètres', securite: 'sécurité',
    activite: 'activité', echoue: 'échoué', reussi: 'réussi', premiere: 'première',
    derniere: 'dernière', tres: 'très', apres: 'après', deconnexion: 'déconnexion',
    telephone: 'téléphone', resultat: 'résultat', resultats: 'résultats', reglement: 'règlement',
    elements: 'éléments', element: 'élément', genere: 'généré', general: 'général',
    donnees: 'données', acces: 'accès', ecran: 'écran', etape: 'étape', etapes: 'étapes',
    creer: 'créer', generer: 'générer', reessayez: 'réessayez', reessayer: 'réessayer',
    verifiez: 'vérifiez', verifier: 'vérifier', definie: 'définie', defini: 'défini',
    regle: 'règle', regles: 'règles', meme: 'même', desactive: 'désactivé',
    tete: 'tête', controle: 'contrôle', reponse: 'réponse', reponses: 'réponses',
    selectionnez: 'sélectionnez', precedent: 'précédent', prete: 'prête', pret: 'prêt',
    fenetre: 'fenêtre', depot: 'dépôt', recu: 'reçu', recus: 'reçus', francais: 'français',
    // Found 30 September 2026 on the feedback and pricing pages (inbox 380):
    // a block of French typed without accents that this list did not know.
    gene: 'gêné', preferons: 'préférons', plutot: 'plutôt', presence: 'présence',
    memes: 'mêmes', necessaire: 'nécessaire', heberger: 'héberger', echelle: 'échelle',
    identite: 'identité', verification: 'vérification', emblemes: 'emblèmes', ecrire: 'écrire',
    ca: 'ça', signale: 'signalé', trouve: 'trouvé', laisse: 'laissé', passe: 'passé',
    // The rest of that sweep: every word here also appears WITH its accent
    // elsewhere in the French, and is never correct without it.
    adhesion: 'adhésion', adhesions: 'adhésions', apparait: 'apparaît', arriere: 'arrière',
    aussitot: 'aussitôt', banniere: 'bannière', bareme: 'barème', bientot: 'bientôt',
    boite: 'boîte', capacite: 'capacité', categorie: 'catégorie', categories: 'catégories',
    cle: 'clé', cles: 'clés', commercant: 'commerçant', communaute: 'communauté',
    communautes: 'communautés', competitions: 'compétitions', cout: 'coût', coute: 'coûte',
    createur: 'créateur', creation: 'création', credit: 'crédit', creez: 'créez',
    critere: 'critère', debattre: 'débattre', debut: 'début', decalage: 'décalage',
    decident: 'décident', decidez: 'décidez', decision: 'décision', decisions: 'décisions',
    declarez: 'déclarez', decroissant: 'décroissant', defi: 'défi',
    definitivement: 'définitivement', dela: 'delà', demarrer: 'démarrer',
    departage: 'départage', departages: 'départages', depasser: 'dépasser',
    deplacez: 'déplacez', dernieres: 'dernières', derriere: 'derrière',
    desactiver: 'désactiver', desormais: 'désormais', detail: 'détail',
    detenteurs: 'détenteurs', detiennent: 'détiennent', deuxieme: 'deuxième',
    deverrouiller: 'déverrouiller', disparait: 'disparaît', dixieme: 'dixième',
    echange: 'échange', ecrit: 'écrit', ecrivez: 'écrivez', egalite: 'égalité',
    elimination: 'élimination', elimine: 'éliminé', emis: 'émis', empeche: 'empêche',
    empecher: 'empêcher', entieres: 'entières', epuise: 'épuisé', etait: 'était', etes: 'êtes',
    generale: 'générale', generez: 'générez', gerez: 'gérez', grace: 'grâce', hote: 'hôte',
    huitieme: 'huitième', immediatement: 'immédiatement', interet: 'intérêt',
    irreversible: 'irréversible', itineraire: 'itinéraire', media: 'média', mene: 'mené',
    methode: 'méthode', modere: 'modéré', necessite: 'nécessite', notres: 'nôtres',
    palmares: 'palmarès', penalite: 'pénalité', piece: 'pièce', pieces: 'pièces',
    possede: 'possédé', precedente: 'précédente', preleve: 'prélevé', preparer: 'préparer',
    present: 'présent', presents: 'présents', presentent: 'présentent', presentez: 'présentez',
    prevenez: 'prévenez', prevenu: 'prévenu', previendrons: 'préviendrons', prevu: 'prévu',
    prive: 'privé', prives: 'privés', probleme: 'problème', protege: 'protégé',
    quantite: 'quantité', recentes: 'récentes', reception: 'réception', recoit: 'reçoit',
    recoivent: 'reçoivent', recupere: 'récupéré', recuperer: 'récupérer',
    reduction: 'réduction', reel: 'réel', reglages: 'réglages', reglent: 'règlent',
    reglez: 'réglez', reinitialisation: 'réinitialisation', repeter: 'répéter',
    repond: 'répond', repondre: 'répondre', repondu: 'répondu', reseau: 'réseau',
    reseaux: 'réseaux', reservation: 'réservation', retabli: 'rétabli', retablir: 'rétablir',
    seance: 'séance', separe: 'séparé', separes: 'séparés', sequestre: 'séquestre',
    serie: 'série', series: 'séries', siege: 'siège', sieges: 'sièges', situes: 'situés',
    telechargement: 'téléchargement', tetes: 'têtes', theme: 'thème', themes: 'thèmes',
    unite: 'unité', zero: 'zéro', envoye: 'envoyé', envoyes: 'envoyés', abonne: 'abonné',
    abonnes: 'abonnés',
    paye: 'payé', payes: 'payés', termine: 'terminé', rembourse: 'remboursé', rembourses: 'remboursés', verse: 'versé', verses: 'versés', annule: 'annulé', ferme: 'fermé', valide: 'validé', publie: 'publié', programme: 'programmé', confirme: 'confirmé', accepte: 'accepté', ajoute: 'ajouté',
    // Found 30 September 2026 (inbox 364) in the vendor-slot block: typed
    // without accents AND without apostrophes, which no word here knew.
    derives: 'dérivés', redige: 'rédigé', dechets: 'déchets', jai: 'j’ai',
    lemplacement: 'l’emplacement', lorganisateur: 'l’organisateur', lacheteur: 'l’acheteur',
    sagit: 's’agit', quil: 'qu’il', quils: 'qu’ils', quelle: null,
    mois: null, a: null,
  },
  pt: {
    espacos: 'espaços',
    nao: 'não', sao: 'são', entao: 'então', informacao: 'informação', configuracoes: 'configurações',
    opcoes: 'opções', acao: 'ação', acoes: 'ações', transacao: 'transação', transacoes: 'transações',
    publico: 'público', numero: 'número', proximo: 'próximo', ultimo: 'último', tambem: 'também',
    ja: 'já', ate: 'até', voce: 'você', historico: 'histórico', codigo: 'código', pagina: 'página',
    usuario: 'usuário', possivel: 'possível', disponivel: 'disponível', inicio: 'início',
    organizacao: 'organização', organizacoes: 'organizações', inscricao: 'inscrição',
    inscricoes: 'inscrições', descricao: 'descrição', edicao: 'edição', sessao: 'sessão',
    verificacao: 'verificação', notificacoes: 'notificações', notificacao: 'notificação',
    conteudo: 'conteúdo', ultima: 'última', ultimos: 'últimos', ultimas: 'últimas', codigos: 'códigos',
    paginas: 'páginas', numeros: 'números', possiveis: 'possíveis', disponiveis: 'disponíveis',
    premio: 'prémio', premios: 'prémios', sessoes: 'sessões', funcao: 'função', relatorio: 'relatório',
    endereco: 'endereço', cartao: 'cartão', ninguem: 'ninguém', alguem: 'alguém', tres: 'três',
    // Found 30 September 2026 by the same twin sweep as the French (inbox 380):
    // each is never correct without its accent.
    adesoes: 'adesões', adversario: 'adversário', alteracao: 'alteração',
    alteracoes: 'alterações', anfitriao: 'anfitrião', apos: 'após', area: 'área',
    atras: 'atrás', atraves: 'através', atualizacoes: 'atualizações',
    autenticacao: 'autenticação', automatico: 'automático', autorizacao: 'autorização',
    avaliacoes: 'avaliações', avancar: 'avançar', cabeca: 'cabeça', cabecas: 'cabeças',
    capitao: 'capitão', capitulo: 'capítulo', capitulos: 'capítulos', cartoes: 'cartões',
    classificacao: 'classificação', classificacoes: 'classificações', comeca: 'começa',
    comecar: 'começar', comecou: 'começou', comentarios: 'comentários', comissao: 'comissão',
    competicoes: 'competições', compoem: 'compõem', concluido: 'concluído',
    condicoes: 'condições', construimos: 'construímos', conteudos: 'conteúdos',
    criacao: 'criação', criterios: 'critérios', decisao: 'decisão', definicoes: 'definições',
    diario: 'diário', digitos: 'dígitos', discussao: 'discussão', discussoes: 'discussões',
    ecra: 'ecrã', epoca: 'época', espaco: 'espaço', especifico: 'específico', estao: 'estão',
    estatisticas: 'estatísticas', estudio: 'estúdio', fas: 'fãs', foruns: 'fóruns',
    grafico: 'gráfico', graficos: 'gráficos', gratis: 'grátis', ha: 'há', incluido: 'incluído',
    indicacao: 'indicação', indisponivel: 'indisponível', lancamento: 'lançamento',
    legivel: 'legível', logotipo: 'logótipo', logotipos: 'logótipos', mao: 'mão', maos: 'mãos',
    maximo: 'máximo', minimo: 'mínimo', necessario: 'necessário', nigeria: 'nigéria',
    obrigatoria: 'obrigatória', obrigatorio: 'obrigatório', opcao: 'opção', padrao: 'padrão',
    paises: 'países', penalizacao: 'penalização', permissoes: 'permissões', pixeis: 'píxeis',
    planteis: 'plantéis', pontuacao: 'pontuação', posicao: 'posição', posicoes: 'posições',
    preco: 'preço', precos: 'preços', presenca: 'presença', producao: 'produção',
    propria: 'própria', proprio: 'próprio', proprios: 'próprios', proxima: 'próxima',
    publicacao: 'publicação', publicacoes: 'publicações', razao: 'razão', reacoes: 'reações',
    recomeca: 'recomeça', recomendacoes: 'recomendações', reposicao: 'reposição',
    responsavel: 'responsável', revisao: 'revisão', sera: 'será', serao: 'serão',
    serie: 'série', serio: 'sério', servico: 'serviço', subscricao: 'subscrição',
    subscricoes: 'subscrições', telemovel: 'telemóvel', tera: 'terá', titulo: 'título',
    topicos: 'tópicos', transferencia: 'transferência', transmissao: 'transmissão',
    unico: 'único', util: 'útil', utilizacoes: 'utilizações', vao: 'vão', varios: 'vários',
    versoes: 'versões', visualizacoes: 'visualizações', vitorias: 'vitórias', so: 'só',
    mes: 'mês',
    equipa: null, torneio: null,
  },
};

const WORD = /[A-Za-zÀ-ÿ]+/g;

// Three words are also correct present-tense verbs: "ne s'enregistre pas",
// "cela supprime", "modifie un résultat". They are wrong only as a past
// participle, so they count only after an auxiliary, or standing alone as a
// whole message ("Enregistre.").
const AMBIGUOUS = { fr: new Set(['enregistre', 'supprime', 'modifie', 'signale', 'trouve', 'laisse', 'passe', 'paye', 'payes', 'termine', 'rembourse', 'rembourses', 'verse', 'verses', 'annule', 'ferme', 'valide', 'publie', 'programme', 'confirme', 'accepte', 'ajoute', 'abonne', 'abonnes', 'recupere', 'elimine', 'modere', 'protege', 'possede', 'preleve', 'mene', 'epuise']) };
const AUXILIARY = new Set(['a', 'ai', 'as', 'avons', 'avez', 'ont', 'est', 'sont', 'suis', 'es',
  'sommes', 'etes', 'êtes', 'été', 'ete', 'être', 'etre', 'sera', 'seront', 'était', 'etait',
  'bien', 'pas', 'jamais', 'rien', 'deja', 'déjà', 'non']);

const LEADING_A = /(^|[.!?:]\s+)A (venir|propos|vendre|gauche|droite|qui|quoi|vous|votre|vos|envoyer|partir|jour|la|l’|l'|moins|bientôt|demain|nouveau|plus)(?![\wÀ-ÿ])/g;

export function findBare(table, lang) {
  const words = BARE[lang];
  const hits = [];
  for (const [key, value] of Object.entries(table || {})) {
    if (typeof value !== 'string') continue;
    // Placeholders and URLs are not prose.
    const prose = value.replace(/\{[^}]*\}/g, ' ').replace(/https?:\/\/\S+/g, ' ');
    const found = [...prose.matchAll(WORD)].map((m) => m[0]);
    found.forEach((word, i) => {
      const w = word.toLowerCase();
      if (!words[w]) return;
      // An all-capitals token is a placeholder in an example ("?ref=CODIGO"), not prose.
      if (word.length > 1 && word === word.toUpperCase()) return;
      if (AMBIGUOUS[lang]?.has(w)) {
        const before = (found[i - 1] || '').toLowerCase();
        const alone = found.length === 1;
        if (!alone && !AUXILIARY.has(before)) return;
      }
      hits.push({ key, word, should: words[w] });
    });
    if (lang === 'fr') {
      for (const word of found) {
        const should = eeFix(word);
        if (should) hits.push({ key, word, should });
      }
    }
    // French elision with its apostrophe lost: "l annuler", "n est", "d inscription".
    // A lone l, d, n, s, j, c or qu before a vowel is never a French word; 144 of
    // these were found at once on 29 September 2026, so it is part of this catcher.
    if (lang === 'fr') {
      for (const m of prose.matchAll(ELISION)) {
        hits.push({ key, word: `${m[2]} ${m[3]}`, should: `${m[2]}’${m[3]}` });
      }
      // A sentence opening "A venir", "A propos", "A vous": the preposition,
      // which is "À". "A" meaning "has" opens a sentence only before a past
      // participle, which is not one of these words (30 September 2026).
      for (const m of prose.matchAll(LEADING_A)) {
        hits.push({ key, word: `A ${m[2]}`, should: `À ${m[2]}` });
      }
    }
  }
  return hits;
}

// French past participles and nouns in -ée(s) written -ee(s): "dessinee", "entree",
// "journee". A French word never ends that way, so the rule needs no word list;
// 90 were found at once on 29 September 2026. The map gives the whole word where
// the stem carries an accent too; otherwise only the ending is restored.
const EE_ENGLISH = new Set(['free', 'fee', 'fees', 'see', 'three', 'agree', 'disagree',
  'attendee', 'attendees', 'referee', 'coffee', 'committee', 'employee', 'guarantee']);
const EE_STEM = {
  telechargee: 'téléchargée', cedee: 'cédée', liberee: 'libérée', desactivee: 'désactivée',
  desactivees: 'désactivées', prelevee: 'prélevée', controlee: 'contrôlée', debitee: 'débitée',
  reservee: 'réservée', reservees: 'réservées', decidee: 'décidée', creee: 'créée', creees: 'créées',
};
export function eeFix(word) {
  const lower = word.toLowerCase();
  if (EE_ENGLISH.has(lower) || !/^[a-zà-ÿ]{2,}ees?$/.test(lower)) return null;
  const whole = EE_STEM[lower] || lower.replace(/ee(s?)$/, 'ée$1');
  return word[0] === word[0].toUpperCase() ? whole[0].toUpperCase() + whole.slice(1) : whole;
}

const ELISION = /(^|[\s(«"'])(d|l|qu|n|s|j|c|jusqu|lorsqu|puisqu) ([aeiouyéèêëàâîïôûùh])/gi;

function selfTest() {
  const cases = [
    ['fr', { a: 'Vers une equipe' }, 1],
    ['fr', { a: 'Vers une équipe' }, 0],
    ['fr', { a: 'A venir' }, 1],
    ['fr', { a: 'A accepté vos règles le {date}' }, 0],
    ['fr', { a: 'Le code est incorrect, ou il a déjà servi.' }, 0],
    ['fr', { a: 'Telecharger le releve' }, 2],
    ['fr', { a: 'Le mois {equipe}' }, 0],
    ['fr', { a: "Quiconque ne s'enregistre pas" }, 0],
    ['fr', { a: 'Cela a ete enregistre.' }, 2],
    ['fr', { a: 'Enregistre.' }, 1],
    ['fr', { a: 'Cela supprime les messages' }, 0],
    ['pt', { a: 'O link passa a ser ?ref=CODIGO' }, 0],
    ['pt', { a: 'Isso nao carregou' }, 1],
    ['pt', { a: 'Isso não carregou' }, 0],
    ['fr', { a: 'Carte dessinee' }, 1],
    ['fr', { a: 'Carte dessinée' }, 0],
    ['fr', { a: 'Free Fire' }, 0],
    ['fr', { a: 'Liste telechargee' }, 1],
    ['fr', { a: 'Oui, l annuler' }, 1],
    ['fr', { a: 'La salle n est plus disponible' }, 1],
    ['fr', { a: 'Oui, l’annuler' }, 0],
    ['fr', { a: 'La salle n’est plus disponible' }, 0],
    ['fr', { a: '{n} entrants' }, 0],
    ['pt', { a: 'd e f' }, 0],
  ];
  let failed = 0;
  for (const [lang, table, expected] of cases) {
    const got = findBare(table, lang).length;
    const ok = got === expected;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${lang} ${JSON.stringify(table)}: expected ${expected}, got ${got}`);
  }
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  return failed === 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const mod = await import(pathToFileURL(path.join(ROOT, 'src', 'i18n', 'dictionaries.js')).href);
  let total = 0;
  for (const lang of ['fr', 'pt']) {
    const hits = findBare(mod.dictionaries[lang], lang);
    total += hits.length;
    for (const h of hits.slice(0, 400)) console.log(`${lang} ${h.key}: "${h.word}" should be "${h.should}"`);
  }
  console.log(`${total} word(s) without their accent or apostrophe in French and Portuguese`);
  process.exit(total ? 1 : 0);
}
