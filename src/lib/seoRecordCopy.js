// The sentences a record page's metadata is written in, in en, fr and pt.
//
// Every record page (an event, a tournament, a team, a player, a comic, a
// stall, a membership, a listing) described itself in English whatever the
// reader's language: "Team not found", "In person event on 10 October 2026.
// Tickets from 1,000 NGN.", "5 cues across 1 days". It was recorded as open on
// 28 September and found again on 30 September (inbox 380), after the layouts
// themselves had been translated (inbox 375).
//
// `recordCopy(locale)` hands back:
//   t(key, vars)          a sentence with {name} placeholders filled
//   n(key, count, vars)   the same, with the plural form Intl.PluralRules picks
//                         for `count` in that language (key.one / key.other)
//   num(value)            a number grouped the way that language groups it
//   date(value, zone)     a date in words, on the venue's clock (Lagos by
//                         default), never the server's
//
// Metadata is built on the server, where there is no browser to ask for a zone
// or a language: the language comes from the address (currentLocale) and the
// zone from the record, so neither is the server's own.

const TAGS = { en: 'en-NG', fr: 'fr-FR', pt: 'pt-PT' };

const COPY = {
  en: {
    'notFound.page.title': 'Page not found',
    'unavailable.description': 'This page could not be loaded just now. Try again in a moment.',

    'notFound.event.title': 'Event not found',
    'notFound.event.description': 'This event does not exist, or it is no longer listed.',
    'moved.event.title': 'Event moved',
    'moved.event.description': 'This event has been renamed.',
    'event.kind.physical': 'In person event',
    'event.kind.hybrid': 'In person and online event',
    'event.kind.virtual': 'Online event',
    'event.on': '{kind} on {date}.',
    'event.plain': '{kind}.',
    'event.from': 'Tickets from {price} NGN.',
    'event.free': 'Free to attend.',

    'notFound.tournament.title': 'Tournament not found',
    'notFound.tournament.description': 'This tournament does not exist, or it is no longer listed.',
    'moved.tournament.title': 'Tournament moved',
    'moved.tournament.description': 'This tournament has been renamed.',
    'tournament.gameOn': '{game} tournament on {date}.',
    'tournament.game': '{game} tournament.',
    'tournament.on': 'Tournament on {date}.',
    'tournament.plain': 'Tournament.',
    'tournament.prize': '{prize} VENT COINS prize pool.',
    'tournament.entry': 'Entry {price} VC.',
    'tournament.free': 'Free to enter.',
    'tournament.places': '{taken} of {max} places taken.',

    'notFound.organization.title': 'Organisation not found',
    'notFound.organization.description': 'This organisation does not exist, or it is no longer listed.',
    'moved.organization.title': 'Organisation moved',
    'moved.organization.description': 'This organisation has been renamed.',
    'organization.plain': '{name}, an esports organisation on V-ENT.',
    'notFound.thread.title': 'Discussion not found',
    'notFound.thread.description': 'This discussion does not exist.',
    'moved.thread.title': 'Discussion moved',
    'moved.thread.description': 'This discussion has been renamed.',
    'thread.plain': '{title}, a discussion on V-ENT.',
    'notFound.post.title': 'Post not found',
    'notFound.post.description': 'This post does not exist.',
    'moved.post.title': 'Post moved',
    'moved.post.description': 'This post has been renamed.',
    'post.plain': 'A post on V-ENT.',
    'post.by': 'A post by {author} on V-ENT.',
    'notFound.circuit.title': 'Circuit not found',
    'notFound.circuit.description': 'This circuit does not exist, or it is not published.',
    'moved.circuit.title': 'Circuit moved',
    'moved.circuit.description': 'This circuit has been renamed.',
    'circuit.plain': '{name}, an esports circuit on V-ENT: a season of tournaments ranked as one competition.',
    'circuit.game': 'Game: {game}.',
    'circuit.tournaments.one': '{count} tournament counts.',
    'circuit.tournaments.other': '{count} tournaments count.',
    'circuit.leader': 'Leading: {name} with {points} points.',
    'notFound.league.title': 'League not found',
    'notFound.league.description': 'This league does not exist, or it is not published.',
    'moved.league.title': 'League moved',
    'moved.league.description': 'This league has been renamed.',
    'league.plain': '{name}, an esports league on V-ENT: divisions of players or teams, with promotion and relegation at the end of every season.',
    'league.divisions.one': '{count} division.',
    'league.divisions.other': '{count} divisions.',
    'league.moves': 'The top {up} of each division go up and the bottom {down} go down.',
    'organization.tournaments.one': '{count} tournament run.',
    'organization.tournaments.other': '{count} tournaments run.',

    'notFound.team.title': 'Team not found',
    'notFound.team.description': 'This team does not exist, or it is no longer listed.',
    'moved.team.title': 'Team moved',
    'moved.team.description': 'This team has been renamed.',
    'team.withGame': '{name}, a {game} team on V-ENT.',
    'team.plain': '{name} on V-ENT.',
    'team.members.one': '{count} member.',
    'team.members.other': '{count} members.',
    'team.based': 'Based in {place}.',

    'notFound.player.title': 'Player not found',
    'notFound.player.description': 'This player does not exist, or their profile is not public.',
    'player.from': '{name} from {country} plays on V-ENT. See their teams, the tournaments they have entered and how they have placed.',
    'player.plain': '{name} plays on V-ENT. See their teams, the tournaments they have entered and how they have placed.',

    'notFound.battle.title': 'Battle not found',
    'notFound.battle.description': 'This battle does not exist.',
    'battle.default': 'A V-ENT character battle.',
    'battle.scored': 'Scored on strength, speed, intelligence, durability and technique.',

    'notFound.comic.title': 'Comic not found',
    'notFound.comic.description': 'This comic does not exist, or it is not published.',
    'comic.title': '{title} by {author}',
    'comic.default': 'A comic by {author} on V-ENT.',
    'comic.chapters.one': '{count} chapter.',
    'comic.chapters.other': '{count} chapters.',

    'notFound.chapter.title': 'Chapter not found',
    'notFound.chapter.description': 'This chapter does not exist, or it is not published.',
    'chapter.title': '{series}, chapter {number}',
    'chapter.untitled': 'Chapter {number}',
    'chapter.of': '{chapter} of {series} on V-ENT.',
    'chapter.pages.one': '{count} page.',
    'chapter.pages.other': '{count} pages.',

    'room.title': 'Reading room',
    'room.description': 'A room where people read the same comic at the same time.',

    'notFound.stall.title': 'Stall not found',
    'notFound.stall.description': 'This stall does not exist, or it has closed.',
    'stall.at': '{stall} at {event}',
    'stall.sellsAt': '{stall} sells {items} at {event}. Order before you arrive and collect at the booth.',
    'stall.sells': '{stall} sells {items}. Order before you arrive and collect at the booth.',
    'stall.plainAt': '{stall} at {event}. What they sell and how to order.',
    'stall.plain': '{stall}. What they sell and how to order.',

    'notFound.membership.title': 'Membership not found',
    'notFound.membership.description': 'This membership does not exist, or it is no longer offered.',
    'membership.title': '{plan}, a membership from {seller}',
    'membership.default': 'A membership from {seller} on V-ENT.',
    'membership.free': 'Free to join.',
    'membership.month': '{vc} VENT COINS a month, which is {ngn} NGN.',
    'membership.year': '{vc} VENT COINS a year, which is {ngn} NGN.',

    'market.title': 'Vermillion City',
    'market.description': 'Listings between people on V-ENT.',
    'listing.offers': 'Open to offers',
    'listing.price': '{price} VENT COINS',
    'listing.title': '{title}, {price}',
    'listing.default': '{title}. {price}, from {seller} on Vermillion City.',
    'listing.someSeller': 'a V-ENT seller',
    'seller.title': '{name} on Vermillion City',
    'seller.sales.one': '{name} has completed {count} sale on V-ENT.',
    'seller.sales.other': '{name} has completed {count} sales on V-ENT.',
    'seller.rated': 'Rated {rating} out of 5.',
    'seller.see': 'See what they are selling in Vermillion City.',

    'shortLink.title': 'Short link',
    'shortLink.description': 'Opening a V-ENT link.',

    'roadmap.title': 'What is coming to V-ENT',
    'roadmap.what': 'The modules V-ENT opens next, in order: the shop, Vermillion City (player to player trading), the anime hub, and wagers. What each will do, and how to be told when it opens.',
    'formats.title': 'How each tournament format works',
    'formats.what': 'Single elimination, double elimination, round robin, league, Swiss, GSL, battle royale, stepladder, page playoff, winner stays on, aggregate ties and ladders, each shown as a short moving bracket with three plain sentences.',
    'premium.title': 'V-ENT premium',
    'premium.what': 'What a V-ENT premium subscription switches on for an organiser.',
    'premium.includes': 'Includes {features}.',
    'premium.notOnSale': 'Premium is not on sale yet. Tell us you want it and we will say when it is.',
    'premium.price': '{vc} VENT COINS a month, which is {ngn} NGN.',

    'docs.title': 'V-ENT API and Sign in with V-ENT',
    'docs.description': 'Build on V-ENT: read tournaments, events, teams, players and rankings through the partner API, and let people sign in to your site with their V-ENT account.',
    'docs.studios.title': 'Run V-ENT tournaments inside your game',
    'docs.studios.description': 'For game studios: connect your game once and every V-ENT format runs in it. Link player accounts, open lobbies for matches, post signed results, and receive signed events.',

    'runOfShow.title': '{name}: run of show',
    'runOfShow.days.one': 'The minute by minute running order for {name}: {cues} across {count} day, with the times, who owns each one and how long it runs.',
    'runOfShow.days.other': 'The minute by minute running order for {name}: {cues} across {count} days, with the times, who owns each one and how long it runs.',
    'runOfShow.cues.one': '{count} cue',
    'runOfShow.cues.other': '{count} cues',

    'private.animeList': 'Where you got to in every comic, what you follow, and what you have paid for.',
    'private.animeStudio': 'Upload chapters, decide what they cost, and write to the people reading them.',
  },

  fr: {
    'notFound.page.title': 'Page introuvable',
    'unavailable.description': "Cette page n'a pas pu être chargée pour le moment. Réessayez dans un instant.",

    'notFound.event.title': 'Événement introuvable',
    'notFound.event.description': "Cet événement n'existe pas, ou il n'est plus publié.",
    'moved.event.title': 'Événement déplacé',
    'moved.event.description': 'Cet événement a été renommé.',
    'event.kind.physical': 'Événement en présentiel',
    'event.kind.hybrid': 'Événement en présentiel et en ligne',
    'event.kind.virtual': 'Événement en ligne',
    'event.on': '{kind} le {date}.',
    'event.plain': '{kind}.',
    'event.from': 'Billets à partir de {price} NGN.',
    'event.free': 'Entrée gratuite.',

    'notFound.tournament.title': 'Tournoi introuvable',
    'notFound.tournament.description': "Ce tournoi n'existe pas, ou il n'est plus publié.",
    'moved.tournament.title': 'Tournoi déplacé',
    'moved.tournament.description': 'Ce tournoi a été renommé.',
    'tournament.gameOn': 'Tournoi {game} le {date}.',
    'tournament.game': 'Tournoi {game}.',
    'tournament.on': 'Tournoi le {date}.',
    'tournament.plain': 'Tournoi.',
    'tournament.prize': 'Cagnotte de {prize} VENT COINS.',
    'tournament.entry': 'Inscription à {price} VC.',
    'tournament.free': 'Inscription gratuite.',
    'tournament.places': '{taken} places prises sur {max}.',

    'notFound.organization.title': 'Organisation introuvable',
    'notFound.organization.description': "Cette organisation n'existe pas, ou elle n'est plus publiée.",
    'moved.organization.title': 'Organisation déplacée',
    'moved.organization.description': 'Cette organisation a été renommée.',
    'organization.plain': '{name}, une organisation esport sur V-ENT.',
    'notFound.circuit.title': 'Circuit introuvable',
    'notFound.circuit.description': "Ce circuit n'existe pas, ou il n'est pas publié.",
    'moved.circuit.title': 'Circuit déplacé',
    'moved.circuit.description': 'Ce circuit a été renommé.',
    'circuit.plain': '{name}, un circuit esport sur V-ENT : une saison de tournois classée comme une seule compétition.',
    'circuit.game': 'Jeu : {game}.',
    'circuit.tournaments.one': '{count} tournoi compte.',
    'circuit.tournaments.other': '{count} tournois comptent.',
    'circuit.leader': 'En tête : {name} avec {points} points.',
    'notFound.league.title': 'Ligue introuvable',
    'notFound.league.description': "Cette ligue n'existe pas, ou elle n'est pas publiée.",
    'moved.league.title': 'Ligue déplacée',
    'moved.league.description': 'Cette ligue a été renommée.',
    'league.plain': "{name}, une ligue d'esport sur V-ENT : des divisions de joueurs ou d'équipes, avec montée et descente à la fin de chaque saison.",
    'league.divisions.one': '{count} division.',
    'league.divisions.other': '{count} divisions.',
    'league.moves': 'Les {up} premiers de chaque division montent et les {down} derniers descendent.',
    'organization.tournaments.one': '{count} tournoi organisé.',
    'organization.tournaments.other': '{count} tournois organisés.',

    'notFound.team.title': 'Équipe introuvable',
    'notFound.team.description': "Cette équipe n'existe pas, ou elle n'est plus publiée.",
    'moved.team.title': 'Équipe déplacée',
    'moved.team.description': 'Cette équipe a été renommée.',
    'team.withGame': '{name}, une équipe {game} sur V-ENT.',
    'team.plain': '{name} sur V-ENT.',
    'team.members.one': '{count} membre.',
    'team.members.other': '{count} membres.',
    'team.based': 'Basée à {place}.',

    'notFound.player.title': 'Joueur introuvable',
    'notFound.player.description': "Ce joueur n'existe pas, ou son profil n'est pas public.",
    'player.from': '{name}, de {country}, joue sur V-ENT. Découvrez ses équipes, ses tournois et ses classements.',
    'player.plain': '{name} joue sur V-ENT. Découvrez ses équipes, ses tournois et ses classements.',

    'notFound.battle.title': 'Combat introuvable',
    'notFound.battle.description': "Ce combat n'existe pas.",
    'battle.default': 'Un combat de personnages sur V-ENT.',
    'battle.scored': 'Noté sur la force, la vitesse, l’intelligence, la résistance et la technique.',

    'notFound.comic.title': 'Bande dessinée introuvable',
    'notFound.comic.description': "Cette bande dessinée n'existe pas, ou elle n'est pas publiée.",
    'comic.title': '{title} par {author}',
    'comic.default': 'Une bande dessinée de {author} sur V-ENT.',
    'comic.chapters.one': '{count} chapitre.',
    'comic.chapters.other': '{count} chapitres.',

    'notFound.chapter.title': 'Chapitre introuvable',
    'notFound.chapter.description': "Ce chapitre n'existe pas, ou il n'est pas publié.",
    'chapter.title': '{series}, chapitre {number}',
    'chapter.untitled': 'Chapitre {number}',
    'chapter.of': '{chapter} de {series} sur V-ENT.',
    'chapter.pages.one': '{count} page.',
    'chapter.pages.other': '{count} pages.',

    'room.title': 'Salon de lecture',
    'room.description': 'Un salon où l’on lit la même bande dessinée en même temps.',

    'notFound.stall.title': 'Stand introuvable',
    'notFound.stall.description': "Ce stand n'existe pas, ou il a fermé.",
    'stall.at': '{stall} à {event}',
    'stall.sellsAt': '{stall} vend {items} à {event}. Commandez avant d’arriver et récupérez au stand.',
    'stall.sells': '{stall} vend {items}. Commandez avant d’arriver et récupérez au stand.',
    'stall.plainAt': '{stall} à {event}. Ce qu’il vend et comment commander.',
    'stall.plain': '{stall}. Ce qu’il vend et comment commander.',

    'notFound.membership.title': 'Abonnement introuvable',
    'notFound.membership.description': "Cet abonnement n'existe pas, ou il n'est plus proposé.",
    'membership.title': '{plan}, un abonnement de {seller}',
    'membership.default': 'Un abonnement de {seller} sur V-ENT.',
    'membership.free': 'Adhésion gratuite.',
    'membership.month': '{vc} VENT COINS par mois, soit {ngn} NGN.',
    'membership.year': '{vc} VENT COINS par an, soit {ngn} NGN.',

    'market.title': 'Vermillion City',
    'market.description': 'Des annonces entre membres de V-ENT.',
    'listing.offers': 'Ouvert aux offres',
    'listing.price': '{price} VENT COINS',
    'listing.title': '{title}, {price}',
    'listing.default': '{title}. {price}, proposé par {seller} sur Vermillion City.',
    'listing.someSeller': 'un vendeur V-ENT',
    'seller.title': '{name} sur Vermillion City',
    'seller.sales.one': '{name} a réalisé {count} vente sur V-ENT.',
    'seller.sales.other': '{name} a réalisé {count} ventes sur V-ENT.',
    'seller.rated': 'Noté {rating} sur 5.',
    'seller.see': 'Découvrez ses annonces sur Vermillion City.',

    'shortLink.title': 'Lien court',
    'shortLink.description': 'Ouverture d’un lien V-ENT.',

    'roadmap.title': 'Ce qui arrive sur V-ENT',
    'roadmap.what': 'Les modules que V-ENT ouvre ensuite, dans l’ordre : la boutique, Vermillion City (échanges entre joueurs), l’espace anime et les paris. Ce que chacun fera, et comment être prévenu de son ouverture.',
    'formats.title': 'Comment fonctionne chaque format de tournoi',
    'formats.what': 'Élimination directe, double élimination, toutes rondes, ligue, système suisse, GSL, battle royale, échelle à paliers, playoffs système Page, le gagnant reste, confrontations au cumul et échelles, chacun montré par un court tableau animé et trois phrases simples.',
    'premium.title': 'V-ENT premium',
    'premium.what': 'Ce qu’un abonnement V-ENT premium active pour un organisateur.',
    'premium.includes': 'Comprend {features}.',
    'premium.notOnSale': 'Premium n’est pas encore en vente. Dites-nous que vous le voulez et nous vous préviendrons.',
    'premium.price': '{vc} VENT COINS par mois, soit {ngn} NGN.',

    'docs.title': 'API V-ENT et connexion avec V-ENT',
    'docs.description': 'Construisez sur V-ENT : lisez les tournois, événements, équipes, joueurs et classements via l’API partenaire, et laissez les gens se connecter à votre site avec leur compte V-ENT.',
    'docs.studios.title': 'Faites tourner les tournois V-ENT dans votre jeu',
    'docs.studios.description': 'Pour les studios de jeux : reliez votre jeu une fois et chaque format V-ENT y fonctionne. Liez les comptes des joueurs, ouvrez des salons pour les matchs, envoyez des résultats signés et recevez des événements signés.',

    'runOfShow.title': '{name} : conducteur',
    'runOfShow.days.one': 'Le déroulé minute par minute de {name} : {cues} sur {count} jour, avec les horaires, qui s’occupe de chaque moment et sa durée.',
    'runOfShow.days.other': 'Le déroulé minute par minute de {name} : {cues} sur {count} jours, avec les horaires, qui s’occupe de chaque moment et sa durée.',
    'runOfShow.cues.one': '{count} moment',
    'runOfShow.cues.other': '{count} moments',

    'private.animeList': 'Où vous en êtes dans chaque bande dessinée, ce que vous suivez et ce que vous avez payé.',
    'private.animeStudio': 'Publiez des chapitres, fixez leur prix et écrivez à vos lecteurs.',
  },

  pt: {
    'notFound.page.title': 'Página não encontrada',
    'unavailable.description': 'Não foi possível carregar esta página agora. Tente de novo dentro de momentos.',

    'notFound.event.title': 'Evento não encontrado',
    'notFound.event.description': 'Este evento não existe, ou já não está publicado.',
    'moved.event.title': 'Evento mudou de endereço',
    'moved.event.description': 'Este evento mudou de nome.',
    'event.kind.physical': 'Evento presencial',
    'event.kind.hybrid': 'Evento presencial e online',
    'event.kind.virtual': 'Evento online',
    'event.on': '{kind} a {date}.',
    'event.plain': '{kind}.',
    'event.from': 'Bilhetes a partir de {price} NGN.',
    'event.free': 'Entrada gratuita.',

    'notFound.tournament.title': 'Torneio não encontrado',
    'notFound.tournament.description': 'Este torneio não existe, ou já não está publicado.',
    'moved.tournament.title': 'Torneio mudou de endereço',
    'moved.tournament.description': 'Este torneio mudou de nome.',
    'tournament.gameOn': 'Torneio de {game} a {date}.',
    'tournament.game': 'Torneio de {game}.',
    'tournament.on': 'Torneio a {date}.',
    'tournament.plain': 'Torneio.',
    'tournament.prize': 'Prémio total de {prize} VENT COINS.',
    'tournament.entry': 'Inscrição de {price} VC.',
    'tournament.free': 'Inscrição gratuita.',
    'tournament.places': '{taken} de {max} lugares ocupados.',

    'notFound.organization.title': 'Organização não encontrada',
    'notFound.organization.description': 'Esta organização não existe, ou já não está publicada.',
    'moved.organization.title': 'Organização mudou de endereço',
    'moved.organization.description': 'Esta organização mudou de nome.',
    'organization.plain': '{name}, uma organização de esports na V-ENT.',
    'notFound.circuit.title': 'Circuito não encontrado',
    'notFound.circuit.description': 'Este circuito não existe, ou não está publicado.',
    'moved.circuit.title': 'Circuito mudou de endereço',
    'moved.circuit.description': 'Este circuito mudou de nome.',
    'circuit.plain': '{name}, um circuito de esports na V-ENT: uma temporada de torneios classificada como uma só competição.',
    'circuit.game': 'Jogo: {game}.',
    'circuit.tournaments.one': '{count} torneio conta.',
    'circuit.tournaments.other': '{count} torneios contam.',
    'circuit.leader': 'Na liderança: {name} com {points} pontos.',
    'notFound.league.title': 'Liga não encontrada',
    'notFound.league.description': 'Esta liga não existe, ou não está publicada.',
    'moved.league.title': 'Liga mudou de endereço',
    'moved.league.description': 'Esta liga mudou de nome.',
    'league.plain': '{name}, uma liga de esports na V-ENT: divisões de jogadores ou equipas, com subida e descida no fim de cada época.',
    'league.divisions.one': '{count} divisão.',
    'league.divisions.other': '{count} divisões.',
    'league.moves': 'Os {up} primeiros de cada divisão sobem e os {down} últimos descem.',
    'organization.tournaments.one': '{count} torneio organizado.',
    'organization.tournaments.other': '{count} torneios organizados.',

    'notFound.team.title': 'Equipa não encontrada',
    'notFound.team.description': 'Esta equipa não existe, ou já não está publicada.',
    'moved.team.title': 'Equipa mudou de endereço',
    'moved.team.description': 'Esta equipa mudou de nome.',
    'team.withGame': '{name}, uma equipa de {game} na V-ENT.',
    'team.plain': '{name} na V-ENT.',
    'team.members.one': '{count} membro.',
    'team.members.other': '{count} membros.',
    'team.based': 'Sediada em {place}.',

    'notFound.player.title': 'Jogador não encontrado',
    'notFound.player.description': 'Este jogador não existe, ou o perfil não é público.',
    'player.from': '{name}, de {country}, joga na V-ENT. Veja as equipas, os torneios em que participou e as classificações.',
    'player.plain': '{name} joga na V-ENT. Veja as equipas, os torneios em que participou e as classificações.',

    'notFound.battle.title': 'Batalha não encontrada',
    'notFound.battle.description': 'Esta batalha não existe.',
    'battle.default': 'Uma batalha de personagens na V-ENT.',
    'battle.scored': 'Avaliada em força, velocidade, inteligência, resistência e técnica.',

    'notFound.comic.title': 'Banda desenhada não encontrada',
    'notFound.comic.description': 'Esta banda desenhada não existe, ou não está publicada.',
    'comic.title': '{title}, de {author}',
    'comic.default': 'Uma banda desenhada de {author} na V-ENT.',
    'comic.chapters.one': '{count} capítulo.',
    'comic.chapters.other': '{count} capítulos.',

    'notFound.chapter.title': 'Capítulo não encontrado',
    'notFound.chapter.description': 'Este capítulo não existe, ou não está publicado.',
    'chapter.title': '{series}, capítulo {number}',
    'chapter.untitled': 'Capítulo {number}',
    'chapter.of': '{chapter} de {series} na V-ENT.',
    'chapter.pages.one': '{count} página.',
    'chapter.pages.other': '{count} páginas.',

    'room.title': 'Sala de leitura',
    'room.description': 'Uma sala onde as pessoas leem a mesma banda desenhada ao mesmo tempo.',

    'notFound.stall.title': 'Banca não encontrada',
    'notFound.stall.description': 'Esta banca não existe, ou já fechou.',
    'stall.at': '{stall} em {event}',
    'stall.sellsAt': '{stall} vende {items} em {event}. Encomende antes de chegar e levante na banca.',
    'stall.sells': '{stall} vende {items}. Encomende antes de chegar e levante na banca.',
    'stall.plainAt': '{stall} em {event}. O que vende e como encomendar.',
    'stall.plain': '{stall}. O que vende e como encomendar.',

    'notFound.membership.title': 'Subscrição não encontrada',
    'notFound.membership.description': 'Esta subscrição não existe, ou já não é oferecida.',
    'membership.title': '{plan}, uma subscrição de {seller}',
    'membership.default': 'Uma subscrição de {seller} na V-ENT.',
    'membership.free': 'Adesão gratuita.',
    'membership.month': '{vc} VENT COINS por mês, ou seja, {ngn} NGN.',
    'membership.year': '{vc} VENT COINS por ano, ou seja, {ngn} NGN.',

    'market.title': 'Vermillion City',
    'market.description': 'Anúncios entre pessoas na V-ENT.',
    'listing.offers': 'Aberto a propostas',
    'listing.price': '{price} VENT COINS',
    'listing.title': '{title}, {price}',
    'listing.default': '{title}. {price}, de {seller} em Vermillion City.',
    'listing.someSeller': 'um vendedor da V-ENT',
    'seller.title': '{name} em Vermillion City',
    'seller.sales.one': '{name} concluiu {count} venda na V-ENT.',
    'seller.sales.other': '{name} concluiu {count} vendas na V-ENT.',
    'seller.rated': 'Avaliação de {rating} em 5.',
    'seller.see': 'Veja o que está a vender em Vermillion City.',

    'shortLink.title': 'Ligação curta',
    'shortLink.description': 'A abrir uma ligação da V-ENT.',

    'roadmap.title': 'O que vem aí na V-ENT',
    'roadmap.what': 'Os módulos que a V-ENT abre a seguir, por ordem: a loja, Vermillion City (compra e venda entre jogadores), o espaço anime e as apostas. O que cada um fará, e como ser avisado quando abrir.',
    'formats.title': 'Como funciona cada formato de torneio',
    'formats.what': 'Eliminação simples, dupla eliminação, todos contra todos, liga, sistema suíço, GSL, battle royale, escada por patamares, playoffs sistema Page, quem ganha fica, eliminatórias por agregado e escadas, cada um mostrado num pequeno quadro animado com três frases simples.',
    'premium.title': 'V-ENT premium',
    'premium.what': 'O que uma subscrição V-ENT premium ativa para um organizador.',
    'premium.includes': 'Inclui {features}.',
    'premium.notOnSale': 'O premium ainda não está à venda. Diga-nos que o quer e avisamos quando estiver.',
    'premium.price': '{vc} VENT COINS por mês, ou seja, {ngn} NGN.',

    'docs.title': 'API da V-ENT e Entrar com a V-ENT',
    'docs.description': 'Construa sobre a V-ENT: leia torneios, eventos, equipas, jogadores e classificações através da API de parceiros, e deixe as pessoas entrarem no seu site com a conta V-ENT.',
    'docs.studios.title': 'Realize torneios V-ENT dentro do seu jogo',
    'docs.studios.description': 'Para estúdios de jogos: ligue o seu jogo uma vez e todos os formatos V-ENT funcionam nele. Associe as contas dos jogadores, abra salas para as partidas, envie resultados assinados e receba eventos assinados.',

    'runOfShow.title': '{name}: alinhamento',
    'runOfShow.days.one': 'O alinhamento minuto a minuto de {name}: {cues} em {count} dia, com as horas, quem trata de cada momento e quanto dura.',
    'runOfShow.days.other': 'O alinhamento minuto a minuto de {name}: {cues} em {count} dias, com as horas, quem trata de cada momento e quanto dura.',
    'runOfShow.cues.one': '{count} momento',
    'runOfShow.cues.other': '{count} momentos',

    'private.animeList': 'Onde ficou em cada banda desenhada, o que segue e o que já pagou.',
    'private.animeStudio': 'Publique capítulos, decida quanto custam e escreva a quem os lê.',
  },
};

const fill = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

export function recordCopy(locale = 'en') {
  const code = COPY[locale] ? locale : 'en';
  const table = COPY[code];
  const tag = TAGS[code];
  const plurals = new Intl.PluralRules(tag);
  const t = (key, vars) => fill(table[key] ?? COPY.en[key] ?? key, vars);
  const n = (key, count, vars = {}) => {
    const form = plurals.select(Number(count) || 0) === 'one' ? 'one' : 'other';
    return t(`${key}.${form}`, { ...vars, count: num(count) });
  };
  const num = (value) => new Intl.NumberFormat(tag).format(Number(value) || 0);
  // datetime-allow: metadata is built on the server; the zone is the venue's
  // (the record's own, Lagos when it has none), stated in words, never the
  // server's.
  const date = (value, zone = 'Africa/Lagos') => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat(tag, {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: zone || 'Africa/Lagos',
    }).format(d);
  };
  return { t, n, num, date, locale: code };
}

export const RECORD_COPY_KEYS = Object.keys(COPY.en);
export { COPY as RECORD_COPY };
