const breadCrumbTitles = {
    "/user-profile": { title: "My Profile", showBackArrow: false },
    "/tournaments": { title: "Tournaments", showBackArrow: false },
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
    "/anime": { title: "Anime", showBackArrow: false },
    "/rankings": { title: "Rankings", showBackArrow: false },
    "/teams": { title: "Teams", showBackArrow: false },
    "/teams/team-profile": { 
        title: "Team Profile", 
        showBackArrow: true,
        fallbackURL: '/teams'
    },
    "/wallets": { title: "Wallets", showBackArrow: false },
    "/settings": { title: "Settings", showBackArrow: false },
}

export default breadCrumbTitles;