const breadCrumbTitles = {
    "/home": { title: "Home", showBackArrow: false },
    "/user-profile": { title: "My Profile", showBackArrow: false },
    "/edit-user-profile": { 
        title: "Edit My Profile", 
        showBackArrow: true,
        fallbackURL: '/user-profile'
    },
    "/tournaments": { title: "Tournaments", showBackArrow: false },
    "/tournaments/drafts": { 
        title: "My Drafts", 
        showBackArrow: true,
        fallbackURL: '/tournaments'
    },
    "/tournaments/create-tournament": { 
        title: "Create Tournament", 
        showBackArrow: true,
        fallbackURL: '/tournaments'
    },
    "/tournaments/view-tournament": { 
        title: "View Tournament", 
        showBackArrow: true,
        fallbackURL: '/tournaments'
    },
    "/tournaments/register-tournament": { 
        title: "Register Tournament", 
        showBackArrow: true,
        fallbackURL: '/tournaments'
    },
    "/events": { title: "Events", showBackArrow: false },
    "/events/create-event": { 
        title: "Create Event", 
        showBackArrow: true,
        fallbackURL: '/events'
    },
    "/events/view-event": { 
        title: "View Event", 
        showBackArrow: true,
        fallbackURL: '/events'
    },
    "/events/register-event": { 
        title: "Register Event", 
        showBackArrow: true,
        fallbackURL: '/events'
    },
    "/anime": { title: "Anime", showBackArrow: false },
    "/rankings": { title: "Rankings", showBackArrow: false },
    "/teams": { title: "Teams", showBackArrow: false },
    "/teams/team-profile": { 
        title: "Team Profile", 
        showBackArrow: true,
        fallbackURL: '/teams'
    },
    "/edit-team-profile": { 
        title: "Edit Team Profile", 
        showBackArrow: true,
        fallbackURL: '/team-profile'
    },
    "/wallets": { title: "Wallet", showBackArrow: false },
    "/wallets/topup": {
        title: "Top Up Wallet",
        showBackArrow: true,
        fallbackURL: '/wallets'
    },
    "/wallets/send": {
        title: "Send VENT COINS",
        showBackArrow: true,
        fallbackURL: '/wallets'
    },
    "/wallets/withdraw": {
        title: "Withdraw to Bank",
        showBackArrow: true,
        fallbackURL: '/wallets'
    },
    "/wallets/history": {
        title: "Transaction History",
        showBackArrow: true,
        fallbackURL: '/wallets'
    },
    "/production": { title: "Production", showBackArrow: false },
    "/settings": { title: "Settings", showBackArrow: false },
    "/notifications": { title: "Notifications", showBackArrow: false },
    "/disputes": { title: "My Disputes", showBackArrow: false },
    "/organizations": { title: "Organizations", showBackArrow: false },
    "/organizations/org-profile": {
        title: "Organization Profile",
        showBackArrow: true,
        fallbackURL: '/organizations'
    },
    "/organizations/create": {
        title: "Create Organization",
        showBackArrow: true,
        fallbackURL: '/organizations'
    },
    "/search": { title: "Search", showBackArrow: false },
}

export default breadCrumbTitles;