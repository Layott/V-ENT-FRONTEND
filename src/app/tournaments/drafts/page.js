'use client'

// import Header from '@/components/header/Header';
// import MobileHeader from '@/components/mobile-header/MobileHeader';
// import Sidebar from '@/components/sidebar/Sidebar';
// import BottomMenu from '@/components/bottom-menu/BottomMenu';
// import CreateTournamentComponent from '@/components/create-tournament-component/CreateTournamentComponent';
// import styles from './drafts.module.css';

// const Drafts = () => {
//   return (
//     <div className={styles.pageContainer}>
//         <Header />
//         <MobileHeader />

//         <main className={styles.mainContainer}>
//           <Sidebar />
//           <CreateTournamentComponent />

//         </main>
        
//         <BottomMenu />

//     </div>
//   )
// }

// export default Drafts


// 'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './drafts.module.css'; // Make sure your CSS supports card-style layout

const Drafts = () => {
  const { data: session } = useSession();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchDrafts = async () => {
  //     try {
  //       const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/view-user-drafted-tournaments/`, {
  //         headers: {
  //           'Authorization': `Bearer ${session?.user?.sessionToken}`,
  //         },
  //       });

  //       const data = await response.json();
  //       setDrafts(data || []);
  //     } catch (error) {
  //       console.error('Error fetching drafts:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   if (session?.user?.sessionToken) {
  //     fetchDrafts();
  //   }
  // }, [session?.user?.sessionToken]);

  useEffect(() => {
  const fetchDrafts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/view-user-drafted-tournaments/`, {
        headers: {
          'Authorization': `Bearer ${session?.user?.sessionToken}`,
        },
      });

      const data = await response.json();
      console.log("Raw draft response:", data);
      console.log("Drafts mapped over:", drafts);


      const extractedDrafts = Array.isArray(data) ? data : data?.data || [];
      setDrafts(extractedDrafts);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (session?.user?.sessionToken) {
    fetchDrafts();
  }
}, [session?.user?.sessionToken]);


  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <section className={styles.draftsSection}>
          <h2 className={styles.pageTitle}>Your Saved Drafts</h2>

          {loading ? (
            <p className={styles.loadingText}>Loading your drafts...</p>
          ) : drafts.length === 0 ? (
            <p className={styles.emptyText}>No drafts found.</p>
          ) : (
            <div className={styles.draftList}>
              {drafts.map((draft) => (
                <div key={draft.id} className={styles.draftCard}>
                  <h3 className={styles.draftTitle}>
                    {draft.tournament_title || 'Untitled Draft'}
                  </h3>
                  <p className={styles.draftGame}>Game: {draft.game}</p>
                  <p className={styles.draftStatus}>Status: Draft</p>
                  <Link href={`/edit-draft/${draft.id}`}>
                    <button className={styles.editButton}>Resume Editing</button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomMenu />
    </div>
  );
};

export default Drafts;
