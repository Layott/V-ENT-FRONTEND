'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import DraftCard from '@/components/drafts/DraftCard';
import styles from './drafts.module.css'; 

const Drafts = () => {
  const { data: session } = useSession();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

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
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onDelete={(id) => setDrafts(prev => prev.filter(d => d.id !== id))}
                />
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
