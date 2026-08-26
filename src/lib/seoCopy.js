// What each section says about itself, in each language.
//
// Kept apart from the runtime dictionary on purpose. This copy is read by
// `generateMetadata` on the server, where the React context that serves
// `t()` does not exist - the language comes from a header instead. Putting it
// here means a French page gets a French `<title>` and a French description in
// the HTML the crawler receives, which is the entire reason locale URLs exist.
//
// Written to be read in a search result: the game, the place, what you do.
// A description that could describe any page ranks for nothing.

export const SECTION_COPY = {
  tournaments: {
    en: {
      title: 'Esports tournaments in Nigeria and across Africa',
      description:
        'Browse open esports tournaments, see prize pools in VENT COINS, check entry fees and '
        + 'register your team or yourself. Free Fire, PUBG Mobile, FIFA and more.',
    },
    fr: {
      title: 'Tournois esport au Nigeria et partout en Afrique',
      description:
        'Parcourez les tournois esport ouverts, voyez les dotations en VENT COINS, vérifiez les '
        + "frais d'inscription et inscrivez votre équipe ou vous-même. Free Fire, PUBG Mobile, "
        + 'FIFA et bien d’autres.',
    },
    pt: {
      title: 'Torneios de esports na Nigéria e em toda a África',
      description:
        'Veja os torneios de esports abertos, os prémios em VENT COINS e as taxas de inscrição, e '
        + 'inscreva a sua equipa ou a si próprio. Free Fire, PUBG Mobile, FIFA e muito mais.',
    },
  },

  events: {
    en: {
      title: 'Gaming and anime events, with tickets',
      description:
        'Find gaming conventions, anime meetups, LAN parties and watch parties across Africa. '
        + 'Buy tickets, get a QR code, and show it at the door.',
    },
    fr: {
      title: 'Événements jeu vidéo et anime, avec billetterie',
      description:
        'Trouvez conventions de jeu vidéo, rencontres anime, LAN et projections partout en '
        + 'Afrique. Achetez un billet, recevez un QR code, présentez-le à l’entrée.',
    },
    pt: {
      title: 'Eventos de jogos e anime, com bilhetes',
      description:
        'Encontre convenções de jogos, encontros de anime, LAN parties e sessões de visionamento '
        + 'por toda a África. Compre bilhete, receba um código QR e mostre-o à entrada.',
    },
  },

  teams: {
    en: {
      title: 'Esports teams',
      description:
        'Find a team to join or scout your next opponent. Rosters, the games they play, the '
        + 'tournaments they have entered and how they finished.',
    },
    fr: {
      title: 'Équipes esport',
      description:
        'Trouvez une équipe à rejoindre ou repérez votre prochain adversaire. Les effectifs, les '
        + 'jeux pratiqués, les tournois disputés et les résultats obtenus.',
    },
    pt: {
      title: 'Equipas de esports',
      description:
        'Encontre uma equipa para entrar ou observe o seu próximo adversário. Planteis, os jogos '
        + 'que praticam, os torneios em que entraram e como terminaram.',
    },
  },

  organizations: {
    en: {
      title: 'Esports organizations',
      description:
        'The brands that field teams and run tournaments on V-ENT. See who they back, what they '
        + 'run and how to reach them.',
    },
    fr: {
      title: 'Organisations esport',
      description:
        'Les structures qui alignent des équipes et organisent des tournois sur V-ENT. Voyez qui '
        + 'elles soutiennent, ce qu’elles organisent et comment les contacter.',
    },
    pt: {
      title: 'Organizações de esports',
      description:
        'As marcas que têm equipas e organizam torneios na V-ENT. Veja quem apoiam, o que '
        + 'organizam e como as contactar.',
    },
  },

  community: {
    en: {
      title: 'Community: posts, forums, clubs and scrims',
      description:
        'Talk to other players, argue about the meta in the forums, join a club for your game '
        + 'and find a team to scrim against.',
    },
    fr: {
      title: 'Communauté : publications, forums, clubs et scrims',
      description:
        'Échangez avec d’autres joueurs, débattez du méta sur les forums, rejoignez un club pour '
        + 'votre jeu et trouvez une équipe contre qui vous entraîner.',
    },
    pt: {
      title: 'Comunidade: publicações, fóruns, clubes e scrims',
      description:
        'Fale com outros jogadores, discuta a meta nos fóruns, entre num clube do seu jogo e '
        + 'encontre uma equipa para treinar.',
    },
  },

  rankings: {
    en: {
      title: 'Player and team rankings',
      description:
        'Who is actually winning. Rankings built from real tournament results on V-ENT, by game '
        + 'and by region.',
    },
    fr: {
      title: 'Classements des joueurs et des équipes',
      description:
        'Qui gagne vraiment. Des classements établis à partir de résultats réels de tournois sur '
        + 'V-ENT, par jeu et par région.',
    },
    pt: {
      title: 'Classificações de jogadores e equipas',
      description:
        'Quem está mesmo a ganhar. Classificações construídas a partir de resultados reais de '
        + 'torneios na V-ENT, por jogo e por região.',
    },
  },

  search: {
    en: { title: 'Search V-ENT',
          description: 'Search tournaments, events, teams and players across V-ENT.' },
    fr: { title: 'Rechercher sur V-ENT',
          description: 'Recherchez tournois, événements, équipes et joueurs sur tout V-ENT.' },
    pt: { title: 'Procurar na V-ENT',
          description: 'Procure torneios, eventos, equipas e jogadores em toda a V-ENT.' },
  },

  login: {
    en: { title: 'Sign in',
          description: 'Sign in to V-ENT to enter tournaments, buy event tickets and manage your team.' },
    fr: { title: 'Se connecter',
          description: 'Connectez-vous à V-ENT pour vous inscrire aux tournois, acheter des billets et gérer votre équipe.' },
    pt: { title: 'Iniciar sessão',
          description: 'Inicie sessão na V-ENT para entrar em torneios, comprar bilhetes e gerir a sua equipa.' },
  },

  signup: {
    en: {
      title: 'Create an account',
      description:
        'Create a free V-ENT account to enter esports tournaments, buy event tickets, build a '
        + 'team and get paid in VENT COINS.',
    },
    fr: {
      title: 'Créer un compte',
      description:
        'Créez un compte V-ENT gratuit pour participer à des tournois esport, acheter des billets, '
        + 'monter une équipe et être payé en VENT COINS.',
    },
    pt: {
      title: 'Criar uma conta',
      description:
        'Crie uma conta V-ENT gratuita para entrar em torneios de esports, comprar bilhetes, '
        + 'construir uma equipa e receber em VENT COINS.',
    },
  },

  'privacy-policy': {
    en: { title: 'Privacy policy',
          description: 'What V-ENT collects, why, how long it is kept and how to get it deleted.' },
    fr: { title: 'Politique de confidentialité',
          description: 'Ce que V-ENT collecte, pourquoi, combien de temps c’est conservé et comment le faire supprimer.' },
    pt: { title: 'Política de privacidade',
          description: 'O que a V-ENT recolhe, porquê, durante quanto tempo é guardado e como pedir a eliminação.' },
  },
  // The front page. It had no entry here, so the root layout fell back to a
  // build-time constant and every locale URL shipped an English title - which
  // is the one line of a search result anybody actually reads.
  root: {
    en: {
      title: 'V-ENT: esports tournaments, events and teams, built for Africa',
      description:
        'Enter esports tournaments, buy tickets to gaming and anime events, build a team and '
        + 'get paid in VENT COINS. Built in Nigeria for players across Africa.',
    },
    fr: {
      title: 'V-ENT : tournois esport, événements et équipes, pensés pour l’Afrique',
      description:
        'Participez à des tournois esport, achetez des billets pour des événements jeu vidéo et '
        + 'anime, montez une équipe et soyez payé en VENT COINS. Créé au Nigeria pour les joueurs '
        + 'de toute l’Afrique.',
    },
    pt: {
      title: 'V-ENT: torneios de esports, eventos e equipas, feitos para África',
      description:
        'Entre em torneios de esports, compre bilhetes para eventos de jogos e anime, construa '
        + 'uma equipa e receba em VENT COINS. Criado na Nigéria para jogadores de toda a África.',
    },
  },
};

