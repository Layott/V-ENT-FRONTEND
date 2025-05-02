// Mock function to Fetch Interests Based on Search Query
const allInterests = [
    "Battle Royale", "God of War", "Uncharted", "Sonic", "Tekken", "Manga", "Anime", "PUBG", 
    "Sniper", "Casual", "Call of Duty", "Fortnite", "Assassin's Creed", "RPG", "eSports", 
    "FIFA", "Apex Legends", "Zelda", "Street Fighter", "Dota 2", "Minecraft", "Overwatch", 
    "Valorant", "Racing Games", "Final Fantasy", "Horror Games", "Cyberpunk 2077", 
    "League of Legends", "MMORPG", "Sports Games", "The Witcher", "Action Games", 
    "Star Wars Games", "Strategy Games", "Adventure Games", "Platformers", "Beat 'em Up", 
    "Indie Games", "Simulation Games", "Mobile Games", "Sandbox Games", "Diablo Series", 
    "Retro Games", "Metroidvania", "Rogue-like Games", "Survival Games", "Multiplayer Games", 
    "Rhythm Games", "Puzzle Games", "Fighting Games", "Guitar Hero", 
    "Dragon Ball Z", "Elder Scrolls", "Battlefield", "Counter-Strike", "Halo", 
    "Metal Gear Solid", "Silent Hill", "Dark Souls", "Bloodborne", "Fortnite", "Red Dead Redemption", 
    "Hades", "Spelunky", "Fallout", "Destiny", "Kingdom Hearts", "Borderlands", "Far Cry", 
    "Genshin Impact", "Tom Clancy's Rainbow Six", "Splinter Cell", "Monster Hunter", 
    "Left 4 Dead", "Tomb Raider", "Ghost of Tsushima", "Dishonored", "Forza Horizon", 
    "Gran Turismo", "Yakuza", "No Man's Sky", "Sea of Thieves", "Persona", 
    "Resident Evil", "StarCraft", "Warcraft", "Team Fortress", "War Thunder", 
    "XCOM", "Age of Empires", "Command & Conquer", "The Sims", "Stardew Valley", 
    "Kerbal Space Program", "Sid Meier's Civilization", "Cities: Skylines", "Escape from Tarkov", 
    "Among Us", "Phasmophobia", "Rust", "Terraria", "ARK: Survival Evolved"
    ];

    const fetchInterests = (query) => {
        return allInterests.filter(interest => 
            interest.toLowerCase().includes(query.toLowerCase())
        );
    };
