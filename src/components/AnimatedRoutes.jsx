import React from 'react';
import { useLocation, Routes } from 'react-router-dom';
import './PageTransition.css';

/**
 * AnimatedRoutes
 *
 * Wraps the standard <Routes> with a div whose `key` changes on every
 * navigation. React sees a new key → unmounts + remounts the div →
 * the CSS animation fires naturally on entry.
 *
 * The <Routes> and every <Route> inside are passed through completely
 * unchanged as children — zero modifications to any page or route file.
 *
 * Usage in App.jsx:
 *   <AnimatedRoutes>
 *     <Route path="/" element={<LandingPage />} />
 *     ...
 *   </AnimatedRoutes>
 *
 * AnimatedRoutes renders its own internal <Routes> wrapper so the children
 * (which are <Route> elements) are valid React Router route definitions.
 */
const AnimatedRoutes = ({ children }) => {
    const location = useLocation();

    return (
        <div key={location.pathname} className="page-transition">
            <Routes location={location}>
                {children}
            </Routes>
        </div>
    );
};

export default AnimatedRoutes;