/** Titles for pages that are noindex - the tab still needs a name. */
export const PRIVATE_TITLES = {
  wallets: { en: 'Wallet', fr: 'Portefeuille', pt: 'Carteira' },
  settings: { en: 'Settings', fr: 'Paramètres', pt: 'Definições' },
  notifications: { en: 'Notifications', fr: 'Notifications', pt: 'Notificações' },
  'edit-user-profile': { en: 'Edit profile', fr: 'Modifier le profil', pt: 'Editar perfil' },
  'edit-team-profile': { en: 'Edit team', fr: 'Modifier l’équipe', pt: 'Editar equipa' },
  onboarding: { en: 'Get set up', fr: 'Configuration', pt: 'Configuração' },
  disputes: { en: 'Disputes', fr: 'Litiges', pt: 'Disputas' },
  home: { en: 'Home', fr: 'Accueil', pt: 'Início' },
  'user-profile': { en: 'Profile', fr: 'Profil', pt: 'Perfil' },
  partners: { en: 'Partners', fr: 'Partenaires', pt: 'Parceiros' },
};

export const sectionCopy = (section, locale) => {
  const entry = SECTION_COPY[section];
  if (!entry) return null;
  return entry[locale] || entry.en;
};

export const privateTitle = (section, locale) => {
  const entry = PRIVATE_TITLES[section];
  if (!entry) return null;
  return entry[locale] || entry.en;
};
