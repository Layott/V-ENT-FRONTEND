import { getT } from '@/i18n/server';
// Route-level skeleton for /home. Renders instantly on navigation (Server
// Component) while the dashboard's client data fetch runs. Mirrors the real
// layout - header gutter, sidebar gutter on desktop, hero + stat grid + two
// section rows - so there is no jarring shift when the page hydrates.

export default function HomeLoading() {
  const t = getT();
  return (
    <>
      <style>{`
        
        .homeSkelPage {
          width: 100%;
          min-height: 100vh;
          background-color: #131316;
        }
        .homeSkelPane {
          width: 100%;
          margin-top: 60px;
          padding: 1rem;
          padding-bottom: 5.5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .homeSkel {
          position: relative;
          overflow: hidden;
          background-color: #1c1d20;
          border-radius: 10px;
        }
        .homeSkelHero { height: 132px; border-radius: 12px; }
        .homeSkelStatGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        .homeSkelStat { min-height: 130px; }
        .homeSkelSection {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .homeSkelHeadRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .homeSkelTitle { width: 190px; height: 24px; border-radius: 6px; }
        .homeSkelLink { width: 74px; height: 18px; border-radius: 6px; }
        .homeSkelCardGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        .homeSkelCard { min-height: 210px; }

        @media only screen and (min-width: 600px) {
          .homeSkelStatGrid { grid-template-columns: repeat(2, 1fr); }
        }
        @media only screen and (min-width: 768px) {
          .homeSkelPane {
            width: calc(100% - 180px);
            margin-left: 180px;
            padding: 2rem 1.5rem;
            padding-bottom: 2rem;
          }
          .homeSkelCardGrid { grid-template-columns: repeat(2, 1fr); }
        }
        @media only screen and (min-width: 1024px) {
          .homeSkelPane {
            width: calc(100% - 250px);
            margin-left: 250px;
            padding: 2rem;
            padding-bottom: 2rem;
          }
          .homeSkelStatGrid { grid-template-columns: repeat(4, 1fr); }
          .homeSkelCardGrid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      <div className="homeSkelPage" aria-busy="true" aria-label={t('loading.dashboard', 'Loading dashboard')}>
        <div className="homeSkelPane">
          <div className="homeSkel homeSkelHero" />

          <div className="homeSkelStatGrid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="homeSkel homeSkelStat" />
            ))}
          </div>

          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s} className="homeSkelSection">
              <div className="homeSkelHeadRow">
                <div className="homeSkel homeSkelTitle" />
                <div className="homeSkel homeSkelLink" />
              </div>
              <div className="homeSkelCardGrid">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="homeSkel homeSkelCard" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
