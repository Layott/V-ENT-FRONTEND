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
  'anime': {
    en: { title: 'Anime', description: 'Anime on V-ENT: what is coming, and the community around it.' },
    fr: { title: 'Anime', description: 'L’anime sur V-ENT : ce qui arrive, et la communauté autour.' },
    pt: { title: 'Anime', description: 'Anime na V-ENT: o que aí vem, e a comunidade à volta.' },
  },
  'anime/battles': {
    en: { title: 'Character battles', description: 'Nominate an anime character, score their strength, speed, intelligence, durability and technique, and the average of every vote decides who wins.' },
    fr: { title: 'Combats de personnages', description: 'Proposez un personnage d’anime, notez sa force, sa vitesse, son intelligence, sa résistance et sa technique : la moyenne des votes désigne le vainqueur.' },
    pt: { title: 'Batalhas de personagens', description: 'Proponha uma personagem de anime, avalie a força, velocidade, inteligência, resistência e técnica, e a média dos votos decide quem ganha.' },
  },
  'anime/manga': {
    en: { title: 'Comics', description: 'Manga, manhwa and webcomics uploaded by people on V-ENT. Search by genre, rating and status.' },
    fr: { title: 'Bandes dessinées', description: 'Manga, manhwa et webcomics publiés par les membres de V-ENT. Recherche par genre, note et statut.' },
    pt: { title: 'Bandas desenhadas', description: 'Manga, manhwa e webcomics publicados pelas pessoas na V-ENT. Pesquise por género, classificação e estado.' },
  },
  'anime/rooms': {
    en: { title: 'Reading rooms', description: 'Rooms where people read the same comic at the same time on V-ENT, with the pages in step and a chat beside them.' },
    fr: { title: 'Salons de lecture', description: 'Des salons où l’on lit la même bande dessinée en même temps sur V-ENT, pages synchronisées et discussion à côté.' },
    pt: { title: 'Salas de leitura', description: 'Salas onde as pessoas leem a mesma banda desenhada ao mesmo tempo na V-ENT, com as páginas sincronizadas e um chat ao lado.' },
  },
  'community/post': {
    en: { title: 'Posts', description: 'What players on V-ENT are posting about their matches, teams and events.' },
    fr: { title: 'Publications', description: 'Ce que les joueurs de V-ENT publient sur leurs matchs, leurs équipes et leurs événements.' },
    pt: { title: 'Publicações', description: 'O que os jogadores da V-ENT publicam sobre os seus jogos, equipas e eventos.' },
  },
  'community/thread': {
    en: { title: 'Discussions', description: 'Discussions from the V-ENT community: tactics, results, teams and events.' },
    fr: { title: 'Discussions', description: 'Les discussions de la communauté V-ENT : tactiques, résultats, équipes et événements.' },
    pt: { title: 'Discussões', description: 'Discussões da comunidade V-ENT: táticas, resultados, equipas e eventos.' },
  },
  'events/vendor-shop': {
    en: { title: 'Stalls', description: 'The stalls trading at this event, and what each of them sells.' },
    fr: { title: 'Stands', description: 'Les stands présents à cet événement, et ce que chacun vend.' },
    pt: { title: 'Bancas', description: 'As bancas presentes neste evento, e o que cada uma vende.' },
  },
  'events/vendor-shop/vendor': {
    en: { title: 'Stall', description: 'A stall at a V-ENT event, and what it sells.' },
    fr: { title: 'Stand', description: 'Un stand à un événement V-ENT, et ce qu’il vend.' },
    pt: { title: 'Banca', description: 'Uma banca num evento V-ENT, e o que vende.' },
  },
  'events/view-event': {
    en: { title: 'Event', description: 'An event on V-ENT: what is on, where it is, and how to get a ticket.' },
    fr: { title: 'Événement', description: 'Un événement sur V-ENT : ce qui s’y passe, où, et comment obtenir un billet.' },
    pt: { title: 'Evento', description: 'Um evento na V-ENT: o que acontece, onde é, e como obter um bilhete.' },
  },
  'feedback': {
    en: { title: 'Send feedback', description: 'Tell us what broke, what confused you, or what is missing. No account needed.' },
    fr: { title: 'Donner votre avis', description: 'Dites-nous ce qui ne marche pas, ce qui vous a perdu ou ce qui manque. Aucun compte nécessaire.' },
    pt: { title: 'Enviar comentários', description: 'Diga-nos o que avariou, o que o confundiu ou o que falta. Não precisa de conta.' },
  },
  'marketplace': {
    en: { title: 'Marketplace', description: 'The V-ENT marketplace, where players buy and sell within the community.' },
    fr: { title: 'Marketplace', description: 'La marketplace V-ENT, où les joueurs achètent et vendent au sein de la communauté.' },
    pt: { title: 'Marketplace', description: 'O marketplace da V-ENT, onde os jogadores compram e vendem dentro da comunidade.' },
  },
  'organizations/org-profile': {
    en: { title: 'Organisation', description: 'An organisation on V-ENT: the tournaments and events it runs, and its teams.' },
    fr: { title: 'Organisation', description: 'Une organisation sur V-ENT : les tournois et événements qu’elle organise, et ses équipes.' },
    pt: { title: 'Organização', description: 'Uma organização na V-ENT: os torneios e eventos que organiza, e as suas equipas.' },
  },
  'pricing': {
    en: { title: 'Pricing', description: 'V-ENT is free to use today. What will cost money later, what stays free, and the one thing we will never do.' },
    fr: { title: 'Tarifs', description: 'V-ENT est gratuit aujourd’hui. Ce qui sera payant plus tard, ce qui reste gratuit, et la seule chose que nous ne ferons jamais.' },
    pt: { title: 'Preços', description: 'A V-ENT é gratuita hoje. O que passará a ser pago, o que fica gratuito, e a única coisa que nunca faremos.' },
  },
  'shop': {
    en: { title: 'Shop', description: 'The V-ENT shop: merchandise and gear for players and teams.' },
    fr: { title: 'Boutique', description: 'La boutique V-ENT : produits dérivés et équipement pour les joueurs et les équipes.' },
    pt: { title: 'Loja', description: 'A loja V-ENT: merchandising e equipamento para jogadores e equipas.' },
  },
  'teams/team-profile': {
    en: { title: 'Team', description: 'A team on V-ENT: its players, the tournaments it has entered, and its record.' },
    fr: { title: 'Équipe', description: 'Une équipe sur V-ENT : ses joueurs, les tournois auxquels elle a participé, et son palmarès.' },
    pt: { title: 'Equipa', description: 'Uma equipa na V-ENT: os seus jogadores, os torneios em que participou, e o seu historial.' },
  },
  'tournaments/view-tournament': {
    en: { title: 'Tournament', description: 'A tournament on V-ENT: the format, who is playing, the bracket and the prizes.' },
    fr: { title: 'Tournoi', description: 'Un tournoi sur V-ENT : le format, les participants, le tableau et les prix.' },
    pt: { title: 'Torneio', description: 'Um torneio na V-ENT: o formato, quem joga, o quadro e os prémios.' },
  },
  'wager': {
    en: { title: 'Wager', description: 'Wagering on V-ENT. Not open yet; this page says where it has got to.' },
    fr: { title: 'Paris', description: 'Les paris sur V-ENT. Pas encore ouverts ; cette page dit où nous en sommes.' },
    pt: { title: 'Apostas', description: 'Apostas na V-ENT. Ainda não abertas; esta página diz em que ponto estamos.' },
  },
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
      title: 'Community: posts, forums, clubs and challenges',
      description:
        'Talk to other players, argue about the meta in the forums, join a club for your game '
        + 'and challenge a team or a player.',
    },
    fr: {
      title: 'Communauté : publications, forums, clubs et défis',
      description:
        'Échangez avec d’autres joueurs, débattez du méta sur les forums, rejoignez un club pour '
        + 'votre jeu et trouvez une équipe contre qui vous entraîner.',
    },
    pt: {
      title: 'Comunidade: publicações, fóruns, clubes e desafios',
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

  terms: {
    en: { title: 'Terms of use',
          description: 'The rules for using V-ENT: accounts, VENT COINS, tournaments, tickets and what happens when something goes wrong.' },
    fr: { title: 'Conditions d’utilisation',
          description: 'Les règles d’utilisation de V-ENT : comptes, VENT COINS, tournois, billets et ce qui se passe en cas de problème.' },
    pt: { title: 'Termos de utilização',
          description: 'As regras de utilização da V-ENT: contas, VENT COINS, torneios, bilhetes e o que acontece quando algo corre mal.' },
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
  'anime/my-list': { en: 'My list', fr: 'Ma liste', pt: 'A minha lista' },
  'anime/studio': { en: 'Your comics', fr: 'Vos bandes dessinées', pt: 'As suas bandas desenhadas' },
  'auth/external': { en: 'Signing in', fr: 'Connexion en cours', pt: 'A iniciar sessão' },
  'community/challenge/[slug]': { en: 'Challenge', fr: 'Défi', pt: 'Desafio' },
  'community/dm': { en: 'Messages', fr: 'Messages', pt: 'Mensagens' },
  'community/dm/[slug]': { en: 'Messages', fr: 'Messages', pt: 'Mensagens' },
  'community/post/[slug]': { en: 'Post', fr: 'Publication', pt: 'Publicação' },
  'community/scrim/create': { en: 'New challenge', fr: 'Nouveau défi', pt: 'Novo desafio' },
  'community/thread/[slug]': { en: 'Discussion', fr: 'Discussion', pt: 'Discussão' },
  'edit-team-profile/[slug]': { en: 'Edit team', fr: 'Modifier l’équipe', pt: 'Editar equipa' },
  'email-verified/[key]/[value]': { en: 'Email verified', fr: 'E-mail vérifié', pt: 'E-mail verificado' },
  'events/attendees': { en: 'Door list', fr: 'Liste d’entrée', pt: 'Lista de entrada' },
  'events/check-in/[code]': { en: 'Check in', fr: 'Enregistrement', pt: 'Check-in' },
  'events/create-event': { en: 'Create an event', fr: 'Créer un événement', pt: 'Criar um evento' },
  'events/edit-event': { en: 'Edit event', fr: 'Modifier l’événement', pt: 'Editar evento' },
  'events/find-ticket': { en: 'Find ticket', fr: 'Retrouver un billet', pt: 'Encontrar bilhete' },
  'events/my-events': { en: 'My events', fr: 'Mes événements', pt: 'Os meus eventos' },
  'events/my-tickets': { en: 'My tickets', fr: 'Mes billets', pt: 'Os meus bilhetes' },
  'events/scan': { en: 'Scanner', fr: 'Scanner', pt: 'Leitor' },
  'events/[slug]/attendees': { en: 'Door list', fr: 'Liste d’entrée', pt: 'Lista de entrada' },
  'events/[slug]/edit': { en: 'Edit event', fr: 'Modifier l’événement', pt: 'Editar evento' },
  'my-stalls': { en: 'My stalls', fr: 'Mes stands', pt: 'As minhas bancas' },
  'organizations/create': { en: 'New organisation', fr: 'Nouvelle organisation', pt: 'Nova organização' },
  'organizations/invites': { en: 'Invites', fr: 'Invitations', pt: 'Convites' },
  'organizations/[slug]': { en: 'Organisation', fr: 'Organisation', pt: 'Organização' },
  'partners/authorize': { en: 'Authorize', fr: 'Autoriser', pt: 'Autorizar' },
  'teams/create-team': { en: 'Create team', fr: 'Créer une équipe', pt: 'Criar equipa' },
  'teams/join/[token]': { en: 'Join a team', fr: 'Rejoindre une équipe', pt: 'Juntar-se a uma equipa' },
  'tournaments/create-tournament': { en: 'Create a tournament', fr: 'Créer un tournoi', pt: 'Criar um torneio' },
  'tournaments/drafts': { en: 'Drafts', fr: 'Brouillons', pt: 'Rascunhos' },
  'tournaments/edit-tournament': { en: 'Edit tournament', fr: 'Modifier le tournoi', pt: 'Editar torneio' },
  'tournaments/my-tournaments': { en: 'My tournaments', fr: 'Mes tournois', pt: 'Os meus torneios' },
  'tournaments/overlay': { en: 'Overlay', fr: 'Habillage', pt: 'Sobreposição' },
  'tournaments/production': { en: 'Production', fr: 'Production', pt: 'Produção' },
  'tournaments/[slug]/edit': { en: 'Edit tournament', fr: 'Modifier le tournoi', pt: 'Editar torneio' },
  wallets: { en: 'Wallet', fr: 'Portefeuille', pt: 'Carteira' },
  'wallet-topup-callback': { en: 'Payment', fr: 'Paiement', pt: 'Pagamento' },
  production: { en: 'Production', fr: 'Production', pt: 'Produção' },
  settings: { en: 'Settings', fr: 'Paramètres', pt: 'Definições' },
  notifications: { en: 'Notifications', fr: 'Notifications', pt: 'Notificações' },
  'edit-user-profile': { en: 'Edit profile', fr: 'Modifier le profil', pt: 'Editar perfil' },
  'edit-team-profile': { en: 'Edit team', fr: 'Modifier l’équipe', pt: 'Editar equipa' },
  onboarding: { en: 'Get set up', fr: 'Configuration', pt: 'Configuração' },
  disputes: { en: 'Disputes', fr: 'Litiges', pt: 'Disputas' },
  home: { en: 'Home', fr: 'Accueil', pt: 'Início' },
  'user-profile': { en: 'Profile', fr: 'Profil', pt: 'Perfil' },
  partners: { en: 'Partners', fr: 'Partenaires', pt: 'Parceiros' },
  memberships: { en: 'My memberships', fr: 'Mes abonnements', pt: 'As minhas subscrições' },
  // Vermillion City's three private screens. A form, somebody's own listings
  // and their numbers, and an order with what somebody bought and from whom.
  'marketplace-create': { en: 'List something', fr: 'Mettre en ligne', pt: 'Colocar um anúncio' },
  'marketplace-dashboard': { en: 'What I am selling', fr: 'Ce que je vends', pt: 'O que estou a vender' },
  'marketplace-purchase': { en: 'Your order', fr: 'Votre commande', pt: 'A sua encomenda' },
  // Signing out. Noindex like the rest of these: it is an action, not
  // something anybody should reach from a search result.
  logout: { en: 'Sign out', fr: 'Se déconnecter', pt: 'Terminar sessão' },
  // The organiser consoles (tournament, event, organisation) and the entry
  // form. They were titled 'Manage' and 'Register' in English for every
  // reader (walk, 29 September 2026).
  manage: { en: 'Manage', fr: 'Gérer', pt: 'Gerir' },
  register: { en: 'Register', fr: 'S’inscrire', pt: 'Inscrever-se' },
  'ticket-confirmed': { en: 'Your ticket', fr: 'Votre billet', pt: 'O seu bilhete' },
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
