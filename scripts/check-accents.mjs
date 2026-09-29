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
    mois: null, a: null,
  },
  pt: {
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
    equipa: null, torneio: null,
  },
};

const WORD = /[A-Za-zÀ-ÿ]+/g;

// Three words are also correct present-tense verbs: "ne s'enregistre pas",
// "cela supprime", "modifie un résultat". They are wrong only as a past
// participle, so they count only after an auxiliary, or standing alone as a
// whole message ("Enregistre.").
const AMBIGUOUS = { fr: new Set(['enregistre', 'supprime', 'modifie']) };
const AUXILIARY = new Set(['a', 'ai', 'as', 'avons', 'avez', 'ont', 'est', 'sont', 'suis', 'es',
  'sommes', 'etes', 'êtes', 'été', 'ete', 'être', 'etre', 'sera', 'seront', 'était', 'etait',
  'bien', 'pas', 'jamais', 'rien', 'deja', 'déjà', 'non']);

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
    // French elision with its apostrophe lost: "l annuler", "n est", "d inscription".
    // A lone l, d, n, s, j, c or qu before a vowel is never a French word; 144 of
    // these were found at once on 29 September 2026, so it is part of this catcher.
    if (lang === 'fr') {
      for (const m of prose.matchAll(ELISION)) {
        hits.push({ key, word: `${m[2]} ${m[3]}`, should: `${m[2]}’${m[3]}` });
      }
    }
  }
  return hits;
}

const ELISION = /(^|[\s(«"'])(d|l|qu|n|s|j|c|jusqu|lorsqu|puisqu) ([aeiouyéèêëàâîïôûùh])/gi;

function selfTest() {
  const cases = [
    ['fr', { a: 'Vers une equipe' }, 1],
    ['fr', { a: 'Vers une équipe' }, 0],
    ['fr', { a: 'Telecharger le releve' }, 2],
    ['fr', { a: 'Le mois {equipe}' }, 0],
    ['fr', { a: "Quiconque ne s'enregistre pas" }, 0],
    ['fr', { a: 'Cela a ete enregistre.' }, 2],
    ['fr', { a: 'Enregistre.' }, 1],
    ['fr', { a: 'Cela supprime les messages' }, 0],
    ['pt', { a: 'O link passa a ser ?ref=CODIGO' }, 0],
    ['pt', { a: 'Isso nao carregou' }, 1],
    ['pt', { a: 'Isso não carregou' }, 0],
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
