const breadCrumbTitles = {
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
    "/wallets": { title: "Wallets", showBackArrow: false },
    "/settings": { title: "Settings", showBackArrow: false },
}

export default breadCrumbTitles;