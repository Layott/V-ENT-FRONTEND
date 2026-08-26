import { getT } from '@/i18n/server';

// Route-level skeleton for /tournaments. Pure inline Server Component - imports
// NOTHING (no shell components: the surrounding layout already renders
// Header/Sidebar/BottomMenu, so importing them here would double the shell and
// pull client-hook components into a Server Component). Mirrors the listing's
// content pane (featured row + tab bar + filter bar + card grid) so there's no
// layout shift once the real data lands.

export default function TournamentsLoading() {
  const t = getT();
  return (
    <>
      <style>{`
        
        .tmtSkelPage { width: 100%; min-height: 100vh; background-color: #131316; }
        .tmtSkelPane {
          width: 100%;
          margin-top: 60px;
          padding: 1rem;
          padding-bottom: 5.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .tmtSkel {
          position: relative;
          overflow: hidden;
          background-color: #1c1d20;
          border-radius: 10px;
        }
        .tmtSkelTitle { width: 220px; height: 30px; border-radius: 6px; }
        .tmtSkelSub { width: 300px; height: 16px; border-radius: 6px; margin-top: 10px; }
        .tmtSkelFeatured { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .tmtSkelFeaturedCard { height: 180px; border-radius: 12px; }
        .tmtSkelTabBar { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .tmtSkelTab { width: 92px; height: 36px; border-radius: 999px; }
        .tmtSkelFilterBar { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .tmtSkelFilter { width: 150px; height: 42px; border-radius: 8px; }
        .tmtSkelGrid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .tmtSkelCard { min-height: 300px; border-radius: 12px; }

        @media only screen and (min-width: 600px) {
          .tmtSkelFeatured { grid-template-columns: repeat(2, 1fr); }
          .tmtSkelGrid { grid-template-columns: repeat(2, 1fr); }
        }
        @media only screen and (min-width: 768px) {
          .tmtSkelPane {
            width: calc(100% - 180px);
            margin-left: 180px;
            padding: 2rem 1.5rem;
            padding-bottom: 2rem;
          }
        }
        @media only screen and (min-width: 1024px) {
          .tmtSkelPane {
            width: calc(100% - 250px);
            margin-left: 250px;
            padding: 2rem;
            padding-bottom: 2rem;
          }
          .tmtSkelFeatured { grid-template-columns: repeat(3, 1fr); }
          .tmtSkelGrid { grid-template-columns: repeat(3, 1fr); }
        }
        @media only screen and (min-width: 1440px) {
          .tmtSkelGrid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (prefers-reduced-motion: reduce) {
        }
      `}</style>

      <div className="tmtSkelPage" aria-busy="true" aria-label={t('loading.tournaments', 'Loading tournaments')}>
        <div className="tmtSkelPane">
          <div>
            <div className="tmtSkel tmtSkelTitle" />
            <div className="tmtSkel tmtSkelSub" />
          </div>

          <div className="tmtSkelFeatured">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="tmtSkel tmtSkelFeaturedCard" />
            ))}
          </div>

          <div className="tmtSkelTabBar">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="tmtSkel tmtSkelTab" />
            ))}
          </div>

          <div className="tmtSkelFilterBar">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="tmtSkel tmtSkelFilter" />
            ))}
          </div>

          <div className="tmtSkelGrid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="tmtSkel tmtSkelCard" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
