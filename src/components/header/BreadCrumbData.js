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
    "/settings": { title: "Settings", showBackArrow: false },
}

export default breadCrumbTitles;